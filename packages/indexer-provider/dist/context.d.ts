import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import type { Client } from '@ponder/client';
import type { ArbitrumIndexerConfig } from './types';
interface ArbitrumIndexerContextValue {
    ponderClient: Client<any>;
    queryClient: QueryClient;
    config: ArbitrumIndexerConfig;
}
interface ArbitrumIndexerProviderProps {
    children: ReactNode;
    ponderClient: Client<any>;
    queryClient: QueryClient;
    config?: ArbitrumIndexerConfig;
}
export declare function ArbitrumIndexerProvider({ children, ponderClient, queryClient, config }: ArbitrumIndexerProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useArbitrumIndexerContext(): ArbitrumIndexerContextValue;
export {};
