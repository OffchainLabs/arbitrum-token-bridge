import { TransferContext, runTransferStateMachine } from './TransferStateMachine'

export const createTransferStateMachine = (context: TransferContext) => {
  return runTransferStateMachine(context)
} 