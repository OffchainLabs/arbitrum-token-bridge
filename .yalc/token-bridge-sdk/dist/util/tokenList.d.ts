export declare enum TokenStatus {
    WHITELISTED = 0,
    BLACKLISTED = 1,
    NEUTRAL = 2
}
export declare const getTokenStatus: (_tokenAddress: string, network: string) => TokenStatus;
