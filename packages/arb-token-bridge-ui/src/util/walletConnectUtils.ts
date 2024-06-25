export function onDisconnectHandler() {
  if (typeof indexedDB === 'undefined') {
    return
  }

  if (typeof localStorage === 'undefined') {
    return
  }

  const isWalletConnect =
    localStorage.getItem('wagmi.wallet') === '"walletConnect"'

  if (!isWalletConnect) {
    return
  }

  indexedDB.deleteDatabase('WALLET_CONNECT_V2_INDEXED_DB')

  setTimeout(() => window.location.reload(), 100)
}
