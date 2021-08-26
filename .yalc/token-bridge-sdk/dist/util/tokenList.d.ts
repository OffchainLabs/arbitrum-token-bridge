interface TokenData {
    name: string;
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    logoURI?: string;
}
interface NetWorkTokens {
    whiteList: TokenData[];
    blackList: TokenData[];
}
declare type TokenLists = {
    [key: string]: NetWorkTokens;
};
export declare const tokenLists: TokenLists;
export declare enum TokenStatus {
    WHITELISTED = 0,
    BLACKLISTED = 1,
    NEUTRAL = 2
}
export declare const getTokenStatus: (_tokenAddress: string, network: string) => TokenStatus;
export {};
