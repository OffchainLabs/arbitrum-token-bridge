import { DefaultTransferContext } from './DefaultTransferStateMachine'
import { createCctpTransferStateMachine } from './CctpTransferStateMachine'
import { createStandardBridgeTransferStateMachine } from './StandardBridgeTransferStateMachine'
import { createOftTransferStateMachine } from './OftTransferStateMachine'

export const createTransferStateMachine = async (
  context: DefaultTransferContext
) => {
  // Determine transfer type
  if (context.isCctp) {
    const stateMachine = createCctpTransferStateMachine()
    return stateMachine.run(context)
  }

  if (context.isOftTransfer) {
    const stateMachine = createOftTransferStateMachine()
    return stateMachine.run(context)
  }

  // Default to standard bridge
  const stateMachine = createStandardBridgeTransferStateMachine()
  return stateMachine.run(context)
}
