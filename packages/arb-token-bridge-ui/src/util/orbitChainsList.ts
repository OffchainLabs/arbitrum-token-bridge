import { constants } from '@arbitrum/sdk'
import { l2Networks } from '@arbitrum/sdk/dist/lib/dataEntities/networks'
import { NativeCurrencyBase } from '../hooks/useNativeCurrency'
import { ChainWithRpcUrl } from './networks'

export type NetworkType =
  | 'Ethereum'
  | 'Rollup'
  | 'AnyTrust'
  | 'Ethereum Testnet'
  | 'Arbitrum Testnet'

export type BridgeUiConfig = {
  color: `#${string}`
  network: {
    name: string
    logo: string
    description?: string
  }
  nativeTokenData?: NativeCurrencyBase
}

export type OrbitChainConfig = ChainWithRpcUrl & {
  bridgeUiConfig: BridgeUiConfig
}

export const orbitMainnets: {
  [key: number]: OrbitChainConfig
} = {
  660279: {
    chainID: 660279,
    confirmPeriodBlocks: 45818,
    ethBridge: {
      bridge: '0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f',
      inbox: '0xaE21fDA3de92dE2FDAF606233b2863782Ba046F9',
      outbox: '0x1E400568AD4840dbE50FB32f306B842e9ddeF726',
      rollup: '0xC47DacFbAa80Bd9D8112F4e8069482c2A3221336',
      sequencerInbox: '0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1'
    },
    nativeToken: '0x4Cb9a7AE498CEDcBb5EAe9f25736aE7d428C9D66',
    explorerUrl: 'https://explorer.xai-chain.net',
    rpcUrl: 'https://xai-chain.net/rpc',
    isArbitrum: true,
    isCustom: true,
    name: 'Xai',
    slug: 'xai',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0xb15A0826d65bE4c2fDd961b72636168ee70Af030',
      l1ERC20Gateway: '0xb591cE747CF19cF30e11d656EB94134F523A9e77',
      l1GatewayRouter: '0x22CCA5Dc96a4Ac1EC32c9c7C5ad4D66254a24C35',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0x041f85dd87c46b941dc9b15c6628b19ee5358485',
      l1Weth: '0x0000000000000000000000000000000000000000',
      l1WethGateway: '0x0000000000000000000000000000000000000000',
      l2CustomGateway: '0x96551194230725c72ACF8E9573B1382CCBC70635',
      l2ERC20Gateway: '0x0c71417917D24F4A6A6A55559B98c5cCEcb33F7a',
      l2GatewayRouter: '0xd096e8dE90D34de758B0E0bA4a796eA2e1e272cF',
      l2Multicall: '0xEEC168551A85911Ec3A905e0561b656979f3ea67',
      l2ProxyAdmin: '0x56800fDCFbE19Ea3EE9d115dAC30d95d6459c44E',
      l2Weth: '0x0000000000000000000000000000000000000000',
      l2WethGateway: '0x0000000000000000000000000000000000000000'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#F30019',
      network: {
        name: 'Xai',
        logo: '/images/XaiLogo.svg',
        description:
          'A chain for Web2 and Web3 gamers to play blockchain games.'
      },
      nativeTokenData: {
        name: 'Xai',
        symbol: 'XAI',
        decimals: 18,
        logoUrl: '/images/XaiLogo.svg'
      }
    }
  },
  1380012617: {
    chainID: 1380012617,
    confirmPeriodBlocks: 45818,
    ethBridge: {
      bridge: '0x255f80Ef2F09FCE0944faBb292b8510F01316Cf0',
      inbox: '0x37e60F80d921dc5E7f501a7130F31f6548dBa564',
      outbox: '0x91591BB66075BCfF94AA128B003134165C3Ab83a',
      rollup: '0x2e988Ea0873C9d712628F0bf38DAFdE754927C89',
      sequencerInbox: '0xA436f1867adD490BF1530c636f2FB090758bB6B3'
    },
    explorerUrl: 'https://mainnet.explorer.rarichain.org',
    rpcUrl: 'https://mainnet.rpc.rarichain.org/http',
    isArbitrum: true,
    isCustom: true,
    name: 'RARI Mainnet',
    slug: 'rari-mainnet',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x8bE956aB42274056ef4471BEb211b33e258b7324',
      l1ERC20Gateway: '0x46406c88285AD9BE2fB23D9aD96Cb578d824cAb6',
      l1GatewayRouter: '0x2623C144B4d167f70893f6A8968B98c89a6C5F97',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0x003e70b041abb993006c03e56c8515622a02928c',
      l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      l1WethGateway: '0x8DF47DAe3313663C80f5E94A893190710A719224',
      l2CustomGateway: '0x90E43f5d772e50B01B3F9596f65AD5653467d010',
      l2ERC20Gateway: '0x0CA4c24079a191e08F659699292e5C75274EF253',
      l2GatewayRouter: '0x9a2859B2a83148b8DE25d26643B5407555D219E1',
      l2Multicall: '0x4c753F58Ee9E83B38170abAbBEa8B47976C7ee1b',
      l2ProxyAdmin: '0x18AB1fE7CBeB5F40d2eAf8A3906A966d59E79767',
      l2Weth: '0xf037540e51D71b2D2B1120e8432bA49F29EDFBD0',
      l2WethGateway: '0xd0C21F7960ea9835E7B2E636548f4deDD9E2309C'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#B16EFF',
      network: {
        name: 'RARI Mainnet',
        description:
          'A chain designed specifically for NFT royalties and creator empowerment.',
        logo: '/images/RARIMainnetLogo.svg'
      }
    }
  },
  4078: {
    chainID: 4078,
    confirmPeriodBlocks: 7200,
    ethBridge: {
      bridge: '0xB0EC3C1368AF7d9C2CAE6B7f8E022Cc14d59D2b1',
      inbox: '0x18BB8310E3a3DF4EFcCb6B3E9AeCB8bE6d4af07f',
      outbox: '0xD17550876106645988051ffDd31dFc3cDaA29F9c',
      rollup: '0x73CA76d9B04661604fF950fB8DBc9f18F1B853f1',
      sequencerInbox: '0xfb27e42E964F3364630F76D62EB295ae792BD4FA'
    },
    explorerUrl: 'https://muster-explorer.alt.technology',
    rpcUrl: 'https://muster.alt.technology',
    isArbitrum: true,
    isCustom: true,
    name: 'Muster',
    slug: 'muster',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x6085B32d97be137cC2D6447DcB3BF684C0835D2F',
      l1ERC20Gateway: '0x6551eF99126253B7a838Cf46340030C8eD5342c2',
      l1GatewayRouter: '0x5040981c42fD61219cc567e255129166A840938e',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0x37119EAcFBc1c83DDAf80F6705b6B19630C101C4',
      l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      l1WethGateway: '0x5e833dd255e2aafFcfB32E874F5e2dFA17A109Ee',
      l2CustomGateway: '0x9FcC7aC2c40eFD0443D8B641e482F04310F113f6',
      l2ERC20Gateway: '0xFdEb5b89bb8FCA61BF77f205B9F89aC3C5fA5dB8',
      l2GatewayRouter: '0xDcF4964Dbb526e91CD6354ac3d1247Ce93C21fc4',
      l2Multicall: '0xaA6669a609862871ce72c91a93E70F1ef7590271',
      l2ProxyAdmin: '0xf10D50B24eDd74ECF3B6Bc22aE74b7F9843e0fDD',
      l2Weth: '0x869Bf8814d77106323745758135b999D34C79a87',
      l2WethGateway: '0xB6145BFd3fA9D270871037238003c66B984787f4'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#DF62DD',
      network: {
        name: 'Muster Network',
        description: 'A gaming chain with cheap fees and account abstraction.',
        logo: '/images/MusterLogo.svg'
      }
    }
  },
  70700: {
    chainID: 70700,
    confirmPeriodBlocks: 40320,
    ethBridge: {
      bridge: '0x074fFD20C6D8865752C997f4980Cf70F2a3Fbac6',
      inbox: '0xC3874bE54E3f25BBC6B4fB582654fd9294f485a1',
      outbox: '0x0cD85675897B7020d7121e63AB250d3F47ff3Ff2',
      rollup: '0x65AD139061B3f6DDb16170a07b925337ddf42407',
      sequencerInbox: '0xa58F38102579dAE7C584850780dDA55744f67DF1'
    },
    explorerUrl: 'https://explorer.apex.proofofplay.com',
    rpcUrl: 'https://rpc.apex.proofofplay.com',
    isArbitrum: true,
    isCustom: true,
    name: 'Proof of Play Apex',
    slug: 'pop-apex',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x653f8D34a86207569069164d45a031eE552A4729',
      l1ERC20Gateway: '0x298eb8d9f2F046AC60c01535fad40320CCdeB7c0',
      l1GatewayRouter: '0x2f883c5997Cf60B4d52a2fD4039918E1f9D1147c',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0xCC6f49cff395c4d160C61112522700dcB007c41d',
      l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      l1WethGateway: '0xEB2Ae03709f63CEa9E5eC6ab25C1838c4A5634BA',
      l2CustomGateway: '0x1a4ba648Ddc0E726085A847178eBff204411EB1A',
      l2ERC20Gateway: '0x7aEdD5a2F3bBd4841711D017Edf90d611aD96a9e',
      l2GatewayRouter: '0x33e59640CD7E5C5E8D43fd46d995efDdDd0Fc930',
      l2Multicall: '0xEB4150a4F26Cf3563B3a86965E269C8873D48527',
      l2ProxyAdmin: '0x518e5FA773118b779a6231303f5593A10D3B3c84',
      l2Weth: '0x77684A04145a5924eFCE0D92A7c4a2A2E8C359de',
      l2WethGateway: '0x6e965dd667cb08f09DE8285317f012Ac889507b4'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#3E63DD',
      network: {
        name: 'Proof of Play Apex',
        description:
          "Apex is the first chain in Proof of Play's Multichain, powering the popular Pirate Nation game.",
        logo: '/images/PopApexLogo.svg'
      }
    }
  },
  42001: {
    chainID: 42001,
    confirmPeriodBlocks: 7200,
    ethBridge: {
      bridge: '0x10B25719f4c0fA1BFF22431438E6b6315059548A',
      inbox: '0x1285D6cE3604D341b29ccfF300d043af1CDb57e3',
      outbox: '0x32005e1Ca72cDaAADc2BCFb5E37cc8B2bdb30c60',
      rollup: '0x5c6f7a6CC67F35d8d9A02521E69B80915DA13748',
      sequencerInbox: '0x58b38152Dc53Aab5F6c41f33AA543E224a7FF709'
    },
    nativeToken: '0xBC9B77acA82f6BE43927076D71cd453b625165B8',
    explorerUrl: 'https://explorer.pmon.xyz',
    rpcUrl: 'https://rpc.pmon.xyz',
    isArbitrum: true,
    isCustom: true,
    name: 'PMON Chain',
    slug: 'pmon-chain',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x38727FfD8aFAdaeF60687D1E623Fd28B58A2B8a8',
      l1ERC20Gateway: '0x341F7f035f1CBA1E879Df40117f797F88aC703ea',
      l1GatewayRouter: '0xAE4BAD578fff3377FC5Ebfd4d52d3fdd7FAB3017',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0x50AD12758e5e6320d658B358C731AF6C7FE2b853',
      l1Weth: '0x0000000000000000000000000000000000000000',
      l1WethGateway: '0x0000000000000000000000000000000000000000',
      l2CustomGateway: '0xed609532adB4B24cd580d042A05ef15d914Bb7b0',
      l2ERC20Gateway: '0x8624C8046AA1E619528adA4Fa894E431b7CCE139',
      l2GatewayRouter: '0x1d55e424757817CBd27caD7169FE462d6703c57d',
      l2Multicall: '0xB019E8B9448138251a9C58af34FcCd276cE733f6',
      l2ProxyAdmin: '0x8699E41Ed6246708035f7B2E1bf194D9C6Fb7d32',
      l2Weth: '0x0000000000000000000000000000000000000000',
      l2WethGateway: '0x0000000000000000000000000000000000000000'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#FF3369',
      network: {
        name: 'PMON Chain',
        description:
          'Bridge to PMON Chain for strategic, fully on-chain monster battles and start building your ultimate NFT collection.',
        logo: '/images/PolychainMonstersLogo.png'
      },
      nativeTokenData: {
        name: 'Polkamon',
        symbol: 'PMON',
        decimals: 18,
        logoUrl: '/images/PolychainMonstersLogo.png'
      }
    }
  },
  12324: {
    chainID: 12324,
    confirmPeriodBlocks: 7200,
    ethBridge: {
      bridge: '0x59E088d827CB7983Cd0CC64312E472D7cc8a4F44',
      inbox: '0x80de5c4ccDfb7b6a250A9588C2d80F62a2B7d13F',
      outbox: '0x1526DAacDAf3EE81E5ae087E0DA8677E8c677CE5',
      rollup: '0xb75A0a5812303cBB198d4f0BcA7CA38f17b8783e',
      sequencerInbox: '0xB9450b512Fd3454e9C1a2593C5DF9E71344b5653'
    },
    explorerUrl: 'https://explorer.l3x.com',
    rpcUrl: 'https://rpc-mainnet.l3x.com',
    isArbitrum: true,
    isCustom: true,
    name: 'L3X Network',
    slug: 'l3x-network',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0xec80A45ebadD945379f69e9A8929973BCb3E297D',
      l1ERC20Gateway: '0x4fF3E70f30f0394Ad62428751Fe3858740595908',
      l1GatewayRouter: '0x817C8Da480bC6b42a5FA88A26e9eD8c0c03968Cf',
      l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
      l1ProxyAdmin: '0x0000000000000000000000000000000000000000',
      l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      l1WethGateway: '0x9bd7C6d040665E95a4FE70b61718abca2E3A62CD',
      l2CustomGateway: '0x1AE90d0FBf03d1bb0685D4bAc5BCe4F4071cB0dc',
      l2ERC20Gateway: '0x76df9F5004F38aC74D0cE664027a1E718AA45E97',
      l2GatewayRouter: '0x460E0a28a1DcE5a15811C3F5775D1e8fd0a08278',
      l2Multicall: '0xA9cfB51510b18300cf056d7e0b96925a1D11f424',
      l2ProxyAdmin: '0xFB027dBD2FBb343FD16D66a63a690B29D51D23AA',
      l2Weth: '0xD3f8b9D33b159E8f5141d28880b216d31B00ee63',
      l2WethGateway: '0x0fEf8843450b7c6a416C30D1E00cbc535Bb905b6'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#3ABE7B',
      network: {
        name: 'L3X Network',
        description:
          'Leverage LRTs to earn yield and trade perpetuals on L3X Layer 3 Network.',
        logo: '/images/L3XLogo.png'
      }
    }
  },
  94524: {
    chainID: 94524,
    confirmPeriodBlocks: 40320,
    ethBridge: {
      bridge: '0x2Be65c5b58F78B02AB5c0e798A9ffC181703D3C1',
      inbox: '0xE961Ef06c26D0f032F0298c97C41e648d3bb715a',
      outbox: '0x0b8071337dcB089478Ea740efC10904d9F359141',
      rollup: '0xeb61c3FA03544021cf76412eFb9D0Ce7D8c0290d',
      sequencerInbox: '0x47861E0419BE83d0175818a09221B6DF2EFD7793'
    },
    explorerUrl: 'https://xchain-explorer.idex.io',
    rpcUrl: 'https://xchain-rpc.idex.io',
    isArbitrum: true,
    isCustom: true,
    name: 'XCHAIN',
    slug: 'xchain',
    partnerChainID: 1,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0xEFb1F8ae759c595907782e9bD45F119c9814b308',
      l1ERC20Gateway: '0xFFb821ca61e823a884D79226B0fcD7a99A4d48aa',
      l1GatewayRouter: '0xe0a99350288971456EE4BAc4568495352929B769',
      l1MultiCall: '0x7cdCB0Cc61f47B8Dd8f47C5A29edaDd84a1BDf5e',
      l1ProxyAdmin: '0x22010F5C4c106dfBaffec780196d2F691860Ff62',
      l1Weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      l1WethGateway: '0xCAde60b1331f1cF714ECb01f08117780887A0AF4',
      l2CustomGateway: '0x642e40E3F9948F11E18973f79E910f0953dd0C80',
      l2ERC20Gateway: '0xBF14b5F058AE33469eC2D20c9Ee712Cb7eC68A8b',
      l2GatewayRouter: '0xe95788E89383447177312846DB45E6bffc32DD3b',
      l2Multicall: '0x9eE16369804735D75944AA3B025B063C31862786',
      l2ProxyAdmin: '0xc5A8e16EADC3276B3DdB9F122e2c824Dc8a87BfD',
      l2Weth: '0x594Ee2FA451dC7aCFC6785c0d746695f79A4daeE',
      l2WethGateway: '0x377880CbbA57EB9ACb7120028f21Ce043266A431'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#FD0598',
      network: {
        name: 'XCHAIN',
        description:
          'XCHAIN powers IDEX, the premier omnichain perpetuals exchange, combining industry-leading speed and performance with transparency and security to create an entirely new trading experience.',
        logo: '/images/XCHAINLogo.png'
      }
    }
  },
  1996: {
    chainID: 1996,
    confirmPeriodBlocks: 20,
    ethBridge: {
      bridge: '0x2f285781B8d58678a3483de52D618198E4d27532',
      inbox: '0x718E2a83775343d5c0B1eE0676703cBAF30CaFCD',
      outbox: '0x575d32f7ff0C72921645e302cb14d2757E300786',
      rollup: '0x9A59EdF7080fdA05396373a85DdBf2cEBDB81Cd4',
      sequencerInbox: '0x24B68936C13A414cd91437aE7AA730321B9ff159'
    },
    nativeToken: '0x8B0E6f19Ee57089F7649A455D89D7bC6314D04e8',
    explorerUrl: 'https://explorer.sanko.xyz',
    rpcUrl: 'https://mainnet.sanko.xyz',
    isArbitrum: true,
    isCustom: true,
    name: 'Sanko',
    slug: 'sanko',
    partnerChainID: 42161,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x5414Dc7c8DB4BeDbf3c772768aE1F5e984bdf47a',
      l1ERC20Gateway: '0xb4951c0C41CFceB0D195A95FE66280457A80a990',
      l1GatewayRouter: '0x847186fbeEBf41eEe9c230360D0bF8585c0Db57B',
      l1MultiCall: '0x909b042B88F587d745dBF52e2569545376f6eAA4',
      l1ProxyAdmin: '0xd18b1C6376633000c85541F7c15c591Ffe5f9556',
      l1Weth: '0x0000000000000000000000000000000000000000',
      l1WethGateway: '0x0000000000000000000000000000000000000000',
      l2CustomGateway: '0x5dd84FB52A27B9D5b760b0373fDeda52D10d3c4a',
      l2ERC20Gateway: '0xAf574BbE2139e39F560C4db1A118E1245aC0983d',
      l2GatewayRouter: '0x505421b85ae7F906e8807bf59ee3Da62e894CDC3',
      l2Multicall: '0x446696a44B13D7B03dBEe837610692d2A71D6232',
      l2ProxyAdmin: '0xa2A055fa56b7B4d36F0320c5c65562854873e5B2',
      l2Weth: '0x0000000000000000000000000000000000000000',
      l2WethGateway: '0x0000000000000000000000000000000000000000'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#0367FF',
      network: {
        name: 'Sanko',
        logo: '/images/SankoLogo.png',
        description:
          'Sanko Mainnet is an Orbit L3 chain - home to SankoPets and much more.'
      },
      nativeTokenData: {
        name: 'DMT',
        symbol: 'DMT',
        decimals: 18,
        logoUrl: '/images/SankoLogo.png'
      }
    }
  }
}

export const orbitTestnets: { [key in number]: OrbitChainConfig } = {
  37714555429: {
    chainID: 37714555429,
    confirmPeriodBlocks: 150,
    ethBridge: {
      bridge: '0x6c7FAC4edC72E86B3388B48979eF37Ecca5027e6',
      inbox: '0x6396825803B720bc6A43c63caa1DcD7B31EB4dd0',
      outbox: '0xc7491a559b416540427f9f112C5c98b1412c5d51',
      rollup: '0xeedE9367Df91913ab149e828BDd6bE336df2c892',
      sequencerInbox: '0x529a2061A1973be80D315770bA9469F3Da40D938'
    },
    nativeToken: '0x4e6f41acbfa8eb4a3b25e151834d9a14b49b69d2',
    explorerUrl: 'https://testnet-explorer-v2.xai-chain.net',
    rpcUrl: 'https://testnet-v2.xai-chain.net/rpc',
    isArbitrum: true,
    isCustom: true,
    name: 'Xai Testnet',
    slug: 'xai-testnet',
    partnerChainID: 421614,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x04e14E04949D49ae9c551ca8Cc3192310Ce65D88',
      l1ERC20Gateway: '0xCcB451C4Df22addCFe1447c58bC6b2f264Bb1256',
      l1GatewayRouter: '0x185b868DBBF41554465fcb99C6FAb9383E15f47A',
      l1MultiCall: '0xA115146782b7143fAdB3065D86eACB54c169d092',
      l1ProxyAdmin: '0x022c515aEAb29aaFf82e86A10950cE14eA89C9c5',
      l1Weth: '0x0000000000000000000000000000000000000000',
      l1WethGateway: '0x0000000000000000000000000000000000000000',
      l2CustomGateway: '0xea1ce1CC75C948488515A3058E10aa82da40cE8F',
      l2ERC20Gateway: '0xD840761a09609394FaFA3404bEEAb312059AC558',
      l2GatewayRouter: '0x3B8ba769a43f34cdD67a20aF60d08D54C9C8f1AD',
      l2Multicall: '0x5CBd60Ae5Af80A42FA8b0F20ADF95A8879844984',
      l2ProxyAdmin: '0x7C1BA251d812fb34aF5C2566040C3C30585aFed9',
      l2Weth: '0x0000000000000000000000000000000000000000',
      l2WethGateway: '0x0000000000000000000000000000000000000000'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#F30019',
      network: {
        name: 'Xai Testnet',
        logo: '/images/XaiLogo.svg',
        description: 'The testnet for Xai’s gaming chain.'
      },
      nativeTokenData: {
        name: 'Xai',
        symbol: 'sXAI',
        decimals: 18,
        logoUrl: '/images/XaiLogo.svg'
      }
    }
  },
  53457: {
    chainID: 53457,
    confirmPeriodBlocks: 150,
    ethBridge: {
      bridge: '0xC0856971702b02A5576219540BD92DAE79a79288',
      inbox: '0xD62ef8d8c71d190417C6CE71f65795696C069f09',
      outbox: '0xaEB5Fe2f7003881c3a8EBAE9664E8607f3935d53',
      rollup: '0xBc4cc964eF0ea5792a398F9E738edf368A34f003',
      sequencerInbox: '0x67ad6c79E33eA9e523E0e68961456d0ac7A973Cc'
    },
    nativeToken: '0xAC716E87b0853C0712674e8E3a8435a489F276b4',
    explorerUrl: 'https://testnet-scan.dodochain.com',
    rpcUrl: 'https://dodochain-testnet.alt.technology',
    isArbitrum: true,
    isCustom: true,
    name: 'DODOchain Testnet',
    slug: 'dodochain-testnet',
    partnerChainID: 421614,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0xeCa856BE0041184eeda8F2c98896AC4693b168EA',
      l1ERC20Gateway: '0xf57F874845CD652e69f69f020A4d46F4e427bb43',
      l1GatewayRouter: '0xE3661c8313B35BA310Ad89e113561F3C983dC761',
      l1MultiCall: '0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1',
      l1ProxyAdmin: '0x0000000000000000000000000000000000000000',
      l1Weth: '0x0000000000000000000000000000000000000000',
      l1WethGateway: '0x0000000000000000000000000000000000000000',
      l2CustomGateway: '0x6B8C4aD57806fB4563031B79348bcC4CC3bBa7D5',
      l2ERC20Gateway: '0xBb94635f882f03f7641B742F5e3070e6B5108b71',
      l2GatewayRouter: '0x14De2d9c4C7F5ad2d134Eb746207653797693C0D',
      l2Multicall: '0xF6Fd6C87C4cac9A4BF4b6fF4efa4B06bdbbe5D51',
      l2ProxyAdmin: '0x80C5A0C4004B4130b823AfE8D97aAeA3fBFf3fCc',
      l2Weth: '0x0000000000000000000000000000000000000000',
      l2WethGateway: '0x0000000000000000000000000000000000000000'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#B88B1E',
      network: {
        name: 'DODOchain Testnet',
        logo: '/images/DODOchain.png',
        description: 'An Omni-Trading Layer3 Powered by Arbitrum Orbit.'
      },
      nativeTokenData: {
        name: 'Berd',
        symbol: 'BERD',
        decimals: 18,
        logoUrl: ''
      }
    }
  },
  12325: {
    chainID: 12325,
    confirmPeriodBlocks: 150,
    ethBridge: {
      bridge: '0x98DBc5f9d4BB16A7c8C21e36789E673b6E0FDf37',
      inbox: '0xB0e78299F14b50d151a5eF92b6465bb807B6e56b',
      outbox: '0x243487a26284B17b70E8A183a7a1FeB5A6b00824',
      rollup: '0xce99C9E7566438a8311424aD0287EB0fDEAc55A2',
      sequencerInbox: '0xd598F60Ae694bE2aF9D6933aD9e9f7A431A2005E'
    },
    explorerUrl: 'https://explorer-testnet.l3x.com',
    rpcUrl: 'https://rpc-testnet.l3x.com',
    isArbitrum: true,
    isCustom: true,
    name: 'L3X Network Testnet',
    slug: 'l3x-network-testnet',
    partnerChainID: 421614,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x00eE97A18A85a58fbfddA2CCa2Bdb3B88d1068b3',
      l1ERC20Gateway: '0xD2e9EA14CE4C61630a87bC652f5cD51deA7C66bA',
      l1GatewayRouter: '0x8D684F7fA0aE2a13e0a1FAa60699ee2db46505a8',
      l1MultiCall: '0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1',
      l1ProxyAdmin: '0x0000000000000000000000000000000000000000',
      l1Weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      l1WethGateway: '0xB001D0E3a43EbB820E82720a2Bd74f4C03a5b424',
      l2CustomGateway: '0xcc3fa38D4a18474DF92107d328bF4A6F7C9fA29A',
      l2ERC20Gateway: '0x7aeD67245Db9b4E6bB26791b48E20aBbA9411EdD',
      l2GatewayRouter: '0xF40E36d3043373Ce6F89abe3914d631135342C28',
      l2Multicall: '0xa8D4b59f0FB23CB785d360E73C7364dDB3e34A62',
      l2ProxyAdmin: '0xC381Ff423f37d42b0b9B84195D9C9C31eDc26e73',
      l2Weth: '0x6793D074d3A410C803B8C2086E569883D6e928F1',
      l2WethGateway: '0x4F24D0244B29d76ED1FBD3c8a9967b72b78B9DBd'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#3ABE7B',
      network: {
        name: 'L3X Network Testnet',
        logo: '/images/L3XLogo.png',
        description:
          'Leverage LRTs to earn yield and trade perpetuals on L3X Layer 3 Network.'
      }
    }
  },
  1918988905: {
    chainID: 1918988905,
    confirmPeriodBlocks: 64,
    ethBridge: {
      bridge: '0x55f0a866E9A5B59Eab0269D62d121BC0978a4346',
      inbox: '0xb6534cB24b925b58dfD811a0090f24C7aD52cA78',
      outbox: '0x4d8679Db1058b0F8CaE84485F6B760a858CeCA10',
      rollup: '0x2EeDc7b995267aa1060587Ff2585690C204E7e5c',
      sequencerInbox: '0xf0d96B3a783F04620D5CBbf2829E70CEe396403F'
    },
    explorerUrl: 'https://testnet.explorer.rarichain.org',
    rpcUrl: 'https://testnet.rpc.rarichain.org/http',
    isArbitrum: true,
    isCustom: true,
    name: 'RARI Testnet',
    slug: 'rari-testnet',
    partnerChainID: 421614,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0x7EDA0d4c14Af6B0920F4e3C0F0cA18d18212fB0A',
      l1ERC20Gateway: '0x2c9Dd2b2cd55266e3b5c3C95840F3c037fbCb856',
      l1GatewayRouter: '0xece5902AD6Bbf4689EA8aD4B95237fAf5B65FB26',
      l1MultiCall: '0x6550ef0Ff640fDD871C9321D2483801c891D7d54',
      l1ProxyAdmin: '0x311C5Fe27874FBc8ea9D06BeDA2ff316E37c3E2f',
      l1Weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      l1WethGateway: '0x1A0d79b35953fDA4F2b7A3B0BC893C767AAe44aE',
      l2CustomGateway: '0x311C5Fe27874FBc8ea9D06BeDA2ff316E37c3E2f',
      l2ERC20Gateway: '0x68b350501592a1501ffc2C8f1B28Ca896253fFe8',
      l2GatewayRouter: '0x52d17dcd26F9B19A2672dC79686f1279391Aa449',
      l2Multicall: '0x1A0d79b35953fDA4F2b7A3B0BC893C767AAe44aE',
      l2ProxyAdmin: '0x25Da52b43f252Bc52Ce038a7541eCC62b9347229',
      l2Weth: '0x2c9Dd2b2cd55266e3b5c3C95840F3c037fbCb856',
      l2WethGateway: '0xece5902AD6Bbf4689EA8aD4B95237fAf5B65FB26'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: '#B16EFF',
      network: {
        name: 'RARI Testnet',
        description:
          'A testnet chain designed specifically for NFT royalties and creator empowerment.',
        logo: '/images/RARIMainnetLogo.svg'
      }
    }
  }
}

export const orbitChains = { ...orbitMainnets, ...orbitTestnets }

export function getOrbitChains(
  {
    mainnet,
    testnet
  }: {
    mainnet: boolean
    testnet: boolean
  } = { mainnet: true, testnet: true }
): OrbitChainConfig[] {
  const mainnetChains = mainnet ? Object.values(orbitMainnets) : []
  const testnetChains = testnet ? Object.values(orbitTestnets) : []

  return [...mainnetChains, ...testnetChains]
}

export function getInboxAddressFromOrbitChainId(chainId: number) {
  return (
    l2Networks[chainId]?.ethBridge.inbox ?? // for stylus testnet v2
    getOrbitChains().find(chain => chain.chainID === chainId)?.ethBridge.inbox // for other custom orbit chains
  )
}

export function getChainIdFromInboxAddress(inboxAddress: string) {
  return getOrbitChains().find(
    chain => chain.ethBridge.inbox.toLowerCase() === inboxAddress.toLowerCase()
  )?.chainID
}
