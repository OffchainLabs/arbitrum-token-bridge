import { createClient, type Client } from '@ponder/client'

// Import the schema from the indexer package
// For now, we'll use a simple schema definition since we can't directly import
// from the indexer due to module resolution issues
const schema = {
  DepositErc20: {
    id: '',
    fromAddress: '',
    toAddress: '',
    l1TokenAddress: '',
    amount: BigInt(0),
    statusOnChildChain: '',
    parentChainTimestamp: BigInt(0)
  },
  DepositEth: {
    id: '',
    parentChainSenderAddress: '',
    childChainRecipientAddress: '',
    ethAmountDepositedToChildChain: BigInt(0),
    statusOnChildChain: '',
    parentChainTimestamp: BigInt(0)
  }
}

const DEFAULT_INDEXER_API_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ?? 'https://arbitrum-indexer.fly.dev'

const normalizeIndexerUrl = (apiUrl: string) => apiUrl.replace(/\/$/, '')

export const getIndexerApiUrl = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_INDEXER_API_URL
  }

  const query = new URLSearchParams(window.location.search)
  return query.get('indexerUrl') ?? DEFAULT_INDEXER_API_URL
}

export const createIndexerClient = (apiUrl: string): Client<any> => {
  const normalizedUrl = normalizeIndexerUrl(apiUrl)
  return createClient(`${normalizedUrl}/sql`, { schema })
}

// Export operators for building queries (these will be passed to the query functions)
export { eq, desc, and, gte, lte } from 'drizzle-orm'
