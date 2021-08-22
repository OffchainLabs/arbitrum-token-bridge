import { mainnetBlackList } from './mainnnetTokenLists';
const mainnetWhitelist = [
    '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    '0x514910771af9ca656af840dff83e8264ecf986ca',
    '0x2ba592f78db6436527729929aaf6c908497cb200',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    '0x6810e776880c02933d47db1b9fc05908e5386b96',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879',
    '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    '0x23A941036Ae778Ac51Ab04CEa08Ed6e2FE103614',
    '0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1',
    '0xf4D48Ce3ee1Ac3651998971541bAdbb9A14D7234'
];
const tokenLists = {
    '1': {
        whiteList: mainnetWhitelist,
        blackList: mainnetBlackList
            .map(a => a.address.toLocaleLowerCase())
            .map(a => a.toLocaleLowerCase())
    },
    '42': {
        whiteList: [
            '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25',
            '0xe41d965f6e7541139f8d9f331176867fb6972baf'
        ].map(a => a.toLocaleLowerCase()),
        blackList: [''].map(a => a.toLocaleLowerCase())
    }
};
export var TokenStatus;
(function (TokenStatus) {
    TokenStatus[TokenStatus["WHITELISTED"] = 0] = "WHITELISTED";
    TokenStatus[TokenStatus["BLACKLISTED"] = 1] = "BLACKLISTED";
    TokenStatus[TokenStatus["NEUTRAL"] = 2] = "NEUTRAL";
})(TokenStatus || (TokenStatus = {}));
export const getTokenStatus = (_tokenAddress, network) => {
    const tokenAddress = _tokenAddress.toLocaleLowerCase();
    const list = tokenLists[network];
    if (!list) {
        return TokenStatus.NEUTRAL;
    }
    if (list.whiteList.includes(tokenAddress)) {
        return TokenStatus.WHITELISTED;
    }
    else if (list.blackList.includes(tokenAddress)) {
        return TokenStatus.BLACKLISTED;
    }
    else {
        return TokenStatus.NEUTRAL;
    }
};
