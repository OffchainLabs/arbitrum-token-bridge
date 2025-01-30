import { BigNumber, constants, ethers } from 'ethers'
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
import { fetchErc20Allowance, getL1ERC20Address } from '../util/TokenUtils'
import { getAddressFromSigner } from './utils'
import { lzProtocolConfig } from './oftUtils'

// https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/oapp/contracts/oft/interfaces/IOFT.sol
const OFTv2Interface = [
  'function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) _sendParam, bool _payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  'function quoteOFT(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) sendParam) external view returns (tuple(uint256 minAmountLD, uint256 maxAmountLD), tuple(int256 feeAmountLD, string description)[], tuple(uint256 amountSentLD, uint256 amountReceivedLD))',
  'function send(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) sendParam, tuple(uint256 nativeFee, uint256 lzTokenFee) fee, address refundAddress) external payable returns (tuple(bytes32 guid, uint64 nonce, tuple(uint256 nativeFee, uint256 lzTokenFee) fee), tuple(uint256 amountSentLD, uint256 amountReceivedLD))',
  'function allowance(address owner, address spender) external view returns (uint256)'
]

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
        throw Error('Token is not an OFT')
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

    // Check if token has OFT adapters for both chains
    const sourceChainConfig = lzProtocolConfig[sourceChainId]
    const destChainConfig = lzProtocolConfig[destinationChainId]
    const destErc20Address =
      sourceChainConfig?.peerToken?.[this.sourceChainErc20Address]

    if (!destErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    // Only check for adapter support
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
      {
        from: address
      }
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

    const contract = new ethers.Contract(
      this.getContractAddress(),
      OFTv2Interface,
      this.sourceChainProvider
    )

    const sendParam = {
      dstEid: this.destLzEndpointId!,
      to: ethers.utils.hexZeroPad(address, 32),
      amountLD: amount,
      minAmountLD: amount,
      extraOptions: '0x',
      composeMsg: '0x'
    }

    try {
      const { nativeFee } = await contract.quoteSend(sendParam, false)
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

    const contract = new ethers.Contract(
      this.getContractAddress(),
      OFTv2Interface,
      signer
    )

    const sendParam = {
      dstEid: this.destLzEndpointId!,
      to: ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
      amountLD: amount,
      minAmountLD: amount,
      extraOptions: '0x',
      composeMsg: '0x'
    }

    const { nativeFee, lzTokenFee } = await contract.quoteSend(sendParam, false)
    const [oftLimit, oftFeeDetails, oftReceipt] = await contract.quoteOFT(
      sendParam
    )

    const tx = await contract.send(
      sendParam,
      { nativeFee, lzTokenFee },
      address,
      { value: nativeFee }
    )

    const transfer = {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider,
      oftDetails: {
        limits: oftLimit,
        fees: oftFeeDetails,
        receipt: oftReceipt
      }
    }

    console.log('xxxxx transfer', transfer)

    return transfer
  }
}
