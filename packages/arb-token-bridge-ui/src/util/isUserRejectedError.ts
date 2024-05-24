import { UserRejectedRequestError } from 'wagmi'

function isUserRejectedError(error: any) {
  return (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    error instanceof UserRejectedRequestError ||
    error.message.match(/User Cancelled/)
  )
}
export { isUserRejectedError }
