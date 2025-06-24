import dayjs from 'dayjs'
import {
  getChainIdFromProvider,
  isSimulateContractReturnType
} from '@/token-bridge-sdk/utils'

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
  const [sourceChainId, destinationChainId] = await Promise.all([
    getChainIdFromProvider(context.transferStarter.sourceChainProvider),
    getChainIdFromProvider(context.transferStarter.destinationChainProvider)
  ])

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

  // narrow the union type
  if (!isSimulateContractReturnType(request)) {
    throw new Error(
      `Expected "SimulateContractReturnType" for wagmi transaction`
    )
  }

  const receipt = yield* stepGeneratorForTransactionWagmi(context, {
    txRequest: request,
    txRequestLabel: 'stepGeneratorForCctp.transfer'
  })

  if (typeof receipt === 'undefined') {
    return
  }

  yield* step({
    type: 'analytics',
    payload: {
      event: context.isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal',
      properties: {
        accountType: context.isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: getNetworkName(
          context.isDepositMode ? destinationChainId : sourceChainId
        ),
        amount: Number(context.amount),
        complete: false,
        version: 2
      }
    }
  })

  yield* step({
    type: 'tx_history_add',
    payload: await createMergedTransaction(
      { ...context, sourceChainId, destinationChainId },
      receipt.transactionHash
    )
  })
}

async function createMergedTransaction(
  {
    isDepositMode,
    walletAddress,
    destinationAddress,
    amount,
    sourceChainId,
    destinationChainId
  }: UiDriverContext & { sourceChainId: number; destinationChainId: number },
  depositForBurnTxHash: string
): Promise<MergedTransaction> {
  const childChainId = isDepositMode ? destinationChainId : sourceChainId
  const parentChainId = isDepositMode ? sourceChainId : destinationChainId

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
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
    cctpData: {
      sourceChainId,
      attestationHash: null,
      messageBytes: null,
      receiveMessageTransactionHash: null,
      receiveMessageTimestamp: null
    },
    parentChainId,
    childChainId,
    sourceChainId,
    destinationChainId
  }
}
