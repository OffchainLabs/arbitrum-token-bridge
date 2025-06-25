import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import type { Client } from '@ponder/client';
import type { ArbitrumIndexerConfig } from './types';

interface ArbitrumIndexerContextValue {
  ponderClient: Client<any>;
  queryClient: QueryClient;
  config: ArbitrumIndexerConfig;
}

const ArbitrumIndexerContext = createContext<ArbitrumIndexerContextValue | null>(null);

interface ArbitrumIndexerProviderProps {
  children: ReactNode;
  ponderClient: Client<any>;
  queryClient: QueryClient;
  config?: ArbitrumIndexerConfig;
}

const defaultConfig: ArbitrumIndexerConfig = {
  apiUrl: 'http://localhost:42069',
  pollInterval: 5000,
  enableLiveUpdates: true,
};

export function ArbitrumIndexerProvider({ 
  children, 
  ponderClient, 
  queryClient, 
  config = {} 
}: ArbitrumIndexerProviderProps) {
  const mergedConfig = { ...defaultConfig, ...config };

  const value: ArbitrumIndexerContextValue = {
    ponderClient,
    queryClient,
    config: mergedConfig,
  };

  return (
    <ArbitrumIndexerContext.Provider value={value}>
      {children}
    </ArbitrumIndexerContext.Provider>
  );
}

export function useArbitrumIndexerContext(): ArbitrumIndexerContextValue {
  const context = useContext(ArbitrumIndexerContext);
  if (!context) {
    throw new Error(
      'useArbitrumIndexerContext must be used within an ArbitrumIndexerProvider'
    );
  }
  return context;
} 