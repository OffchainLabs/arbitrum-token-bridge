import * as Sentry from '@sentry/react'

import { isUserRejectedError } from '../../util/isUserRejectedError'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'

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

export function onTxError(error: unknown) {
  if (!isUserRejectedError(error)) {
    Sentry.captureException(error)
  }
}

export function useTokenFromSearchParams(): {
  tokenFromSearchParams: string | undefined
  setTokenQueryParam: (token: string | undefined) => void
} {
  const [{ token: tokenFromSearchParams }, setQueryParams] = useArbQueryParams()

  const setTokenQueryParam = (token: string | undefined) =>
    setQueryParams({ token })

  if (!tokenFromSearchParams) {
    return {
      tokenFromSearchParams: undefined,
      setTokenQueryParam
    }
  }

  return {
    tokenFromSearchParams,
    setTokenQueryParam
  }
}
