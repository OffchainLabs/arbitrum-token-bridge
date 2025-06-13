import { step, UiDriverStepGenerator } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForSmartContractWalletDestinationDialog,
  stepGeneratorForTransactionEthers,
  stepGeneratorForTransactionWagmi
} from './UiDriverCommon'

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

  yield* stepGeneratorForTransactionWagmi(context, {
    // @ts-expect-error - TODO: fix this
    txRequest: request,
    txRequestLabel: 'stepGeneratorForCctp.transfer'
  })
}
