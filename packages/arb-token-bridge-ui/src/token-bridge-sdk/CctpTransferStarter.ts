import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  SelectedToken,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { formatAmount } from '../util/NumberUtils'
import { getCctpUtils, fetchPerMessageBurnLimit, getContracts } from './cctp'
import { getChainIdFromProvider, getAddressFromSigner } from './utils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { BigNumber, Signer } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { Provider } from '@ethersproject/providers'

export class CctpTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType

  constructor(props: BridgeTransferStarterProps) {
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
    const { tokenMessengerContractAddress } = getContracts(sourceChainId)

    const allowanceForL1Gateway = await fetchErc20Allowance({
      address: selectedToken.address,
      provider: this.sourceChainProvider,
      owner: recipient,
      spender: tokenMessengerContractAddress
    })

    // need for approval - allowance exhausted
    if (!allowanceForL1Gateway.gte(amount)) {
      return true
    }

    return false
  }

  public async approveToken({
    signer,
    amount
  }: ApproveTokenProps & { amount: BigNumber }) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    // approve USDC token for burn
    const tx = await getCctpUtils({ sourceChainId }).approveForBurn(
      amount,
      signer
    )
    await tx.wait()
  }

  public static async approveCctpGasEstimation({
    sourceChainProvider,
    amount,
    signer
  }: {
    sourceChainProvider: Provider
    amount: BigNumber
    signer: Signer
  }) {
    const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getContracts(sourceChainId)
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    return await contract.estimateGas.approve(
      tokenMessengerContractAddress,
      amount
    )
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

    // burn token on the selected chain to be transferred from cctp contracts to the other chain
    const depositForBurnTx = await getCctpUtils({
      sourceChainId
    }).depositForBurn({
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
