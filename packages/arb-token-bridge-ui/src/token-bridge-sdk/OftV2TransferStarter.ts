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
import { Address, prepareWriteContract, writeContract } from '@wagmi/core'

async function prepareTransferConfig({
  signer,
  oftContract,
  destLzEndpointId,
  amount,
  destinationAddress
}: {
  signer: Signer
  oftContract: Contract
  destLzEndpointId: number
  amount: BigNumber
  destinationAddress?: string
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
    address: oftContract.address as Address
  })

  return prepareWriteContract({
    address: oftContract.address as Address,
    abi: oftV2Abi,
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
    const config = await prepareTransferConfig({
      signer,
      oftContract,
      amount,
      destLzEndpointId: this.destLzEndpointId!,
      destinationAddress
    })

    return {
      estimatedParentChainGas: await signer.estimateGas(config),
      estimatedChildChainGas: constants.Zero
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
      amount
    })

    // the amount in native currency that needs to be paid at the source chain to cover for both source and destination message transfers
    const { nativeFee } = await getOftV2Quote({
      address: oftContract.address as Address,
      sendParams
    })

    const gasEstimates = this.transferEstimateGas({
      amount,
      signer,
      destinationAddress
    })

    /**
     * getOftV2Quote return both gas fee and layerzero fee
     * We substract gas estimate from the fee to get an estimate of the fee
     */

    const sourceChainId = await signer.getChainId()
    const isDepositMode =
      sourceChainId === (await getChainIdFromProvider(this.sourceChainProvider))
    return {
      estimatedSourceChainFee: nativeFee.sub(gasEstimates),
      estimatedDestinationChainFee: constants.Zero
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    await this.validateOftTransfer()

    const oftContract = this.getOftAdapterContract(signer)
    const config = await prepareTransferConfig({
      signer,
      oftContract,
      amount,
      destLzEndpointId: this.destLzEndpointId!
    })

    const sendTx = await writeContract(config)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: sendTx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
