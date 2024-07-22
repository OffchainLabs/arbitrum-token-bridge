import { UserRejectedRequestError } from 'wagmi'

/**
 * This should only be used to conditionally act on errors,
 * to display an error toast for example.
 *
 * Filtering of userRejectedError sent to sentry is done in _app.tsx
 */
function isUserRejectedError(error: any) {
  return (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    error?.message?.match(/User Cancelled/) ||
    error instanceof UserRejectedRequestError
  )
}
export { isUserRejectedError }
