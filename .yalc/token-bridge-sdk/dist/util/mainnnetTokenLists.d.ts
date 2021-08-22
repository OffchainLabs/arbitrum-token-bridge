export declare const mainnetWhitelist: {
    name: string;
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    logoURI: string;
}[];
export declare const mainnetBlackList: ({
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    tags?: undefined;
} | {
    chainId: number;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: undefined;
    tags?: undefined;
} | {
    name: string;
    decimals: number;
    symbol: string;
    address: string;
    chainId: number;
    logoURI: string;
    tags: string[];
} | {
    name: string;
    decimals: number;
    symbol: string;
    address: string;
    chainId: number;
    tags: string[];
    logoURI?: undefined;
})[];
