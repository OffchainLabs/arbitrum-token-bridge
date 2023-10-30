import * as Sentry from '@sentry/react'

import { isUserRejectedError } from '../../util/isUserRejectedError'

export enum ImportTokenModalStatus {
  // "IDLE" is here to distinguish between the modal never being opened, and being closed after a user interaction
  IDLE,
  OPEN,
  CLOSED
}

export function getWarningTokenDescription(warningTokenType: number) {
  switch (warningTokenType) {
    case 0:
      return 'a supply rebasing token'
    case 1:
      return 'an interest accruing token'
    default:
      return 'a non-standard ERC20 token'
  }
}

export function onTxError(error: any) {
  if (!isUserRejectedError(error)) {
    Sentry.captureException(error)
  }
}
