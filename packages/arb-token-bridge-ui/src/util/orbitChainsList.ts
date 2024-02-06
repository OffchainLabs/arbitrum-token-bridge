import { constants } from '@arbitrum/sdk'
import { NativeCurrencyBase } from '../hooks/useNativeCurrency'
import { ChainWithRpcUrl } from './networks'

export type NetworkType = 'Ethereum' | 'Rollup' | 'AnyTrust'

export type BridgeUiConfig = {
  color: {
    primary: `#${string}`
    secondary: `#${string}`
  }
  network: {
    type?: NetworkType
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
      color: {
        primary: '#F30019',
        secondary: '#87000E'
      },
      network: {
        type: 'AnyTrust',
        name: 'Xai',
        logo: '/images/XaiLogo.svg',
        description:
          'Web2 gamers can own and trade in-game items, without the need to interact with crypto-wallets.'
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
      color: {
        primary: '#B16EFF',
        secondary: '#1E1E1E'
      },
      network: {
        name: 'RARI Mainnet',
        logo: '/images/RARIMainnetLogo.svg'
      }
    }
  }
}

export const orbitTestnets: { [key in number]: OrbitChainConfig } = {
  47279324479: {
    chainID: 47279324479,
    confirmPeriodBlocks: 20,
    ethBridge: {
      bridge: '0xf958e56d431eA78C7444Cf6A6184Af732Ae6a8A3',
      inbox: '0x8b842ad88AAffD63d52EC54f6428fb7ff83060a8',
      outbox: '0xDfe36Bea935F11260b0159dCA255b6668925d743',
      rollup: '0x082742561295f6e1b43c4f5d1e2d52d7FfE082f1',
      sequencerInbox: '0x5fD0cCc5D31748A44b43cf8DFBFA0FAA32665464'
    },
    explorerUrl: 'https://testnet-explorer.xai-chain.net',
    rpcUrl: 'https://testnet.xai-chain.net/rpc',
    isArbitrum: true,
    isCustom: true,
    name: 'Xai Orbit Testnet',
    slug: 'xai-testnet',
    partnerChainID: 421613,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '0xdBbDc3EE848C05792CC93EA140c59731f920c3F2',
      l1ERC20Gateway: '0xC033fBAFd978440460d943efe6A3bF6A1a990e80',
      l1GatewayRouter: '0xCb0Fe28c36a60Cf6254f4dd74c13B0fe98FFE5Db',
      l1MultiCall: '0x21779e0950A87DDD57E341d54fc12Ab10F6eE167',
      l1ProxyAdmin: '0xc80853e91f8Ac0AaD6ff939F3861600Ab34Dfe12',
      l1Weth: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
      l1WethGateway: '0x58ea20BE21b971Fa282905EdA74bA46540eEd977',
      l2CustomGateway: '0xc60622D1FbDD63Cf9c173D1b69715Ef2B725D792',
      l2ERC20Gateway: '0x47ab2DfD627360fC6ac4Ae2fB9fa6f3539aFfeCc',
      l2GatewayRouter: '0x75c2848D0B2116d6832Ff3758df09D4209b4b7ce',
      l2Multicall: '0xE2fBe979bD0df59554Fded36f3A3BF5206f287a2',
      l2ProxyAdmin: '0x81DeEc20158a367f7039ab3a563C1eB63cc2b3D6',
      l2Weth: '0xea77c06A6703A781f9442EFa083e21F3F75907F8',
      l2WethGateway: '0x927b59cCde7a92acDa085514FdEA39f0c4D1a2DC'
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    bridgeUiConfig: {
      color: {
        primary: '#F30019',
        secondary: '#87000E'
      },
      network: {
        type: 'AnyTrust',
        name: 'Xai Testnet',
        logo: '/images/XaiLogo.svg',
        description:
          'Web2 gamers can own and trade in-game items, without the need to interact with crypto-wallets.'
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
