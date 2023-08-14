import {
  ApolloClient,
  ApolloQueryResult,
  gql,
  HttpLink,
  InMemoryCache
} from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { DepositStatus, MergedTransaction } from '../../../state/app/state'
import { getStandardizedTimestamp } from '../../../state/app/utils'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { ChainId, isNetwork } from '../../../util/networks'

const subgraphUrl = process.env.NEXT_PUBLIC_CCTP_SUBGRAPH_BASE_URL
if (!subgraphUrl) {
  console.error('NEXT_PUBLIC_CCTP_SUBGRAPH_BASE_URL variable missing.')
  throw new Error('NEXT_PUBLIC_CCTP_SUBGRAPH_BASE_URL variable missing.')
}

export function getSubgraphClient(subgraph: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `${subgraphUrl}${subgraph}`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

// Extending the standard NextJs request with CCTP params
export type NextApiRequestWithCCTPParams = NextApiRequest & {
  query: {
    walletAddress: `0x${string}`
    l1ChainId: string
    pageNumber?: string
    pageSize?: string
    searchString?: string
  }
}

export enum ChainDomain {
  Mainnet = 0,
  ArbitrumOne = 3
}

export type MessageReceived = {
  blockNumber: string
  blockTimestamp: string
  caller: `0x${string}`
  id: string
  messageBody: string
  nonce: string
  sender: `0x${string}`
  sourceDomain: `${ChainDomain}`
  transactionHash: `0x${string}`
}

export type MessageSent = {
  attestationHash: `0x${string}`
  blockNumber: string
  blockTimestamp: string
  id: string
  message: string
  nonce: string
  sender: `0x${string}`
  recipient: `0x${string}`
  sourceDomain: `${ChainDomain}`
  transactionHash: `0x${string}`
  amount: string
}

type PendingCCTPTransfer = {
  messageSent: MessageSent
}

type CompletedCCTPTransfer = PendingCCTPTransfer & {
  messageReceived: MessageReceived
}

export type Response =
  | {
      data: {
        pending: MergedTransaction[]
        completed: MergedTransaction[]
      }
      error: null
    }
  | {
      data: {
        pending: []
        completed: []
      }
      error: string
    }

export type CCTPSupportedChainId =
  | ChainId.Mainnet
  | ChainId.Goerli
  | ChainId.ArbitrumOne
  | ChainId.ArbitrumGoerli

function getSourceChainIdFromSourceDomain(
  sourceDomain: ChainDomain,
  l1ChainId: ChainId
): CCTPSupportedChainId {
  const { isTestnet } = isNetwork(l1ChainId)

  console.log(sourceDomain, isTestnet, l1ChainId)
  // Deposits
  if (sourceDomain === ChainDomain.Mainnet) {
    return isTestnet ? ChainId.Goerli : ChainId.Mainnet
  }

  // Withdrawals
  return isTestnet ? ChainId.ArbitrumGoerli : ChainId.ArbitrumOne
}

export function getUsdcTokenAddressFromSourceChainId(
  sourceChainId: CCTPSupportedChainId
) {
  return {
    [ChainId.Mainnet]: CommonAddress.Mainnet.USDC,
    [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDC,
    [ChainId.Goerli]: CommonAddress.Goerli.USDC,
    [ChainId.ArbitrumGoerli]: CommonAddress.ArbitrumGoerli.USDC
  }[sourceChainId]
}
function parseTransferToMergedTransaction(
  transfer: PendingCCTPTransfer | CompletedCCTPTransfer,
  l1ChainId: ChainId,
  isPending: boolean
): MergedTransaction {
  const depositStatus = isPending
    ? DepositStatus.CCTP_SOURCE_SUCCESS
    : DepositStatus.CCTP_DESTINATION_SUCCESS

  const { messageSent } = transfer
  let status = 'Unconfirmed'
  let resolvedAt = null
  let receiveMessageTransactionHash = null
  let receiveMessageTimestamp = null

  if ('messageReceived' in transfer) {
    const { messageReceived } = transfer
    status = 'Executed'
    resolvedAt = getStandardizedTimestamp(
      (parseInt(messageReceived.blockTimestamp, 10) * 1_000).toString()
    )
    receiveMessageTransactionHash = messageReceived.transactionHash
    receiveMessageTimestamp = getStandardizedTimestamp(
      messageReceived.blockTimestamp
    )
  }
  const sourceChainId = getSourceChainIdFromSourceDomain(
    parseInt(messageSent.sourceDomain, 10),
    l1ChainId
  )
  const isDeposit =
    parseInt(messageSent.sourceDomain, 10) === ChainDomain.Mainnet

  return {
    sender: messageSent.sender,
    destination: messageSent.recipient,
    direction: isDeposit ? 'deposit' : 'withdraw',
    status,
    createdAt: getStandardizedTimestamp(
      (parseInt(messageSent.blockTimestamp, 10) * 1_000).toString()
    ),
    resolvedAt,
    txId: messageSent.transactionHash,
    asset: 'USDC',
    value: messageSent.amount,
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: parseInt(messageSent.blockNumber, 10),
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
    depositStatus,
    isCctp: true,
    cctpData: {
      sourceChainId,
      attestationHash: messageSent.attestationHash,
      messageBytes: messageSent.message,
      receiveMessageTransactionHash,
      receiveMessageTimestamp
    }
  }
}

export default async function handler(
  req: NextApiRequestWithCCTPParams,
  res: NextApiResponse<Response>
) {
  try {
    const {
      walletAddress,
      l1ChainId: l1ChainIdString,
      pageNumber = '0',
      pageSize = '10',
      type,
      searchString = ''
    } = req.query
    const l1ChainId = parseInt(l1ChainIdString, 10)

    if (
      typeof type !== 'string' ||
      (type !== 'deposits' && type !== 'withdrawals')
    ) {
      res.status(400).send({
        error: `invalid API route: ${type}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    // validate method
    if (req.method !== 'GET') {
      res.status(400).send({
        error: `invalid_method: ${req.method}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!walletAddress) errorMessage.push('<walletAddress> is required')

    if (errorMessage.length) {
      res.status(400).json({
        error: `incomplete request: ${errorMessage.join(', ')}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    const l1Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'cctp-mainnet' : 'cctp-goerli'
    )
    const l2Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'cctp-arb-one' : 'cctp-arb-goerli'
    )

    const messagesSentQuery = gql(`{
        messageSents(
          where: {
            sender: "${walletAddress}"
            ${searchString ? `transactionHash_contains: "${searchString}"` : ''}
          }
          orderDirection: "desc"
          orderBy: "blockTimestamp"
          first: ${Number(pageSize)}
          skip: ${Number(pageNumber) * Number(pageSize)}
        ) {
          attestationHash
          blockNumber
          blockTimestamp
          id
          message
          nonce
          sender
          recipient
          sourceDomain
          transactionHash
          amount
        }
      }`)

    let messagesSentResult: ApolloQueryResult<{ messageSents: MessageSent[] }>
    if (type === 'deposits') {
      messagesSentResult = await l1Subgraph.query({ query: messagesSentQuery })
    } else {
      messagesSentResult = await l2Subgraph.query({ query: messagesSentQuery })
    }
    const { messageSents } = messagesSentResult.data
    const messagesSentIds = messageSents.map(messageSent => messageSent.id)
    const formatedIds = messagesSentIds.map(
      messageSentId => `"${messageSentId}"`
    )

    const messagesReceivedQuery = gql(`{
        messageReceiveds(
          where: {id_in: [${formatedIds.join(',')}]}
          orderDirection: "desc"
          orderBy: "blockTimestamp"
        ) {
          id
          caller
          sourceDomain
          nonce
          blockTimestamp
          blockNumber
          messageBody
          sender
          transactionHash
        }
      }
    `)

    let messagesReceivedResult: ApolloQueryResult<{
      messageReceiveds: MessageReceived[]
    }>
    if (type === 'deposits') {
      messagesReceivedResult = await l2Subgraph.query({
        query: messagesReceivedQuery
      })
    } else {
      messagesReceivedResult = await l1Subgraph.query({
        query: messagesReceivedQuery
      })
    }

    const { messageReceiveds } = messagesReceivedResult.data

    // MessagesSent can be link to MessageReceived with the tuple (sourceDomain, nonce)
    // Map constructor accept an array of [key, value] arrays
    // new Map(['key1', 'value1'], ['key2', 'value2'], ['keyN', 'valueN']) would return
    // Map(3) {'key1' => 'value1', 'key2' => 'value2', 'keyN' => 'valueN'}
    // We create a map with all keys being MessagesReceived ids, and values being the corresponding MessageReceived
    const messagesReceivedMap = new Map(
      messageReceiveds.map(messageReceived => [
        messageReceived.id,
        messageReceived
      ])
    )

    const { pending, completed } = messageSents.reduce(
      (acc, messageSent) => {
        // If the MessageSent has a corresponding MessageReceived
        const messageReceived = messagesReceivedMap.get(messageSent.id)
        if (messageReceived) {
          acc.completed.push(
            parseTransferToMergedTransaction(
              { messageSent, messageReceived },
              l1ChainId,
              false
            )
          )
        } else {
          acc.pending.push(
            parseTransferToMergedTransaction({ messageSent }, l1ChainId, true)
          )
        }
        return acc
      },
      { completed: [], pending: [] } as {
        completed: MergedTransaction[]
        pending: MergedTransaction[]
      }
    )

    res.status(200).json({
      data: {
        pending,
        completed
      },
      error: null
    })
  } catch (error: unknown) {
    res.status(500).json({
      data: {
        pending: [],
        completed: []
      },
      error: (error as Error)?.message ?? 'Something went wrong'
    })
  }
}
