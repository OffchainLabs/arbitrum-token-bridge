import { constants, ethers, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  BridgeTransferStarter,
  TransferEstimateGas,
  TransferProps,
  TransferType,
  ApproveTokenProps,
  RequiresTokenApprovalProps,
  BridgeTransferStarterProps
} from './BridgeTransferStarter'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner } from './utils'
import {
  getOftV2TransferConfig,
  buildSendParams,
  getOftV2Quote
} from './oftUtils'
import oftV2Abi from './oftV2Abi.json'
import { isNetwork } from '../util/networks'

export class OftV2TransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'oftV2'
  private isOftTransferValidated?: boolean
  private oftSpenderAddress?: string
  private oftSpenderContract?: ethers.Contract
  private destLzEndpointId?: number
  private isSourceChainEthereum?: boolean
  private isOftNativeToken?: boolean

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

    const oftTransferConfig = await getOftV2TransferConfig({
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

    if (oftTransferConfig.isOftNativeToken) {
      this.isOftNativeToken = true
      this.oftSpenderAddress = this.sourceChainErc20Address
    } else {
      this.isOftNativeToken = false
      this.oftSpenderAddress = oftTransferConfig.sourceChainAdapterAddress
    }

    this.destLzEndpointId = oftTransferConfig.destinationChainLzEndpointId
  }

  private getOftSpenderContractAddress(): string {
    if (!this.isOftTransferValidated) {
      throw Error('OFT transfer validation failed')
    }
    return this.oftSpenderAddress!
  }

  private getOftSpenderContract(
    providerOrSigner: Signer | Provider
  ): ethers.Contract {
    if (!this.isOftTransferValidated) {
      throw Error('OFT transfer validation failed')
    }

    if (this.oftSpenderContract) {
      return this.oftSpenderContract
    }

    const oftSpenderContract = new ethers.Contract(
      this.getOftSpenderContractAddress(),
      oftV2Abi,
      providerOrSigner
    )
    this.oftSpenderContract = oftSpenderContract
    return oftSpenderContract
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

    // no approval needed for native OFT tokens
    if (this.isOftNativeToken) return false

    // only Eth adapter will need token approval
    if (!this.isSourceChainEthereum) return false

    const address = await getAddressFromSigner(signer)
    const spender = this.getOftSpenderContractAddress()

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address!,
      provider: this.sourceChainProvider,
      owner: address,
      spender
    })

    return allowance.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      this.oftSpenderAddress!,
      constants.MaxUint256, // Eth USDT will need MAX approval since that cannot be changed afterwards
      { from: address }
    )
  }

  public async approveToken({ signer }: ApproveTokenProps) {
    await this.validateOftTransfer()
    const spender = this.getOftSpenderContractAddress()
    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      signer
    )

    return contract.functions.approve(spender, constants.MaxUint256) // Eth USDT will need MAX approval since that cannot be changed afterwards
  }

  // for OFT, we don't have functions for gas estimates, `sendQuote` method tells us the fees directly
  public async transferEstimateGas() {
    return undefined
  }

  public async transferEstimateFee({ amount, signer }: TransferEstimateGas) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getOftSpenderContract(signer)

    const sendParams = buildSendParams({
      dstEid: this.destLzEndpointId!,
      address,
      amount
    })

    // the amount in native currency that needs to be paid at the source chain to cover for both source and destination message transfers
    const { nativeFee } = await getOftV2Quote({
      contract: oftContract,
      sendParams
    })

    return {
      estimatedSourceChainFee: nativeFee,
      estimatedDestinationChainFee: constants.Zero
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getOftSpenderContract(signer)

    const sendParams = buildSendParams({
      dstEid: this.destLzEndpointId!,
      address,
      amount,
      destinationAddress
    })

    const { nativeFee, lzTokenFee } = await getOftV2Quote({
      contract: oftContract,
      sendParams
    })

    const sendTx = await oftContract.send(
      sendParams,
      {
        nativeFee: nativeFee,
        lzTokenFee: lzTokenFee
      },
      address,
      { value: nativeFee }
    )

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: sendTx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
