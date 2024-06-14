export function onDisconnectHandler() {
  indexedDB.deleteDatabase('WALLET_CONNECT_V2_INDEXED_DB')

  setTimeout(() => window.location.reload(), 100)
}
