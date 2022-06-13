import { Transaction } from 'token-bridge-sdk'

type L1TxHash = string

export class SeenTransactionsCache {
  private static readonly dataKey = 'arbitrum:bridge:seen-txs'
  private static readonly timestampKey = 'arbitrum:bridge:seen-txs:created-at'

  public static get(): L1TxHash[] {
    const seenTxs = localStorage.getItem(this.dataKey)

    // The first time the user visits the Bridge UI, mark all previous txs from the local cache as seen
    if (!seenTxs) {
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

    return JSON.parse(seenTxs)
  }

  public static getCreationTimestamp(): Date | null {
    const creationTimestampISO = localStorage.getItem(this.timestampKey)
    return creationTimestampISO !== null ? new Date(creationTimestampISO) : null
  }

  public static update(updatedCache: L1TxHash[]): void {
    localStorage.setItem(this.dataKey, JSON.stringify(updatedCache))
  }
}
