import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { Provider } from '@ethersproject/providers'
import { AssetType, getL1TokenData, Transaction } from 'token-bridge-sdk'
import {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthDepositStatus
} from '@arbitrum/sdk'
import { utils } from 'ethers'

const L1SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nitro',
    cache: new InMemoryCache()
  }),
  ArbitrumNova: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nova',
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-goerli',
    cache: new InMemoryCache()
  })
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case 42161:
      return L1SubgraphClient.ArbitrumOne

    case 42170:
      return L1SubgraphClient.ArbitrumNova

    case 421613:
      return L1SubgraphClient.ArbitrumGoerli

    default:
      throw new Error(`[getL1SubgraphClient] Unsupported network: ${l2ChainId}`)
  }
}

export type DepositETHSubgraphResult = {
  id: string
  senderAliased: string
  destAddr: string
  value: string
  msgData: string
  transactionHash: string
  blockCreatedAt: string
}

/**
 * Fetches initiated ETH deposits from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l1Provider Provider for the L1 network
 */
export async function fetchETHDepositsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<Transaction[]> {
  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL1SubgraphClient(l2ChainId).query({
    query: gql`
      {
        ethDeposits(
          where: {
            sender: "${address}",
            blockCreatedAt_gte: ${fromBlock},
            blockCreatedAt_lte: ${toBlock}
            ${searchString ? `transactionHash_contains: "${searchString}"` : ''}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${pageSize},
          skip: ${pageNumber * pageSize}
        ) {
          id
          blockCreatedAt
          value
          destAddr
          isClassic
          msgData
          sender
          timestamp
          transactionHash
        }
      }
    `
  })

  const ethDepositsFromSubgraph = res.data.ethDeposits.map((tx: any) => ({
    type: 'deposit-l1',
    status: 'pending',
    value: utils.formatEther(tx.value),
    txID: tx.transactionHash,
    asset: 'ETH',
    assetName: 'ETH',
    assetType: AssetType.ETH,
    sender: address,
    l1NetworkID: String(l1ChainId),
    l2NetworkID: String(l2ChainId),
    blockNumber: tx.blockCreatedAt
  })) as unknown as Transaction[]

  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction
  // 3. once this is done, update the transactions someohow in the APP-STATE so that they start showing?
  const finalTransactions = (await Promise.all(
    ethDepositsFromSubgraph.map(depositTx =>
      updateAdditionalTransactionData(depositTx, l1Provider, l2Provider)
    )
  )) as Transaction[]

  return finalTransactions
}

const updateAdditionalTransactionData = async (
  depositTx: Transaction,
  l1Provider: Provider,
  l2Provider: Provider
) => {
  const depositTxReceipt = await l1Provider.getTransactionReceipt(
    depositTx.txID
  )

  // fetch L1 transaction receipt
  const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

  if (depositTx.assetName === AssetType.ETH) {
    const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2Provider)

    if (!ethDepositMessage) {
      return
    }

    const status = await ethDepositMessage.status()

    const isDeposited = status === EthDepositStatus.DEPOSITED

    const timestampCreated = depositTx.blockNumber
      ? (await l1Provider.getBlock(Number(depositTx.blockNumber))).timestamp *
        1000
      : new Date().toISOString()

    const retryableCreationTxID = ethDepositMessage.l2DepositTxHash

    const l2BlockNum = isDeposited
      ? (await l2Provider.getTransaction(retryableCreationTxID)).blockNumber
      : null

    const timestampResolved = l2BlockNum
      ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
      : null

    const updatedDepositTx = {
      ...depositTx,
      status: retryableCreationTxID ? 'success' : 'pending', // TODO :handle other cases here
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
    // fetch the token details like asset name and asset type
    const { name, symbol } = await getL1TokenData({
      account: depositTx.sender,
      erc20L1Address: depositTx.tokenAddress!,
      l1Provider,
      l2Provider
    })

    // fetch timestamp things
    const timestampCreated = depositTx.blockNumber
      ? (await l1Provider.getBlock(Number(depositTx.blockNumber))).timestamp *
        1000
      : new Date().toISOString()

    const updatedDepositTx = {
      ...depositTx,
      timestampCreated,
      asset: symbol,
      assetName: symbol,
      assetType: AssetType.ERC20
    }

    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
    if (!l1ToL2Msg) {
      return updatedDepositTx
    }

    const res = await l1ToL2Msg.waitForStatus()

    const l2TxID = (() => {
      if (res.status === L1ToL2MessageStatus.REDEEMED) {
        return res.l2TxReceipt.transactionHash
      } else {
        return undefined
      }
    })()

    const l1ToL2MsgData = {
      status: res.status,
      l2TxID,
      fetchingUpdate: false,
      retryableCreationTxID: l1ToL2Msg.retryableCreationId
    }

    const isDeposited =
      l1ToL2MsgData.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2

    const l2BlockNum = isDeposited
      ? (await l2Provider.getTransaction(l1ToL2Msg.retryableCreationId))
          .blockNumber
      : null

    const timestampResolved = l2BlockNum
      ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
      : null

    const completeDepositTx = {
      ...updatedDepositTx,
      status: l1ToL2Msg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
      timestampCreated,
      timestampResolved,
      l1ToL2MsgData: l1ToL2MsgData
    }

    return completeDepositTx
  }
}

export async function fetchERC20DepositsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<Transaction[]> {
  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL1SubgraphClient(l2ChainId).query({
    query: gql`
      {
        tokenDeposits(          
          where: {
            from: "${address}",
            blockCreatedAt_gte: ${fromBlock},
            blockCreatedAt_lte: ${toBlock}
            ${searchString ? `transactionHash_contains: "${searchString}"` : ''}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${pageSize},
          skip: ${pageNumber * pageSize}
        ) {
          transactionHash
          to
          timestamp
          sequenceNumber
          isClassic
          id
          from
          blockCreatedAt
          amount
          l1Token {
            id
            registeredAtBlock
            gateway {
              id
              registeredAtBlock
            }
          }
        }
      }
    `
  })

  const tokenDepositsFromSubgraph = res.data.tokenDeposits.map((tx: any) => ({
    type: 'deposit-l1',
    status: 'pending',
    value: utils.formatEther(tx.amount),
    txID: tx.transactionHash,
    tokenAddress: tx.l1Token.id,
    sender: address,
    l1NetworkID: String(l1ChainId),
    l2NetworkID: String(l2ChainId),
    blockNumber: tx.blockCreatedAt
  })) as unknown as Transaction[]

  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction
  // 3. once this is done, update the transactions someohow in the APP-STATE so that they start showing?
  const finalTransactions = (await Promise.all(
    tokenDepositsFromSubgraph.map(depositTx =>
      updateAdditionalTransactionData(depositTx, l1Provider, l2Provider)
    )
  )) as Transaction[]

  return finalTransactions
}
