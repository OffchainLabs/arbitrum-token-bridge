import { Erc20Bridger } from '@arbitrum/sdk'
import {
  ApproveNativeCurrencyProps,
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  RequiresTokenApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { approveNativeCurrency } from './approveNativeCurrency'
import {
  fetchErc20Allowance,
  fetchErc20L1GatewayAddress
} from '../util/TokenUtils'
import { requiresNativeCurrencyApproval } from './requiresNativeCurrencyApproval'
import { getAddressFromSigner } from './utils'
import { constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

export class Erc20DepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_deposit'

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    return requiresNativeCurrencyApproval({
      amount,
      signer,
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public async approveNativeCurrency({ signer }: ApproveNativeCurrencyProps) {
    return approveNativeCurrency({
      signer,
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const l1GatewayAddress = await fetchErc20L1GatewayAddress({
      erc20L1Address: this.sourceChainErc20Address,
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
    })

    const allowanceForL1Gateway = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l1GatewayAddress
    })

    return amount.gte(allowanceForL1Gateway)
  }

  public async approveTokenEstimateGas({ signer }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const l1GatewayAddress = await fetchErc20L1GatewayAddress({
      erc20L1Address: this.sourceChainErc20Address,
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
    })

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      l1GatewayAddress,
      constants.MaxUint256,
      {
        from: address
      }
    )
  }

  public async approveToken({ signer }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )
    const tx = await erc20Bridger.approveToken({
      erc20L1Address: this.sourceChainErc20Address,
      l1Signer: signer
    })
    await tx.wait()
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const tokenAddress = this.sourceChainErc20Address

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    const depositRequest = await erc20Bridger.getDepositRequest({
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider,
      from: address,
      erc20L1Address: tokenAddress,
      destinationAddress,
      amount
    })

    const tx = await erc20Bridger.deposit({
      ...depositRequest,
      l1Signer: signer
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
