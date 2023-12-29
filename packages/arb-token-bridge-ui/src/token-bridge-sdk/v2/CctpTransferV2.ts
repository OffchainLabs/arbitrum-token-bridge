import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  SelectedToken,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { fetchPerMessageBurnLimit } from '../../hooks/CCTP/fetchCCTPLimits'
import { formatAmount } from '../../util/NumberUtils'
import { getContracts } from '../../hooks/CCTP/useCCTP'
import { cctpContracts } from './core/cctpContracts'
import {
  RequiresTokenApprovalProps,
  requiresTokenApproval
} from './core/requiresTokenApproval'
import { getChainIdFromProvider } from './core/getChainIdFromProvider'
import { getAddressFromSigner } from './core/getAddressFromSigner'
import { ApproveTokenProps, approveToken } from './core/approveToken'

export class CctpTransferStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType

  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
    this.transferType = 'cctp'
  }

  public requiresNativeCurrencyApproval = async () => false

  public approveNativeCurrency = async () => {
    return
  }

  public async requiresTokenApproval({
    amount,
    address,
    selectedToken,
    destinationAddress
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    const recipient = destinationAddress ?? address
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getContracts(sourceChainId)

    return await requiresTokenApproval({
      address: recipient,
      amount,
      selectedToken: { ...selectedToken, address: usdcContractAddress },
      spender: tokenMessengerContractAddress,
      sourceChainProvider: this.sourceChainProvider
    })
  }

  public async approveToken({ signer, selectedToken }: ApproveTokenProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const { usdcContractAddress } = getContracts(sourceChainId)
    return await approveToken({
      signer,
      selectedToken: { ...selectedToken, address: usdcContractAddress },
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({
    amount,
    destinationAddress,
    signer,
    selectedToken
  }: TransferProps & { selectedToken: SelectedToken }) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const address = await getAddressFromSigner(signer)

    // cctp has an upper limit for transfer
    const burnLimit = await fetchPerMessageBurnLimit({
      sourceChainId
    })

    if (burnLimit.lte(amount)) {
      const formatedLimit = formatAmount(burnLimit, {
        decimals: selectedToken.decimals,
        symbol: 'USDC'
      })
      throw Error(
        `The limit for transfers using CCTP is ${formatedLimit}. Please lower your amount and try again.`
      )
    }

    const recipient = destinationAddress || address

    // approve token for burn
    const tx = await cctpContracts(sourceChainId).approveForBurn(amount, signer)
    await tx.wait()

    // burn token on the selected chain to be transferred from cctp contracts to the other chain
    const depositForBurnTx = await cctpContracts(sourceChainId).depositForBurn({
      amount,
      signer: signer,
      recipient
    })

    if (!depositForBurnTx) {
      throw Error('USDC deposit transaction failed')
    }

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: depositForBurnTx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
