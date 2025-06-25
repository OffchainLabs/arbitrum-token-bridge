export interface Transfer {
    id: string;
    type: 'ETH' | 'ERC20';
    fromAddress: string;
    toAddress: string;
    tokenAddress?: string;
    amount: string;
    status: TransferStatus;
    timestamp: string;
    executionTimestamp?: string;
    txHash: string;
    childTxHash?: string;
    sequenceNumber: string;
    parentChainId: number;
    childChainId: number;
}
export type TransferStatus = 'PARENT_CHAIN_CONFIRMED' | 'CHILD_CHAIN_REDEMPTION_SCHEDULED' | 'CHILD_CHAIN_EXECUTED' | 'CHILD_CHAIN_NOT_FOUND' | 'CHILD_CHAIN_FAILED';
export interface UseArbitrumIndexerResult {
    pendingTransfers: Transfer[];
    completedTransfers: Transfer[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}
export interface ArbitrumIndexerConfig {
    apiUrl?: string;
    pollInterval?: number;
    enableLiveUpdates?: boolean;
}
