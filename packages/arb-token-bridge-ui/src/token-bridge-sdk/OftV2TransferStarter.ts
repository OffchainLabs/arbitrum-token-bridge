import { Config, simulateContract, writeContract } from '@wagmi/core'
import { Address } from 'viem'
import { BigNumber, constants, Contract, ethers, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  BridgeTransferStarter,
  TransferEstimateGasProps,
  TransferProps,
  TransferType,
  ApproveTokenProps,
  RequiresTokenApprovalProps,
  BridgeTransferStarterProps
} from './BridgeTransferStarter'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner, getChainIdFromProvider } from './utils'
import {
  getOftV2TransferConfig,
  buildSendParams,
  getOftV2Quote
} from './oftUtils'
import { oftV2Abi } from './oftV2Abi'
import { isNetwork } from '../util/networks'
import { isDepositMode as isDepositModeUtil } from '../util/isDepositMode'

async function prepareTransferConfig({
  signer,
  oftContract,
  destLzEndpointId,
  amount,
  destinationAddress,
  sourceChainId,
  wagmiConfig
}: {
  signer: Signer
  oftContract: Contract
  destLzEndpointId: number
  amount: BigNumber
  destinationAddress?: string
  sourceChainId: number
  wagmiConfig: Config
}) {
  const address = await getAddressFromSigner(signer)

  const sendParams = buildSendParams({
    dstEid: destLzEndpointId,
    address,
    amount,
    destinationAddress
  })
  const quoteFee = await getOftV2Quote({
    sendParams,
    address: oftContract.address as Address,
    chainId: sourceChainId
  })

  return simulateContract(wagmiConfig, {
    address: oftContract.address as Address,
    abi: oftV2Abi,
    signer,
    functionName: 'send',
    args: [sendParams, quoteFee, address as Address],
    overrides: {
      value: quoteFee.nativeFee
    }
  })
}

export class OftV2TransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'oftV2'
  private isOftTransferValidated?: boolean
  private oftAdapterAddress?: string
  private oftAdapterContract?: ethers.Contract
  private destLzEndpointId?: number
  private isSourceChainEthereum?: boolean

  constructor(props: BridgeTransferStarterProps) {
    super(props)
    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }
  }

  private async validateOftTransfer() {
    if (typeof this.isOftTransferValidated !== 'undefined') {
      if (!this.isOftTransferValidated) {
        throw Error('OFT transfer validation failed')
      }
      return
    }

    if (!this.sourceChainErc20Address) {
      this.isOftTransferValidated = false
      throw Error('OFT token address not found')
    }

    const [sourceChainId, destinationChainId] = await Promise.all([
      this.sourceChainProvider.getNetwork().then(n => n.chainId),
      this.destinationChainProvider.getNetwork().then(n => n.chainId)
    ])

    const oftTransferConfig = getOftV2TransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address: this.sourceChainErc20Address
    })

    if (!oftTransferConfig.isValid) {
      this.isOftTransferValidated = false
      throw Error('OFT transfer validation failed')
    }

    this.isSourceChainEthereum = !!isNetwork(sourceChainId).isEthereumMainnet
    this.isOftTransferValidated = true
    this.oftAdapterAddress = oftTransferConfig.sourceChainAdapterAddress
    this.destLzEndpointId = oftTransferConfig.destinationChainLzEndpointId
  }

  private getOftAdapterContractAddress(): string {
    if (!this.isOftTransferValidated) {
      throw Error('OFT transfer validation failed')
    }
    return this.oftAdapterAddress!
  }

  private getOftAdapterContract(
    providerOrSigner: Signer | Provider
  ): ethers.Contract {
    if (!this.isOftTransferValidated) {
      throw Error('OFT transfer validation failed')
    }

    if (this.oftAdapterContract) {
      return this.oftAdapterContract
    }

    const oftAdapterContract = new ethers.Contract(
      this.getOftAdapterContractAddress(),
      oftV2Abi,
      providerOrSigner
    )
    this.oftAdapterContract = oftAdapterContract
    return oftAdapterContract
  }

  public async requiresNativeCurrencyApproval() {
    return false
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public async approveNativeCurrency() {
    // no-op
  }

  public async requiresTokenApproval({
    amount,
    signer
  }: RequiresTokenApprovalProps): Promise<boolean> {
    await this.validateOftTransfer()

    // only Eth adapter will need token approval
    if (!this.isSourceChainEthereum) return false

    const address = await getAddressFromSigner(signer)
    const spender = this.getOftAdapterContractAddress()

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address!,
      provider: this.sourceChainProvider,
      owner: address,
      spender
    })

    return allowance.lt(amount)
  }

  public async approveTokenEstimateGas({ signer }: ApproveTokenProps) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      this.oftAdapterAddress!,
      constants.MaxUint256, // Eth USDT will need MAX approval since that cannot be changed afterwards
      { from: address }
    )
  }

  public async approveToken({ signer }: ApproveTokenProps) {
    await this.validateOftTransfer()
    const spender = this.getOftAdapterContractAddress()
    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      signer
    )

    return contract.functions.approve(spender, constants.MaxUint256) // Eth USDT will need MAX approval since that cannot be changed afterwards
  }

  public async transferEstimateGas({
    amount,
    signer,
    destinationAddress
  }: TransferEstimateGasProps) {
    await this.validateOftTransfer()

    const oftContract = this.getOftAdapterContract(signer)

    const isDepositMode = isDepositModeUtil({
      sourceChainId: await getChainIdFromProvider(this.sourceChainProvider),
      destinationChainId: await getChainIdFromProvider(
        this.destinationChainProvider
      )
    })

    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: await signer.getAddress(),
      spender: oftContract.address
    })
    if (allowance.lt(amount)) {
      /**
       * Default to hardcoded values based on sample of transactions:
       *
       * Arb1:
       * https://arbiscan.io/tx/0xced6a1a14d42678f35c689756063021e27799e00a671522d09207d582184180c
       * https://arbiscan.io/tx/0xb4bc8435131ffc489cd60060cd1eabdcb866cf38ffe9f1a09a818d515691d087
       * https://arbiscan.io/tx/0x8ca579c757c36a66c5080524f215888b37e28d5ac00ed57ccd2248d6652eb72e
       *
       * Mainnet:
       * https://etherscan.io/tx/0xbd2f476acb0d78817a8222da1fdcd3409aeb82b72b8e393780e1867c4bf5d010
       * https://etherscan.io/tx/0xd8093e91850c50517b808510c30918cc79e32768c561d5f3dbfdb1398cd954ce
       * https://etherscan.io/tx/0x3836f1f76333853e69ed975f412afdb7337cb3c4ced636bcdb8dfebc720b75a4
       * https://etherscan.io/tx/0xe1d717d5063bf55742af9aef7a5600dcd8c0bd2553deca25e52e7bb2a48e65b6
       *
       * We add a buffer of 30% to be safe
       */
      const gasEstimate = isDepositMode
        ? BigNumber.from(600_000 * 1.3)
        : BigNumber.from(360_000 * 1.3)
      return {
        estimatedParentChainGas: isDepositMode ? gasEstimate : constants.Zero,
        estimatedChildChainGas: isDepositMode ? constants.Zero : gasEstimate
      }
    }

    const { request } = await prepareTransferConfig({
      signer,
      oftContract,
      amount,
      destLzEndpointId: this.destLzEndpointId!,
      destinationAddress,
      sourceChainId: await getChainIdFromProvider(this.sourceChainProvider)
    })
    const gasEstimate = await signer.estimateGas(request)

    return {
      estimatedParentChainGas: isDepositMode ? gasEstimate : constants.Zero,
      estimatedChildChainGas: isDepositMode ? constants.Zero : gasEstimate
    }
  }

  public async transferEstimateFee({
    amount,
    signer,
    destinationAddress
  }: TransferEstimateGasProps) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getOftAdapterContract(signer)

    const sendParams = buildSendParams({
      dstEid: this.destLzEndpointId!,
      address,
      amount,
      destinationAddress
    })

    // the amount in native currency that needs to be paid at the source chain to cover for both source and destination message transfers
    const { nativeFee } = await getOftV2Quote({
      address: oftContract.address as Address,
      sendParams,
      chainId: await getChainIdFromProvider(this.sourceChainProvider)
    })

    return {
      estimatedSourceChainFee: nativeFee,
      estimatedDestinationChainFee: constants.Zero
    }
  }

  public async transfer({
    amount,
    signer,
    destinationAddress,
    wagmiConfig
  }: TransferProps & { wagmiConfig: Config }) {
    await this.validateOftTransfer()

    const oftContract = this.getOftAdapterContract(signer)
    const { request } = await prepareTransferConfig({
      signer,
      oftContract,
      amount,
      destLzEndpointId: this.destLzEndpointId!,
      destinationAddress,
      sourceChainId: await getChainIdFromProvider(this.sourceChainProvider),
      wagmiConfig
    })

    const sendTx = await writeContract(wagmiConfig, request)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { hash: sendTx },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
