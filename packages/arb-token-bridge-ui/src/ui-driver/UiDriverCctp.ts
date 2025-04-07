import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'

import { step, UiDriverStepGenerator } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForSmartContractWalletDestinationDialog,
  stepGeneratorForSmartContractWalletTooltip
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
    address: context.walletAddress
  })

  if (approval) {
    yield* stepGeneratorForDialog('approve_token')
    yield* stepGeneratorForSmartContractWalletTooltip(context)
  }
}
