import { useQuery } from '@tanstack/react-query';
import { useArbitrumIndexerContext } from './context';
import { buildTransfersQuery, executeGraphQLQuery, normalizeTransfers, categorizeTransfers, } from './queries';
export function useArbitrumIndexer(address) {
    const { config } = useArbitrumIndexerContext();
    const { data: allTransfers, isLoading, isError, error, refetch, } = useQuery({
        queryKey: ['arbitrum-transfers', address],
        queryFn: async () => {
            const query = buildTransfersQuery(address);
            const result = await executeGraphQLQuery(config.apiUrl, query);
            const erc20Data = result.depositErc20s?.items || [];
            const ethData = result.depositEths?.items || [];
            return normalizeTransfers(erc20Data, ethData);
        },
        enabled: !!address && address.length === 42, // Valid Ethereum address
        refetchInterval: config.enableLiveUpdates ? config.pollInterval : false,
        staleTime: 30000, // Consider data stale after 30 seconds
    });
    // Categorize transfers into pending and completed
    const { pending: pendingTransfers, completed: completedTransfers } = categorizeTransfers(allTransfers || []);
    return {
        pendingTransfers,
        completedTransfers,
        isLoading,
        isError,
        error: error,
        refetch,
    };
}
