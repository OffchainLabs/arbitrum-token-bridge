import type { Transfer } from './types';
export declare const buildTransfersQuery: (address: string) => string;
export declare const executeGraphQLQuery: (apiUrl: string, query: string) => Promise<any>;
export declare const normalizeTransfers: (erc20Data: any[], ethData: any[]) => Transfer[];
export declare const categorizeTransfers: (transfers: Transfer[]) => {
    pending: Transfer[];
    completed: Transfer[];
};
