import { EthL1L3Bridger, getChain } from '@arbitrum/sdk'
import {
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { requiresNativeCurrencyApproval } from './requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './approveNativeCurrency'
import { getAddressFromSigner } from './utils'
import { BigNumber } from 'ethers'
import { getProvider } from '../components/TransactionHistory/helpers'

export class EthTeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_teleport'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
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
    return approveNativeCurrency({
      signer,
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)

    const l3Network = await getChain(this.destinationChainProvider)

    // get the intermediate L2 chain provider
    const l2ChainId = l3Network.partnerChainID
    const l2Provider = getProvider(l2ChainId)

    const l1l3Bridger = new EthL1L3Bridger(l3Network)

    const parentChainBlockTimestamp = (
      await this.sourceChainProvider.getBlock('latest')
    ).timestamp

    const depositRequest = await l1l3Bridger.getDepositRequest(
      {
        amount,
        to: address,
        l2TicketGasOverrides: {
          gasLimit: { percentIncrease: BigNumber.from(5) }
        },
        l3TicketGasOverrides: {
          gasLimit: { percentIncrease: BigNumber.from(5) }
        }
      },
      signer,
      l2Provider,
      this.destinationChainProvider
    )

    //@ts-ignore: hardcode the gas limit until we have an sdk solution
    depositRequest.txRequest.gasLimit = 1_000_000

    const tx = await l1l3Bridger.executeDepositRequest(depositRequest, signer)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { ...tx, timestamp: parentChainBlockTimestamp },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
