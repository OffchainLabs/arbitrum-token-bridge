import { BigNumber, constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveTokenProps,
  BridgeTransferStarterWithAdapterProps,
  TransferEstimateGas,
  TransferProps
} from './BridgeTransferStarter'
import { fetchErc20ParentChainGatewayAddress } from '../util/TokenUtils'
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositTokenEstimateGas } from '../util/TokenDepositUtils'
import { Erc20DepositStarter } from './Erc20DepositStarter'

export class XErc20DepositStarter extends Erc20DepositStarter {
  protected sourceChainAdapterAddress: string

  constructor({ adapter, ...props }: BridgeTransferStarterWithAdapterProps) {
    super(props)

    this.sourceChainAdapterAddress = adapter
  }

  protected async getSourceChainGatewayAddress() {
    if (this.sourceChainGatewayAddress) {
      return this.sourceChainGatewayAddress
    }

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    this.sourceChainGatewayAddress = await fetchErc20ParentChainGatewayAddress({
      erc20ParentChainAddress: this.sourceChainAdapterAddress,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })

    return this.sourceChainGatewayAddress
  }

  /**
   *
   * xErc20DepositStarter methods
   *
   */

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    return contract.approve(
      await this.getSourceChainGatewayAddress(),
      amount ?? constants.MaxUint256
    )
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    return depositTokenEstimateGas({
      amount,
      address,
      erc20L1Address: this.sourceChainAdapterAddress,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)
    const erc20Bridger = await this.getBridger()

    const depositRequest = await erc20Bridger.getDepositRequest({
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider,
      from: address,
      erc20L1Address: this.sourceChainAdapterAddress,
      destinationAddress,
      amount,
      retryableGasOverrides: {
        // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
        // the 30% gas limit increase should cover the difference
        gasLimit: { percentIncrease: BigNumber.from(30) }
      }
    })

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const sourceChainTransaction = await erc20Bridger.deposit({
      ...depositRequest,
      l1Signer: signer,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
