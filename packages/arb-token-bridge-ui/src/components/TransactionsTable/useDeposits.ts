import { utils } from 'ethers'
import { useEffect, useState } from 'react'
import { AssetType, Transaction } from 'token-bridge-sdk'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextState } from '../App/AppContext'
import {
  DepositETHSubgraphResult,
  fetchETHDepositsFromSubgraph
} from './fetchEthDepositsFromSubgraph_draft'
import {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthDepositStatus
} from '@arbitrum/sdk'

export const useDeposits = () => {
  // Done 1. take the l1 address of the sender
  // Done 2. call the deposit subgraph
  // Done 3. store the results

  // - check the current algo -
  // 4. for all the results received - get the transaction id
  // 5. for all transaction id's fetch the detailed transaction receipt from sdk
  // 6. for all the detailed receipts, add the respective details to - RetryableIncluder so that the syncing starts

  // UPDATE - THIS was only applicable for new transactions and adds the txns in a pending state waiting for Includer to poll for them. Slow and bad.

  const {
    app: {
      arbTokenBridge: {
        walletAddress,
        transactions: { setTransactions }
      }
    }
  } = useAppState()

  const { currentL1BlockNumber } = useAppContextState()

  const { l1, l2 } = useNetworksAndSigners()

  const [deposits, setDeposits] = useState<MergedTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const fetchAndSetEthDeposits = async () => {
    setLoading(true)
    const result = await fetchETHDepositsFromSubgraph({
      address: walletAddress,
      fromBlock: 0,
      toBlock: currentL1BlockNumber,
      l2Provider: l2.provider
    })

    const ethDepositsFromSubgraph = result.map(tx => ({
      type: 'deposit-l1',
      status: 'pending',
      value: utils.formatEther(tx.value),
      txID: tx.transactionHash,
      asset: 'ETH',
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: walletAddress,
      l1NetworkID: String(l1.network.chainID),
      l2NetworkID: String(l2.network.chainID),
      blockNumber: tx.blockCreatedAt
    })) as unknown as Transaction[]

    // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
    // 2. on the basis of those, finally calculate the status of the transaction
    // 3. once this is done, update the transactions someohow in the APP-STATE so that they start showing?
    const finalTransactions = (await Promise.all(
      ethDepositsFromSubgraph.map(depositTx =>
        updateAdditionalTransactionData(depositTx)
      )
    )) as Transaction[]

    setTransactions(finalTransactions)

    setLoading(false)
  }

  const updateAdditionalTransactionData = async (depositTx: Transaction) => {
    const depositTxReceipt = await l1.provider.getTransactionReceipt(
      depositTx.txID
    )

    // fetch L1 transaction receipt
    const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

    if (depositTx.assetName === AssetType.ETH) {
      const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2.provider)

      if (!ethDepositMessage) {
        return
      }

      const status = await ethDepositMessage.status()

      const isDeposited = status === EthDepositStatus.DEPOSITED

      const timestampCreated = depositTx.blockNumber
        ? (await l1.provider.getBlock(Number(depositTx.blockNumber)))
            .timestamp * 1000
        : new Date().toISOString()

      const retryableCreationTxID = ethDepositMessage.l2DepositTxHash

      const l2BlockNum = isDeposited
        ? (await l2.provider.getTransaction(retryableCreationTxID)).blockNumber
        : null

      const timestampResolved = l2BlockNum
        ? (await l2.provider.getBlock(l2BlockNum)).timestamp * 1000
        : null

      const updatedDepositTx = {
        ...depositTx,
        status: retryableCreationTxID ? 'success' : 'pending', // handle other cases here
        timestampCreated,
        timestampResolved,
        l1ToL2MsgData: {
          status: isDeposited
            ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
            : L1ToL2MessageStatus.NOT_YET_CREATED,
          retryableCreationTxID,
          // Only show `l2TxID` after the deposit is confirmed
          l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined
        }
      }

      return updatedDepositTx
      // add the updated deposit TX to arbtokenBridge.transactions.transactions
      // so that it updates the state AND performs subsequent operations and shows on UI
    } else {
      /*

        FOR TOKEN DEPOSITS - PENDING

        */
      const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2.provider)
      if (!l1ToL2Msg) {
        return
      }

      const status = await l1ToL2Msg.status()

      if (status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
        // mark as success
      } else {
        // mark as pending
      }

      return depositTx
    }
  }

  useEffect(() => {
    //fetch the deposits through subgraph and populate them in state variable
    fetchAndSetEthDeposits()
  }, [walletAddress])

  return { deposits, loading }
}
