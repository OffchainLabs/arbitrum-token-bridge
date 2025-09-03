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

// Create client instance that connects to the ponder indexer API
export const client = createClient('http://localhost:42069/sql', { schema })

// Export operators for building queries (these will be passed to the query functions)
export { eq, desc, and, gte, lte } from 'drizzle-orm'
