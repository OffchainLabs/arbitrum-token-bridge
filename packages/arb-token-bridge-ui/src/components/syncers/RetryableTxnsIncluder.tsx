import { useCallback, useContext, useEffect } from 'react'

import { BigNumber } from 'ethers'
import { AssetType, Transaction, useArbTokenBridge } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { useInterval } from '../common/Hooks'

const RetryableTxnsIncluder = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: { arbTokenBridge, l2NetworkDetails, arbTokenBridgeLoaded }
  } = useAppState()

  const getL2TxnHashes = useCallback(
    async (depositTxn: Transaction) => {
      if (!bridge || !l2NetworkDetails) {
        return null
      }
      let seqNum: BigNumber
      if (depositTxn.seqNum) {
        seqNum = BigNumber.from(depositTxn.seqNum)
      } else {
        // for backwards compatibility, add seqNum to cached old deposits
        const rec = await bridge.l1Provider.getTransactionReceipt(
          depositTxn.txID
        )
        const seqNumArray = await bridge.getInboxSeqNumFromContractTransaction(
          rec
        )
        if (!seqNumArray || seqNumArray.length === 0) {
          return null
        }
        ;[seqNum] = seqNumArray
      }

      const l2ChainID = BigNumber.from(l2NetworkDetails.chainID)
      const retryableTicketHash = await bridge.calculateL2TransactionHash(
        seqNum,
        l2ChainID
      )
      const autoRedeemHash = await bridge.calculateRetryableAutoRedeemTxnHash(
        seqNum,
        l2ChainID
      )
      const userTxnHash = await bridge.calculateL2RetryableTransactionHash(
        seqNum,
        l2ChainID
      )
      return {
        retryableTicketHash,
        autoRedeemHash,
        userTxnHash,
        seqNum
      }
    },
    [useArbTokenBridge, l2NetworkDetails]
  )
  /**
   * For every L1 deposit, we ensure the relevant L2 transactions are included in the transaction list:
   * For Eth: the "deposit-l2" (which is the ticket creation)
   * For tokens, the ticket creation, auto-redeem, and user-txn.
   */
  const checkAndAddL2DepositTxns = useCallback(() => {
    if (!bridge) {
      return
    }

    const successfulL1Deposits = actions.app.getSuccessfulL1Deposits()
    const sortedTransactions = actions.app.getSortedTransactions()

    Promise.all(successfulL1Deposits.map(getL2TxnHashes))
      .then(txnHashesArr => {
        const transactionsToAdd: Transaction[] = []

        const txIdsSet = new Set([...sortedTransactions.map(tx => tx.txID)])

        successfulL1Deposits.forEach((depositTxn: Transaction, i: number) => {
          const txnHashes = txnHashesArr[i]
          if (txnHashes === null) {
            console.log('Could not find seqNum for', depositTxn.txID)
            return
          }
          const { retryableTicketHash, autoRedeemHash, userTxnHash } = txnHashes
          const seqNum = txnHashes.seqNum.toNumber()
          // add ticket creation if not yet included
          if (!txIdsSet.has(retryableTicketHash)) {
            transactionsToAdd.push({
              ...depositTxn,
              ...{
                status: 'pending',
                type:
                  depositTxn.assetType === 'ETH'
                    ? 'deposit-l2'
                    : 'deposit-l2-ticket-created',
                txID: retryableTicketHash,
                seqNum,
                blockNumber: undefined
              }
            })
          }

          if (depositTxn.assetType === AssetType.ERC20) {
            // add autoredeem if not yet included (tokens only)
            if (!txIdsSet.has(autoRedeemHash)) {
              transactionsToAdd.push({
                ...depositTxn,
                ...{
                  status: 'pending',
                  type: 'deposit-l2-auto-redeem',
                  txID: autoRedeemHash,
                  seqNum,
                  blockNumber: undefined
                }
              })
            }
            // add user-txn if not yet included (tokens only)
            if (!txIdsSet.has(userTxnHash)) {
              transactionsToAdd.push({
                ...depositTxn,
                ...{
                  status: 'pending',
                  type: 'deposit-l2',
                  txID: userTxnHash,
                  seqNum,
                  blockNumber: undefined
                }
              })
            }
          }
        })
        arbTokenBridge?.transactions?.addTransactions(transactionsToAdd)
      })
      .catch(err => {
        console.warn('Errors checking to retryable txns to add', err)
      })
  }, [bridge, arbTokenBridge?.transactions?.addTransactions])

  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndAddL2DepositTxns,
    4000
  )
  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
  }, [arbTokenBridgeLoaded])

  return <></>
}

export { RetryableTxnsIncluder }
