import { BigNumber, constants, ethers, Signer } from 'ethers'
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
import { lzProtocolConfig } from './oftUtils'
import { Provider } from '@ethersproject/providers'
import OftAbi from './OFTContracts/oft-abi.json'

interface SendParam {
  dstEid: number
  to: string
  amountLD: string
  minAmountLD: string
  extraOptions: string
  composeMsg: string
  oftCmd: string
}

export class OftTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'oft'
  private isOftTokenValidated: boolean | null = null
  private oftAdapterAddress: string | null = null
  private destLzEndpointId: number | null = null

  constructor(props: BridgeTransferStarterProps) {
    super(props)
    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }
  }

  private async validateOftTransfer() {
    // Return cached result if available
    if (this.isOftTokenValidated !== null) {
      if (!this.isOftTokenValidated) {
        throw Error('Token is not supported for OFT transfer')
      }
      return
    }

    if (!this.sourceChainErc20Address) {
      this.isOftTokenValidated = false
      throw Error('OFT token address not found')
    }

    const sourceChainId = await this.sourceChainProvider
      .getNetwork()
      .then(n => n.chainId)
    const destinationChainId = await this.destinationChainProvider
      .getNetwork()
      .then(n => n.chainId)

    const sourceChainConfig = lzProtocolConfig[sourceChainId]
    const destChainConfig = lzProtocolConfig[destinationChainId]
    const destErc20Address =
      sourceChainConfig?.peerToken?.[this.sourceChainErc20Address]

    if (!destErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    if (
      sourceChainConfig?.oftAdapters?.[this.sourceChainErc20Address] &&
      destChainConfig?.oftAdapters?.[destErc20Address]
    ) {
      this.isOftTokenValidated = true
      this.oftAdapterAddress =
        sourceChainConfig.oftAdapters[this.sourceChainErc20Address] ?? null
      this.destLzEndpointId = destChainConfig.lzEndpointId
      return
    }

    this.isOftTokenValidated = false
    throw Error('Token is not supported for OFT transfer')
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
      OftAbi,
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
      amount ?? constants.MaxUint256,
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

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getContract(signer)

    const sendParam = {
      dstEid: this.destLzEndpointId!,
      to: ethers.utils.hexZeroPad(address, 32),
      amountLD: amount.toString(),
      minAmountLD: amount.toString(),
      extraOptions: '0x',
      composeMsg: '0x',
      oftCmd: '0x'
    }

    try {
      const { nativeFee } = await oftContract.quoteSend(sendParam, false)

      console.log('successfully received the estimation', { nativeFee })
      return {
        estimatedParentChainGas: nativeFee,
        estimatedChildChainGas: constants.Zero
      }
    } catch (e) {
      console.warn('Error estimating OFT transfer gas:', e)
      return {
        estimatedParentChainGas: BigNumber.from(300000),
        estimatedChildChainGas: constants.Zero
      }
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    await this.validateOftTransfer()

    const address = await getAddressFromSigner(signer)
    const oftContract = this.getContract(signer)

    const sendParam: SendParam = {
      dstEid: this.destLzEndpointId!,
      to: ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
      amountLD: amount.toString(),
      minAmountLD: amount.toString(),
      extraOptions: '0x',
      composeMsg: '0x',
      oftCmd: '0x'
    }

    const quote = await oftContract.quoteSend(sendParam, false)

    const sendTx = await oftContract.send(
      sendParam,
      {
        nativeFee: quote.nativeFee.toString(),
        lzTokenFee: quote.lzTokenFee.toString()
      },
      address,
      { value: quote.nativeFee.toString() }
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
