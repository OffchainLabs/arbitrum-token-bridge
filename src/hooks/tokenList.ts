
interface NetWorkTokens{
    whiteList: string[],
    blackList: string[]
}

export type network = 'mainnet' | 'kovan'

type TokenLists = {
    [key in network]: NetWorkTokens
}
const tokenLists: TokenLists =  {
    mainnet: {
        whiteList: [""].map((a)=> a.toLocaleLowerCase()),
        blackList: ["0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", "0xfF20817765cB7f73d4bde2e66e067E58D11095C2"].map((a)=> a.toLocaleLowerCase())
    },
    kovan: {
        whiteList: ["0xf36d7a74996e7def7a6bd52b4c2fe64019dada25", "0xe41d965f6e7541139f8d9f331176867fb6972baf"].map((a)=> a.toLocaleLowerCase()),
        blackList: [""].map((a)=> a.toLocaleLowerCase())
    }
};

export enum TokenStatus {
    WHITELISTED,
    BLACKLISTED,
    NEUTRAL
}

export const getTokenStatus = (_tokenAddress: string, network: network)=>{
    const tokenAddress = _tokenAddress.toLocaleLowerCase()
    const list = tokenLists[network]
    if(list.whiteList.includes(tokenAddress)){
        return TokenStatus.WHITELISTED
    } else if (list.blackList.includes(tokenAddress)){
        return TokenStatus.BLACKLISTED
    } else {
        return TokenStatus.NEUTRAL
    }

}
