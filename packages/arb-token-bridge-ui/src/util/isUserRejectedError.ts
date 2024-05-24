function isUserRejectedError(error: any) {
  return (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    /user rejected/i.test(error?.message) // WalletConnect
  )
}
export { isUserRejectedError }
