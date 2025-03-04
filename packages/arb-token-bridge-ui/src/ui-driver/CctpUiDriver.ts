import { UiDriverContext, UiDriverStep } from './UiDriver'

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, any, any> {
    if (context.isDepositMode) {
      const userInput: false | 'bridge-normal-usdce' | 'bridge-cctp-usd' =
        yield { type: 'dialog', dialog: 'cctp_deposit' }

      if (!userInput) {
        return yield { type: 'return' }
      }

      if (userInput === 'bridge-normal-usdce') {
        yield { type: 'deposit_usdc.e' }
        return yield { type: 'return' }
      }
    } else {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'cctp_withdrawal'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }
    }

    if (
      context.isSmartContractWallet &&
      // todo: add tests
      addressesEqual(context.walletAddress, context.destinationAddress)
    ) {
      const userInput = yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }
    }
  }
}

function addressesEqual(
  address1: string | undefined,
  address2: string | undefined
) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase()
}
