import { Transaction } from 'token-bridge-sdk'

type L1TxHash = string

export class SeenTransactionsCache {
  private static readonly dataKey = 'arbitrum:bridge:seen-txs'
  private static readonly timestampKey = 'arbitrum:bridge:seen-txs:created-at'

  public static get(): L1TxHash[] {
    const seenTxs = localStorage.getItem(this.dataKey)

    // even during first loads, seenTxs was getting fetched as "[]" (non-null) in ls during automation, so cache timestamp didn't get set properly
    // which caused all pending txns to be seen on first load as well
    // reason - during automation, when app resets it's state during metamask re-connection, instead of this reset method, update([]) function is called which sets the ls state to non-null "[]"
    const seenTxsParsed =
      !seenTxs || seenTxs === '[]' ? [] : JSON.parse(seenTxs)

    // The first time the user visits the Bridge UI, mark all previous txs from the local cache as seen
    if (!seenTxsParsed?.length) {
      let initialState: L1TxHash[]
      const cachedTxsStringified = localStorage.getItem('arbTransactions')

      if (!cachedTxsStringified) {
        initialState = []
      } else {
        const cachedTxs: Transaction[] = JSON.parse(cachedTxsStringified)
        initialState = cachedTxs.map(tx => tx.txID)
      }

      localStorage.setItem(this.dataKey, JSON.stringify(initialState))
      localStorage.setItem(this.timestampKey, new Date().toISOString())

      return initialState
    }

    return seenTxsParsed
  }

  public static getCreationTimestamp(): Date | null {
    const creationTimestampISO = localStorage.getItem(this.timestampKey)
    return creationTimestampISO !== null ? new Date(creationTimestampISO) : null
  }

  public static update(updatedCache: L1TxHash[]): void {
    localStorage.setItem(this.dataKey, JSON.stringify(updatedCache))
  }
}
