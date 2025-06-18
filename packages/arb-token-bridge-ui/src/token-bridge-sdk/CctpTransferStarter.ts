import { Config, simulateContract, writeContract } from '@wagmi/core'
import { BigNumber, constants, utils } from 'ethers'
import { TransactionRequest } from '@ethersproject/providers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import {
  ApproveTokenPrepareTxRequestProps,
  ApproveTokenProps,
  BridgeTransferStarter,
  RequiresTokenApprovalProps,
  TransferPrepareTxRequestProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { formatAmount } from '../util/NumberUtils'
import { fetchPerMessageBurnLimit, getCctpContracts } from './cctp'
import { getAddressFromSigner } from './utils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { TokenMessengerAbi } from '../util/cctp/TokenMessengerAbi'
import { Address } from '../util/AddressUtils'

export class CctpTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'cctp'

  public requiresNativeCurrencyApproval = async () => false

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public approveNativeCurrency = async () => {
    return
  }

  public async requiresTokenApproval({
    amount,
    owner
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const {
      //
      usdcContractAddress,
      tokenMessengerContractAddress
    } = getCctpContracts({ sourceChainId: await this.getSourceChainId() })

    const allowance = await fetchErc20Allowance({
      address: usdcContractAddress,
      provider: this.sourceChainProvider,
      owner,
      spender: tokenMessengerContractAddress
    })

    return allowance.lt(amount)
  }

  public async approveTokenPrepareTxRequest(
    props?: ApproveTokenPrepareTxRequestProps
  ): Promise<TransactionRequest> {
    const {
      //
      usdcContractAddress,
      tokenMessengerContractAddress
    } = getCctpContracts({ sourceChainId: await this.getSourceChainId() })

    return {
      to: usdcContractAddress,
      data: ERC20__factory.createInterface().encodeFunctionData('approve', [
        tokenMessengerContractAddress,
        props?.amount ?? constants.MaxUint256
      ]),
      value: BigNumber.from(0)
    }
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    const txRequest = await this.approveTokenPrepareTxRequest({ amount })
    return signer.sendTransaction(txRequest)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    const txRequest = await this.approveTokenPrepareTxRequest({ amount })
    return signer.estimateGas(txRequest)
  }

  public async transferEstimateGas() {
    // for cctp transfers we don't call our native gas estimation methods because we have completely different contracts
    return undefined
  }

  public async transferPrepareTxRequest({
    from,
    amount,
    destinationAddress,
    wagmiConfig
  }: TransferPrepareTxRequestProps & { wagmiConfig: Config }) {
    const sourceChainId = await this.getSourceChainId()

    // cctp has an upper limit for transfer
    const burnLimit = await fetchPerMessageBurnLimit({
      sourceChainId,
      wagmiConfig
    })

    if (amount.gt(burnLimit)) {
      const formatedLimit = formatAmount(BigNumber.from(burnLimit), {
        decimals: 6, // hardcode for USDC
        symbol: 'USDC'
      })
      throw Error(
        `The limit for transfers using CCTP is ${formatedLimit}. Please lower your amount and try again.`
      )
    }

    const recipient = destinationAddress ?? from
    // burn token on the selected chain to be transferred from cctp contracts to the other chain
    // CCTP uses 32 bytes addresses, while EVEM uses 20 bytes addresses
    const mintRecipient = utils.hexlify(utils.zeroPad(recipient, 32)) as Address

    const {
      usdcContractAddress,
      tokenMessengerContractAddress,
      targetChainDomain
    } = getCctpContracts({
      sourceChainId
    })

    return simulateContract(wagmiConfig, {
      address: tokenMessengerContractAddress,
      abi: TokenMessengerAbi,
      functionName: 'depositForBurn',
      args: [
        amount.toBigInt(),
        targetChainDomain,
        mintRecipient,
        usdcContractAddress
      ]
    })
  }

  async transfer({
    signer,
    amount,
    destinationAddress,
    wagmiConfig
  }: TransferProps & { wagmiConfig: Config }) {
    const { request } = await this.transferPrepareTxRequest({
      from: await getAddressFromSigner(signer),
      amount,
      destinationAddress,
      wagmiConfig
    })

    const depositForBurnTx = await writeContract(wagmiConfig, request)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { hash: depositForBurnTx },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
