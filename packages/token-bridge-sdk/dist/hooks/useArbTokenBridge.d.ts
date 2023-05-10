import { JsonRpcProvider } from '@ethersproject/providers';
import { L1Network, L2Network } from '@arbitrum/sdk';
import { ArbTokenBridge, L2ToL1EventResult } from './arbTokenBridge.types';
export declare const wait: (ms?: number) => Promise<unknown>;
export declare function getExecutedMessagesCacheKey({ event, l2ChainId }: {
    event: L2ToL1EventResult;
    l2ChainId: number;
}): string;
export interface TokenBridgeParams {
    walletAddress: string;
    l1: {
        provider: JsonRpcProvider;
        network: L1Network;
    };
    l2: {
        provider: JsonRpcProvider;
        network: L2Network;
    };
}
export declare const useArbTokenBridge: (params: TokenBridgeParams) => ArbTokenBridge;
