// tokens that can't be bridged to Arbitrum (maybe coz they have their native protocol bridges and custom implementation or they are being discontinued)
// the UI doesn't let users deposit such tokens. If bridged already, these can only be withdrawn.

import { ethers } from 'ethers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

import { isNetwork } from '../util/networks'
import { ChainId } from '../types/ChainId'
import {
  isTokenArbitrumOneUSDCe,
  isTokenArbitrumSepoliaUSDCe
} from './TokenUtils'
import { CommonAddress } from './CommonAddressUtils'

export type WithdrawOnlyToken = {
  symbol: string
  l2CustomAddr: string
  l1Address: string
  l2Address: string
}

export const withdrawOnlyTokens: { [chainId: number]: WithdrawOnlyToken[] } = {
  [ChainId.ArbitrumOne]: [
    {
      symbol: 'MIM',
      l2CustomAddr: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
      l1Address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
      l2Address: '0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2'
    },
    {
      symbol: 'SPA',
      l2CustomAddr: '0x5575552988A3A80504bBaeB1311674fCFd40aD4B',
      l1Address: '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008',
      l2Address: '0xe5a5Efe7ec8cdFA5F031D5159839A3b5E11B2e0F'
    },
    {
      symbol: 'FST',
      l2CustomAddr: '0x90e81b81307ece4257c1bb74bea94f5232cece53',
      l1Address: '0x0e192d382a36de7011f795acc4391cd302003606',
      l2Address: '0x488cc08935458403a0458e45E20c0159c8AB2c92'
    },
    {
      symbol: 'stETH',
      l2CustomAddr: '',
      l1Address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      l2Address: ''
    },
    {
      symbol: 'renBTC',
      l2CustomAddr: '0xdbf31df14b66535af65aac99c32e9ea844e14501',
      l1Address: '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
      l2Address: '0x3E06AF0fBB92D1f6e5c6008fcec81130D0cC65a3'
    },
    {
      symbol: 'STG',
      l2CustomAddr: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
      l1Address: '0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6',
      l2Address: '0xe018c7a3d175fb0fe15d70da2c874d3ca16313ec'
    },
    {
      symbol: 'HND',
      l2CustomAddr: '0x10010078a54396f62c96df8532dc2b4847d47ed3',
      l1Address: '0x10010078a54396F62c96dF8532dc2B4847d47ED3',
      l2Address: '0x626195b5a8b5f865E3516201D6ac30ee1B46A6e9'
    },
    {
      symbol: 'FRAX',
      l2CustomAddr: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      l1Address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
      l2Address: '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305'
    },
    {
      symbol: 'FXS',
      l2CustomAddr: '0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7',
      l1Address: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
      l2Address: '0xd9f9d2Ee2d3EFE420699079f16D9e924affFdEA4'
    },
    {
      symbol: 'gOHM',
      l2CustomAddr: '0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1',
      l1Address: '0x0ab87046fBb341D058F17CBC4c1133F25a20a52f',
      l2Address: '0x0D5f2b781A13722bA19e35857Fb6676594824960'
    },
    {
      symbol: 'alUSD',
      l2CustomAddr: '0xCB8FA9a76b8e203D8C3797bF438d8FB81Ea3326A',
      l1Address: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
      l2Address: '0x95d2C35934f4eA0076E6f5e8d6edd8080666F84e'
    },
    {
      symbol: 'alETH',
      l2CustomAddr: '',
      l1Address: '0x0100546F2cD4C9D97f798fFC9755E47865FF7Ee6',
      l2Address: '0xC05A105F4EC1ef28a4e7c0cb30Cb791B40FdD66B'
    },
    {
      symbol: 'gALCX',
      l2CustomAddr: '0x870d36B8AD33919Cc57FFE17Bb5D3b84F3aDee4f',
      l1Address: '0x93dede06ae3b5590af1d4c111bc54c3f717e4b35',
      l2Address: '0xEa4d9cE1fE1134528402A79f7B7Eacf87a930C8F'
    },
    {
      symbol: 'USX',
      l2CustomAddr: '0x641441c631e2f909700d2f41fd87f0aa6a6b4edb',
      l1Address: '0x0a5e677a6a24b2f1a2bf4f3bffc443231d2fdec8',
      l2Address: '0xcd14C3A2ba27819B352aae73414A26e2b366dC50'
    },
    {
      symbol: 'SYN',
      l2CustomAddr: '0x080f6aed32fc474dd5717105dba5ea57268f46eb',
      l1Address: '0x0f2d719407fdbeff09d87557abb7232601fd9f29',
      l2Address: '0x1bcfc0b4ee1471674cd6a9f6b363a034375ead84'
    },
    {
      symbol: 'EMAX',
      l2CustomAddr: '0x123389C2f0e9194d9bA98c21E63c375B67614108',
      l1Address: '0x15874d65e649880c2614e7a480cb7c9A55787FF6',
      l2Address: '0x94293e4e6ab410E898aa68318D0A964106Ff3257'
    },
    {
      symbol: 'RELAY',
      l2CustomAddr: '0x1426CF37CAA89628C4DA2864e40cF75E6d66Ac6b',
      l1Address: '0x5D843Fa9495d23dE997C394296ac7B4D721E841c',
      l2Address: '0xaFB5E28Be361248c18bf26647C3D0F1f141129a7'
    },
    {
      symbol: 'tBTC',
      l2CustomAddr: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
      l1Address: '0x18084fba666a33d37592fa2633fd49a74dd93a88',
      l2Address: '0x7E2a1eDeE171C5B19E6c54D73752396C0A572594'
    },
    {
      symbol: 'RDNT',
      l2CustomAddr: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
      l1Address: '0x137dDB47Ee24EaA998a535Ab00378d6BFa84F893',
      l2Address: '0xa4431f62db9955bfd056c30e5ae703bf0d0eaec8'
    },
    {
      symbol: 'eETH',
      l2CustomAddr: '',
      l1Address: '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
      l2Address: '0x832307742aACFe2b9680309526b4d8a409e274E0'
    },
    {
      symbol: 'rsETH',
      l2CustomAddr: '',
      l1Address: '0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7',
      l2Address: '0x3d19a8b57e8082c4bbd5e068016295cfdb255e6a'
    },
    {
      symbol: 'ETHx',
      l2CustomAddr: '',
      l1Address: '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b',
      l2Address: '0xaade6e725879375ba2b0ca608cfb26399d50a7ce'
    },
    {
      symbol: 'ezETH',
      l2CustomAddr: '0x2416092f143378750bb29b79eD961ab195CcEea5',
      l1Address: '0xbf5495efe5db9ce00f80364c8b423567e58d2110',
      l2Address: '0x6c2b260b7e4c4853a1227d9320c50e0b09917fa8'
    },
    {
      symbol: 'USDe',
      l2CustomAddr: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
      l1Address: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
      l2Address: '0x1FefA878e65998482C743eE2deDB907E4D9c8c34'
    },
    {
      symbol: 'sUSDe',
      l2CustomAddr: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
      l1Address: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      l2Address: '0x292CbA96fce24f6802dBdA021ED2B05481a3eEdF'
    },
    {
      symbol: 'GHO',
      l2CustomAddr: '',
      l1Address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f',
      l2Address: '0xfeb8670b834d9157864126f5dbd24b25d06882ad'
    },
    {
      symbol: 'ETHFI',
      l2CustomAddr: '0x7189fb5B6504bbfF6a852B13B7B82a3c118fDc27',
      l1Address: '0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB',
      l2Address: '0x07D65C18CECbA423298c0aEB5d2BeDED4DFd5736'
    },
    {
      symbol: 'ATH',
      l2CustomAddr: '0xc87B37a581ec3257B734886d9d3a581F5A9d056c',
      l1Address: '0xbe0Ed4138121EcFC5c0E56B40517da27E6c5226B',
      l2Address: '0xc7dEf82Ba77BAF30BbBc9b6162DC075b49092fb4'
    },
    {
      symbol: 'DMT',
      l2CustomAddr: '0x8B0E6f19Ee57089F7649A455D89D7bC6314D04e8',
      l1Address: '0x0B7f0e51Cd1739D6C96982D55aD8fA634dd43A9C',
      l2Address: '0x6Ab317237cc72B2cdb54EcfcC180b61E00F7df76'
    },
    {
      symbol: 'FLUID',
      l2CustomAddr: '',
      l1Address: '0x6f40d4a6237c257fff2db00fa0510deeecd303eb',
      l2Address: '0xae7d4bf2bb00a2f4ade1c726819fcaca0e517a5b'
    },
    // LayerZero tokens
    {
      symbol: 'GSWIFT',
      l2CustomAddr: '0x580e933d90091b9ce380740e3a4a39c67eb85b4c',
      l1Address: '0x580e933d90091b9ce380740e3a4a39c67eb85b4c',
      l2Address: '0x88e5369f73312eba739dcdf83bdb8bad3d08f4c8'
    },
    {
      symbol: 'ZRO',
      l2CustomAddr: '0x6985884c4392d348587b19cb9eaaf157f13271cd',
      l1Address: '0x6985884c4392d348587b19cb9eaaf157f13271cd',
      l2Address: '0xd99f14023f6bde3142d339b6c069b2b711da7e37'
    },
    {
      symbol: 'G3',
      l2CustomAddr: '0xc24A365A870821EB83Fd216c9596eDD89479d8d7',
      l1Address: '0xCF67815ccE72E682Eb4429eCa46843bed81Ca739',
      l2Address: '0x34fb4148fdc1ab3054ac85d32de887c58538bb57'
    },
    {
      symbol: 'mPendleOFT',
      l2CustomAddr: '',
      l1Address: '0x83e817E1574e2201a005EC0f7e700ED5606F555E',
      l2Address: '0x87ABaD012da6DcD0438e36967FcaD54C9d64F86C'
    },
    {
      symbol: 'Pepe',
      l2CustomAddr: '',
      l1Address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      l2Address: '0x35E6A59F786d9266c7961eA28c7b768B33959cbB'
    },
    {
      symbol: 'cbBTC',
      l2CustomAddr: '',
      l1Address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
      l2Address: '0x4A605F93288e95db40cE72934b888641D9689a48'
    },
    {
      symbol: 'NST',
      l2CustomAddr: '',
      l1Address: '0x70Bef3bB2f001dA2fDDb207dAe696cD9FAFf3f5d',
      l2Address: '0xd5A1a674F0DA33A4147a8Cd96143E598e738c7FF'
    },
    {
      symbol: 'USDS',
      l2CustomAddr: '0x6491c05A82219b8D1479057361ff1654749b876b',
      l1Address: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
      l2Address: '0x8aaf46581401660222bc82f60f8512eb55ee361b'
    },
    {
      symbol: 'sUSDS',
      l2CustomAddr: '0xdDb46999F8891663a8F2828d25298f70416d7610',
      l1Address: '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD',
      l2Address: '0x688c202577670fa1ae186c433965d178f26347f9'
    },
    {
      symbol: 'RLC',
      l2CustomAddr: '0xe649e6a1F2afc63ca268C2363691ceCAF75CF47C',
      l1Address: '0x607f4c5bb672230e8672085532f7e901544a7375',
      l2Address: '0xe575586566b02a16338c199c23ca6d295d794e66'
    }
  ],
  [ChainId.ArbitrumNova]: [],
  // Plume
  98866: [
    {
      symbol: 'USDC',
      l2CustomAddr: '',
      l1Address: CommonAddress.Ethereum.USDC,
      l2Address: '0x54FD4da2Fa19Cf0f63d8f93A6EA5BEd3F9C042C6'
    },
    {
      symbol: 'USDT',
      l2CustomAddr: '',
      l1Address: CommonAddress.Ethereum.USDT,
      l2Address: '0x7c5568fd326086D35B002Cc705C852dbaB7438a8'
    },
    {
      symbol: 'WETH',
      l2CustomAddr: '',
      l1Address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      l2Address: '0xEE9e50425E1599e4eC09f0a5F76Ce35A4924e4AC'
    }
  ]
}

async function isLayerZeroToken(
  parentChainErc20Address: string,
  parentChainId: number
) {
  const parentProvider = getProviderForChainId(parentChainId)

  // https://github.com/LayerZero-Labs/LayerZero-v2/blob/592625b9e5967643853476445ffe0e777360b906/packages/layerzero-v2/evm/oapp/contracts/oft/OFT.sol#L37
  const layerZeroTokenOftContract = new ethers.Contract(
    parentChainErc20Address,
    [
      'function oftVersion() external pure virtual returns (bytes4 interfaceId, uint64 version)'
    ],
    parentProvider
  )

  try {
    const _isLayerZeroToken = await layerZeroTokenOftContract.oftVersion()
    return !!_isLayerZeroToken
  } catch (error) {
    return false
  }
}

/**
 *
 * @param erc20L1Address
 * @param childChainId
 */
export async function isWithdrawOnlyToken({
  parentChainErc20Address,
  parentChainId,
  childChainId
}: {
  parentChainErc20Address: string
  parentChainId: number
  childChainId: number
}) {
  // disable USDC.e deposits for Orbit chains
  if (
    (isTokenArbitrumOneUSDCe(parentChainErc20Address) ||
      isTokenArbitrumSepoliaUSDCe(parentChainErc20Address)) &&
    isNetwork(childChainId).isOrbitChain
  ) {
    return true
  }

  const inWithdrawOnlyList = (withdrawOnlyTokens[childChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(parentChainErc20Address.toLowerCase())

  if (inWithdrawOnlyList) {
    return true
  }

  if (await isLayerZeroToken(parentChainErc20Address, parentChainId)) {
    return true
  }

  return false
}
