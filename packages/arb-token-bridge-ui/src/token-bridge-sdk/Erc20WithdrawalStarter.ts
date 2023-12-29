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
import { approveNativeCurrency } from './core/approveNativeCurrency'
import {
  fetchErc20L1GatewayAddress,
  fetchErc20L2GatewayAddress,
  getL1ERC20Address
} from '../util/TokenUtils'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { getAddressFromSigner, getChainIdFromProvider } from './utils'
import { constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { tokenRequiresApprovalOnL2 } from '../util/L2ApprovalUtils'

export class Erc20WithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_withdrawal'

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

    const destinationChainErc20Address = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!destinationChainErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    const address = await getAddressFromSigner(signer)

    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    if (
      tokenRequiresApprovalOnL2(destinationChainErc20Address, sourceChainId) &&
      this.sourceChainErc20Address
    ) {
      const token = ERC20__factory.connect(
        this.sourceChainErc20Address,
        this.sourceChainProvider
      )

      const gatewayAddress = await fetchErc20L2GatewayAddress({
        erc20L1Address: destinationChainErc20Address,
        l2Provider: this.sourceChainProvider
      })

      return (await token.allowance(address, gatewayAddress)).gte(amount)
    }
    return false
  }

  public async approveTokenEstimateGas({ signer }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!destinationChainErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    const address = await getAddressFromSigner(signer)

    const l1GatewayAddress = await fetchErc20L1GatewayAddress({
      erc20L1Address: destinationChainErc20Address,
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
    })

    const contract = ERC20__factory.connect(
      destinationChainErc20Address,
      this.destinationChainProvider
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

    const destinationChainErc20Address = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!destinationChainErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    const gatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: destinationChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    const contract = await ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    // approval transaction
    await contract.functions.approve(gatewayAddress, constants.MaxUint256)
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const tokenAddress = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!tokenAddress) {
      throw Error('Erc20 token not found on parent chain')
    }

    const address = await getAddressFromSigner(signer)

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.sourceChainProvider
    )

    const tx = await erc20Bridger.withdraw({
      l2Signer: signer,
      erc20l1Address: tokenAddress,
      destinationAddress: destinationAddress ?? address,
      amount
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
