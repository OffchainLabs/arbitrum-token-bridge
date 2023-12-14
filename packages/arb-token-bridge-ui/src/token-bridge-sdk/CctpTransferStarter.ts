import { prepareWriteContract, writeContract } from '@wagmi/core'
import { BigNumber, utils } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import {
  ApproveTokenEstimateGasProps,
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { formatAmount } from '../util/NumberUtils'
import {
  fetchPerMessageBurnLimit,
  getCctpContracts,
  getUsdcToken
} from './cctp'
import { getChainIdFromProvider, getAddressFromSigner } from './utils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { TokenMessengerAbi } from '../util/cctp/TokenMessengerAbi'

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
    destinationAddress
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    // hardcode cctp token within this class, no need to pass externally
    const selectedToken = getUsdcToken({
      sourceChainId
    })

    const recipient = destinationAddress ?? address
    const { tokenMessengerContractAddress } = getCctpContracts({
      sourceChainId
    })

    const allowance = await fetchErc20Allowance({
      address: selectedToken.address,
      provider: this.sourceChainProvider,
      owner: recipient,
      spender: tokenMessengerContractAddress
    })

    return allowance.lt(amount)
  }

  public async approveToken({
    signer,
    amount
  }: ApproveTokenProps & { amount: BigNumber }) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const { usdcContractAddress, tokenMessengerContractAddress } =
      getCctpContracts({ sourceChainId })

    // approve USDC token for burn
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    const tx = await contract.functions.approve(
      tokenMessengerContractAddress,
      amount
    )
    return tx
  }

  public async approveTokenEstimateGas({
    signer,
    amount
  }: ApproveTokenEstimateGasProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getCctpContracts({ sourceChainId })
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    return await contract.estimateGas.approve(
      tokenMessengerContractAddress,
      amount
    )
  }

  public async transfer({ amount, destinationAddress, signer }: TransferProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    // hardcode cctp token within this class, no need to pass externally
    const selectedToken = getUsdcToken({
      sourceChainId
    })

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

    // CCTP uses 32 bytes addresses, while EVEM uses 20 bytes addresses
    const mintRecipient = utils.hexlify(
      utils.zeroPad(recipient, 32)
    ) as `0x${string}`

    const {
      usdcContractAddress,
      tokenMessengerContractAddress,
      targetChainDomain
    } = getCctpContracts({
      sourceChainId
    })

    const config = await prepareWriteContract({
      address: tokenMessengerContractAddress,
      abi: TokenMessengerAbi,
      functionName: 'depositForBurn',
      signer,
      args: [amount, targetChainDomain, mintRecipient, usdcContractAddress]
    })

    const depositForBurnTx = await writeContract(config)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: depositForBurnTx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
