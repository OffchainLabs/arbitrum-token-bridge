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
import { getAddressFromSigner, isLayerZeroToken } from './utils'

// OFT v2 interface from LayerZero docs
const OFTv2Interface = [
  'function estimateSendFee(uint16 _dstChainId, bytes32 _toAddress, uint256 _amount, bool _useZro, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)',
  'function send(uint16 _dstChainId, bytes32 _toAddress, uint256 _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable',
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

    const sourceChainId = await this.sourceChainProvider
      .getNetwork()
      .then(n => n.chainId)
    const isOft = await isLayerZeroToken(
      this.sourceChainErc20Address,
      sourceChainId
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

    // Default adapter params for version 2
    const adapterParams = ethers.utils.solidityPack(
      ['uint16', 'uint256'],
      [2, 200000] // version 2, gas limit 200k
    )

    try {
      const [nativeFee] = await contract.estimateSendFee(
        destinationChainId,
        ethers.utils.hexZeroPad(address, 32),
        amount,
        false, // don't use ZRO token
        adapterParams
      )

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

    // Default adapter params for version 2
    const adapterParams = ethers.utils.solidityPack(
      ['uint16', 'uint256'],
      [2, 200000] // version 2, gas limit 200k
    )

    const [nativeFee] = await contract.estimateSendFee(
      destinationChainId,
      ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
      amount,
      false, // don't use ZRO token
      adapterParams
    )

    const tx = await contract.send(
      destinationChainId,
      ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
      amount,
      address, // refund address
      ethers.constants.AddressZero, // don't use ZRO token
      adapterParams,
      { value: nativeFee }
    )

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
