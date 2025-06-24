import { createClient } from '@ponder/client'

// Import the schema from the indexer package
// For now, we'll use a simple schema definition since we can't directly import
// from the indexer due to module resolution issues
const schema = {
  DepositErc20: {
    id: '',
    fromAddress: '',
    toAddress: '',
    l1TokenAddress: '',
    amount: 0n,
    statusOnChildChain: '',
    parentChainTimestamp: 0n
  },
  DepositEth: {
    id: '',
    parentChainSenderAddress: '',
    childChainRecipientAddress: '',
    ethAmountDepositedToChildChain: 0n,
    statusOnChildChain: '',
    parentChainTimestamp: 0n
  }
}

// Create client instance that connects to the ponder indexer API
export const client = createClient('http://localhost:42069/sql', { schema })

// Export operators for building queries (these will be passed to the query functions)
export { eq, desc, and, gte, lte } from 'drizzle-orm'
