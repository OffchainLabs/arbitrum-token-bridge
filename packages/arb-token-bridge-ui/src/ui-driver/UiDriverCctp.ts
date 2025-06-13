import dayjs from 'dayjs'

import { step, UiDriverStepGenerator, UiDriverContext } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForSmartContractWalletDestinationDialog,
  stepGeneratorForTransactionEthers,
  stepGeneratorForTransactionWagmi
} from './UiDriverCommon'

import { getNetworkName } from '../util/networks'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { getUsdcTokenAddressFromSourceChainId } from '../state/cctpState'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  const deposit = context.isDepositMode
  const dialog = `confirm_cctp_${deposit ? 'deposit' : 'withdrawal'}` as const

  yield* step({ type: 'start' })
  yield* stepGeneratorForDialog(dialog)
  yield* stepGeneratorForSmartContractWalletDestinationDialog(context)

  const approval = await context.transferStarter.requiresTokenApproval({
    amount: context.amountBigNumber,
    owner: context.walletAddress
  })

  if (approval) {
    yield* stepGeneratorForDialog('approve_token')

    const request = await context.transferStarter.approveTokenPrepareTxRequest({
      amount: context.amountBigNumber
    })

    yield* stepGeneratorForTransactionEthers(context, {
      txRequest: request,
      txRequestLabel: 'stepGeneratorForCctp.approveToken'
    })
  }

  const request = await context.transferStarter.transferPrepareTxRequest({
    amount: context.amountBigNumber,
    from: context.walletAddress,
    destinationAddress: context.destinationAddress,
    wagmiConfig: context.wagmiConfig
  })

  const receipt = yield* stepGeneratorForTransactionWagmi(context, {
    // @ts-expect-error - TODO: fix this
    txRequest: request,
    txRequestLabel: 'stepGeneratorForCctp.transfer'
  })

  if (typeof receipt === 'undefined') {
    return
  }

  yield {
    type: 'analytics',
    payload: {
      event: context.isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal',
      properties: {
        accountType: context.isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: getNetworkName(context.childChain.id),
        amount: Number(context.amount),
        complete: false,
        version: 2
      }
    }
  }

  yield {
    type: 'tx_history_add',
    payload: createMergedTransaction(context, receipt.transactionHash)
  }
}

function createMergedTransaction(
  {
    isDepositMode,
    walletAddress,
    destinationAddress,
    sourceChain,
    destinationChain,
    amount,
    parentChain,
    childChain
  }: UiDriverContext,
  depositForBurnTxHash: string
): MergedTransaction {
  return {
    txId: depositForBurnTxHash,
    asset: 'USDC',
    assetType: AssetType.ERC20,
    blockNum: null,
    createdAt: dayjs().valueOf(),
    direction: isDepositMode ? 'deposit' : 'withdraw',
    isWithdrawal: !isDepositMode,
    resolvedAt: null,
    status: 'pending',
    uniqueId: null,
    value: amount,
    depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
    destination: destinationAddress ?? walletAddress,
    sender: walletAddress,
    isCctp: true,
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChain.id),
    cctpData: {
      sourceChainId: sourceChain.id,
      attestationHash: null,
      messageBytes: null,
      receiveMessageTransactionHash: null,
      receiveMessageTimestamp: null
    },
    parentChainId: parentChain.id,
    childChainId: childChain.id,
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id
  }
}
