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
import { getOftTransferConfig, buildSendParams, getOftQuote } from './oftUtils'
import oftAbi from './oftAbi.json'
import { isNetwork } from '../util/networks'

export class OftTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'oft'
  private isOftTokenValidated?: boolean
  private oftAdapterAddress?: string
  private destLzEndpointId?: number
  private isSourceChainEthereum?: boolean

  constructor(props: BridgeTransferStarterProps) {
    super(props)
    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }
  }

  private async validateOftTransfer() {
    if (typeof this.isOftTokenValidated !== 'undefined') {
      if (!this.isOftTokenValidated) {
        throw Error('Token is not supported for OFT transfer')
      }
      return
    }

    if (!this.sourceChainErc20Address) {
      this.isOftTokenValidated = false
      throw Error('OFT token address not found')
    }

    const [sourceChainId, destinationChainId] = await Promise.all([
      this.sourceChainProvider.getNetwork().then(n => n.chainId),
      this.destinationChainProvider.getNetwork().then(n => n.chainId)
    ])

    const oftTransferConfig = getOftTransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address: this.sourceChainErc20Address
    })

    if (!oftTransferConfig.isValid) {
      this.isOftTokenValidated = false
      throw Error('Token is not supported for OFT transfer')
    }

    this.isSourceChainEthereum = !!isNetwork(sourceChainId).isEthereumMainnet
    this.isOftTokenValidated = true
    this.oftAdapterAddress = oftTransferConfig.sourceChainAdapterAddress
    this.destLzEndpointId = oftTransferConfig.destinationChainLzEndpointId
  }

  private getContractAddress(): string {
    if (!this.isOftTokenValidated) {
      throw Error('OFT validation not performed')
    }
    return this.oftAdapterAddress!
  }

  private getContract(providerOrSigner: Signer | Provider): ethers.Contract {
    return new ethers.Contract(
      this.getContractAddress(),
      oftAbi,
      providerOrSigner
    )
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
    const spender = this.getContractAddress()

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
      this.oftAdapterAddress!,
      constants.MaxUint256, // Eth USDT will need MAX approval since that cannot be changed afterwards
      { from: address }
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    await this.validateOftTransfer()
    const spender = this.getContractAddress()
    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      signer
    )

    return contract.functions.approve(spender, amount ?? constants.MaxUint256)
  }

  // for OFT, we don't have functions for gas estimates, `sendQuote` method tells us the fees directly
  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    return undefined
  }

  public async transferEstimateFee({ amount, signer }: TransferEstimateGas) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getContract(signer)

    const sendParams = buildSendParams({
      dstEid: this.destLzEndpointId!,
      address,
      amount
    })

    // the amount in native currency that needs to be paid at the source chain to cover for both source and destination message transfers
    const { nativeFee } = await getOftQuote({
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
    const oftContract = this.getContract(signer)

    const sendParams = buildSendParams({
      dstEid: this.destLzEndpointId!,
      address,
      amount,
      destinationAddress
    })

    const { nativeFee, lzTokenFee } = await getOftQuote({
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
