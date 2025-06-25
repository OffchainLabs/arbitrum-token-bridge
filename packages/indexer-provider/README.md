# @arbitrum/indexer-provider

A React provider and hooks for easily integrating with Arbitrum transfer data using Ponder's indexing infrastructure.

## Installation

```bash
npm install @arbitrum/indexer-provider
# or
pnpm add @arbitrum/indexer-provider
```

## Quick Start

### 1. Setup Provider

Wrap your app with the `ArbitrumIndexerProvider`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PonderProvider } from '@ponder/react';
import { ArbitrumIndexerProvider } from '@arbitrum/indexer-provider';
import { client } from './lib/ponder'; // Your ponder client

const queryClient = new QueryClient();

function App() {
  return (
    <PonderProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <ArbitrumIndexerProvider ponderClient={client} queryClient={queryClient}>
          {/* Your app components */}
        </ArbitrumIndexerProvider>
      </QueryClientProvider>
    </PonderProvider>
  );
}
```

### 2. Use the Hook

```tsx
import { useArbitrumIndexer } from '@arbitrum/indexer-provider';

function TransfersComponent() {
  const { pendingTransfers, completedTransfers, isLoading, error } = 
    useArbitrumIndexer('0x179A862703a4adfb29896552DF9e307980D19285');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Pending Transfers: {pendingTransfers.length}</h3>
      <h3>Completed Transfers: {completedTransfers.length}</h3>
    </div>
  );
}
```

## Features

- **Live Updates**: Real-time transfer data with automatic polling
- **Unified API**: ETH and ERC20 transfers in the same format
- **Smart Categorization**: Automatically splits pending vs completed transfers
- **Type Safe**: Full TypeScript support
- **Easy Setup**: One provider, one hook, minimal configuration

## API

### `useArbitrumIndexer(address: string)`

Returns transfer data for the given Ethereum address.

**Returns:**
```typescript
{
  pendingTransfers: Transfer[];    // Transfers waiting for execution
  completedTransfers: Transfer[];  // Successfully executed transfers
  isLoading: boolean;             // Loading state
  isError: boolean;               // Error state
  error: Error | null;            // Error details
  refetch: () => void;           // Manual refresh function
}
```

### Configuration

```tsx
<ArbitrumIndexerProvider 
  ponderClient={client} 
  queryClient={queryClient}
  config={{
    apiUrl: 'http://localhost:42069',    // Ponder API URL
    pollInterval: 5000,                  // Polling interval (ms)
    enableLiveUpdates: true              // Enable/disable live updates
  }}
>
```

## Dependencies

- React 19+
- @tanstack/react-query 5+
- @ponder/client 0.11+
- @ponder/react 0.11+

## License

MIT 