import { step, UiDriverStepGenerator } from './UiDriver'
import { addressesEqual } from '../util/AddressUtils'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  yield* step({ type: 'start' })

  const userInput1 = yield* step({
    type: 'dialog',
    payload: context.isDepositMode ? 'cctp_deposit' : 'cctp_withdrawal'
  })

  if (!userInput1) {
    yield* step({ type: 'return' })
    return
  }

  if (
    context.isSmartContractWallet &&
    addressesEqual(context.walletAddress, context.destinationAddress)
  ) {
    const userInput2 = yield* step({
      type: 'dialog',
      payload: 'scw_custom_destination_address_equal'
    })

    if (!userInput2) {
      yield* step({ type: 'return' })
      return
    }
  }
}
