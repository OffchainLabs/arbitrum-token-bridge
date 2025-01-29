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
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner } from './utils'
import { isLayerZeroToken } from './oftUtils'

// https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/oapp/contracts/oft/interfaces/IOFT.sol
const OFTv2Interface = [
  'function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) _sendParam, bool _payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  'function quoteOFT(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) sendParam) external view returns (tuple(uint256 minAmountLD, uint256 maxAmountLD), tuple(int256 feeAmountLD, string description)[], tuple(uint256 amountSentLD, uint256 amountReceivedLD))',
  'function send(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg) sendParam, tuple(uint256 nativeFee, uint256 lzTokenFee) fee, address refundAddress) external payable returns (tuple(bytes32 guid, uint64 nonce, tuple(uint256 nativeFee, uint256 lzTokenFee) fee), tuple(uint256 amountSentLD, uint256 amountReceivedLD))',
  'function allowance(address owner, address spender) external view returns (uint256)'
]

export class OftTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'oft'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }
  }

  private async validateIsOftToken() {
    if (!this.sourceChainErc20Address) {
      throw Error('OFT token address not found')
    }

    const isOft = await isLayerZeroToken(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )

    if (!isOft) {
      throw Error('Token is not an OFT')
    }
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
    await this.validateIsOftToken()

    const address = await getAddressFromSigner(signer)

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address!,
      provider: this.sourceChainProvider,
      owner: address,
      spender: this.sourceChainErc20Address! // OFT is both token and bridge
    })

    return allowance.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    await this.validateIsOftToken()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      this.sourceChainErc20Address!, // OFT is both token and bridge
      amount ?? constants.MaxUint256
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    await this.validateIsOftToken()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address!,
      signer
    )

    return contract.functions.approve(
      this.sourceChainErc20Address!, // OFT is both token and bridge
      amount ?? constants.MaxUint256
    )
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    await this.validateIsOftToken()

    const destinationChainId = await this.destinationChainProvider
      .getNetwork()
      .then(n => n.chainId)
    const address = await getAddressFromSigner(signer)

    const contract = new ethers.Contract(
      this.sourceChainErc20Address!,
      OFTv2Interface,
      this.sourceChainProvider
    )

    const sendParam = {
      dstEid: destinationChainId,
      to: ethers.utils.hexZeroPad(address, 32),
      amountLD: amount,
      minAmountLD: amount, // Set to same as amount for no slippage
      extraOptions: '0x', // No extra options
      composeMsg: '0x' // No composed message
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
        estimatedParentChainGas: BigNumber.from(300000), // fallback estimate
        estimatedChildChainGas: constants.Zero
      }
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    await this.validateIsOftToken()

    const destinationChainId = await this.destinationChainProvider
      .getNetwork()
      .then(n => n.chainId)
    const address = await getAddressFromSigner(signer)

    const contract = new ethers.Contract(
      this.sourceChainErc20Address!,
      OFTv2Interface,
      signer
    )

    const sendParam = {
      dstEid: destinationChainId,
      to: ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
      amountLD: amount,
      minAmountLD: amount, // Set to same as amount for no slippage
      extraOptions: '0x', // No extra options
      composeMsg: '0x' // No composed message
    }

    // Get the messaging fee quote
    const { nativeFee, lzTokenFee } = await contract.quoteSend(sendParam, false)

    // Get OFT-specific details (optional, can be used for UI feedback)
    const [oftLimit, oftFeeDetails, oftReceipt] = await contract.quoteOFT(
      sendParam
    )

    const tx = await contract.send(
      sendParam,
      { nativeFee, lzTokenFee },
      address, // refund address
      { value: nativeFee }
    )

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider,
      // Add additional OFT-specific details if needed
      oftDetails: {
        limits: oftLimit,
        fees: oftFeeDetails,
        receipt: oftReceipt
      }
    }
  }
}
