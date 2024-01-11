import { Erc20L1L3Bridger, getChain } from '@arbitrum/sdk'
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
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner, percentIncrease } from './utils'
import { Erc20DepositRequestParams } from '@arbitrum/sdk/dist/lib/assetBridger/l1l3Bridger'
import { getL2ConfigForTeleport } from './teleport'

export class Erc20TeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_teleport'

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
    // return requiresNativeCurrencyApproval({
    //   amount,
    //   signer,
    //   destinationChainProvider: this.destinationChainProvider
    // })

    return false
  }

  public async approveNativeCurrency({ signer }: ApproveNativeCurrencyProps) {
    // return approveNativeCurrency({
    //   signer,
    //   destinationChainProvider: this.destinationChainProvider
    // })
  }

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const l3Network = await getChain(this.destinationChainProvider)

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const l1TeleporterAddress = l1l3Bridger.teleporterAddresses.l1Teleporter

    const allowanceForTeleporter = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l1TeleporterAddress
    })

    return amount.gte(allowanceForTeleporter)
  }

  public async approveTokenEstimateGas({ signer }: ApproveTokenProps) {
    // if (!this.sourceChainErc20Address) {
    //   throw Error('Erc20 token address not found')
    // }
    // const address = await getAddressFromSigner(signer)
    // const l1GatewayAddress = await fetchErc20L1GatewayAddress({
    //   erc20L1Address: this.sourceChainErc20Address,
    //   l1Provider: this.sourceChainProvider,
    //   l2Provider: this.destinationChainProvider
    // })
    // const contract = ERC20__factory.connect(
    //   this.sourceChainErc20Address,
    //   this.sourceChainProvider
    // )
    // return contract.estimateGas.approve(
    //   l1GatewayAddress,
    //   constants.MaxUint256,
    //   {
    //     from: address
    //   }
    // )
  }

  public async approveToken({ signer }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const l3Network = await getChain(this.destinationChainProvider)

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const tx = await l1l3Bridger.approveToken(
      {
        erc20L1Address: this.sourceChainErc20Address
      },
      signer
    )

    return tx
  }

  public async transfer({ amount, signer }: TransferProps) {
    debugger

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const l3Network = await getChain(this.destinationChainProvider)

    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const tokenAddress = this.sourceChainErc20Address

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const depositParams = {
      erc20L1Address: tokenAddress,
      amount: amount,
      to: address,
      overrides: {}
    }

    const depositRequest = await l1l3Bridger.getDepositRequest(
      depositParams as Erc20DepositRequestParams,
      signer,
      l2Provider,
      this.destinationChainProvider
    )

    const parentChainBlockTimestamp = (
      await this.sourceChainProvider.getBlock('latest')
    ).timestamp

    //@ts-ignore: hardcode the gas limit until we have a solution in sdk
    depositRequest.gasLimit = 1_000_000

    const depositTx = await l1l3Bridger.executeDepositRequest(
      depositRequest,
      signer
    )

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: {
        ...depositTx,
        timestamp: parentChainBlockTimestamp
      },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
