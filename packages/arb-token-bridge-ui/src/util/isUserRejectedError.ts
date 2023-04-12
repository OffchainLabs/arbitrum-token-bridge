function isUserRejectedError(error: any) {
  return error?.code === 4001 || error?.code === 'ACTION_REJECTED'
}
export { isUserRejectedError }
