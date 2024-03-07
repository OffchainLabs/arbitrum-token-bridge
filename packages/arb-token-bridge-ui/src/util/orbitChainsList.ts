import { constants } from '@arbitrum/sdk'
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

type OrbitChainConfig = ChainWithRpcUrl & { bridgeUiConfig: BridgeUiConfig }

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
