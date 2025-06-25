import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
const ArbitrumIndexerContext = createContext(null);
const defaultConfig = {
    apiUrl: 'http://localhost:42069',
    pollInterval: 5000,
    enableLiveUpdates: true,
};
export function ArbitrumIndexerProvider({ children, ponderClient, queryClient, config = {} }) {
    const mergedConfig = { ...defaultConfig, ...config };
    const value = {
        ponderClient,
        queryClient,
        config: mergedConfig,
    };
    return (_jsx(ArbitrumIndexerContext.Provider, { value: value, children: children }));
}
export function useArbitrumIndexerContext() {
    const context = useContext(ArbitrumIndexerContext);
    if (!context) {
        throw new Error('useArbitrumIndexerContext must be used within an ArbitrumIndexerProvider');
    }
    return context;
}
