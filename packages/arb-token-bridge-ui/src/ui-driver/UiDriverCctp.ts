import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'

import { step, UiDriverStepGenerator } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForSmartContractWalletDestinationDialog,
  stepGeneratorForTransaction
} from './UiDriverCommon'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  const deposit = context.isDepositMode
  const dialog = `confirm_cctp_${deposit ? 'deposit' : 'withdrawal'}` as const

  yield* step({ type: 'start' })
  yield* stepGeneratorForDialog(dialog)
  yield* stepGeneratorForSmartContractWalletDestinationDialog(context)

  const cctpTransferStarter = new CctpTransferStarter({
    sourceChainProvider: context.sourceChainProvider,
    destinationChainProvider: context.destinationChainProvider
  })

  const approval = await cctpTransferStarter.requiresTokenApproval({
    amount: context.amountBigNumber,
    owner: context.walletAddress
  })

  if (approval) {
    const txRequest = await cctpTransferStarter.approveTokenPrepareTxRequest({
      amount: context.amountBigNumber
    })

    yield* stepGeneratorForDialog('approve_token')
    yield* stepGeneratorForTransaction(context, txRequest)
  }
}
