import { ethers } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { ChainId } from '../types/ChainId'
import { CommonAddress } from '../util/CommonAddressUtils'

const USDT_ETH_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'

// from https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
export const lzProtocolConfig = {
  [ChainId.Ethereum]: {
    lzEndpointId: 30101,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
    oftAdapters: {
      [CommonAddress.Ethereum.USDT]:
        '0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee'
    }
  },
  [ChainId.Sepolia]: {
    lzEndpointId: 40161,
    endpointV2: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  [ChainId.Holesky]: {
    lzEndpointId: 40217,
    endpointV2: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  [ChainId.ArbitrumOne]: {
    lzEndpointId: 30110,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
    oftAdapters: {
      [CommonAddress.ArbitrumOne.USDT]:
        '0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92'
    }
  },
  [ChainId.ArbitrumSepolia]: {
    lzEndpointId: 30101,
    endpointV2: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  [ChainId.ArbitrumNova]: {
    lzEndpointId: 40231,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c'
  }
}

export type ValidateOftTransferParams = {
  sourceChainId: number
  destinationChainId: number
  tokenAddress?: string
  sourceChainProvider: Provider
}

export async function validateOftTransfer({
  sourceChainId,
  destinationChainId,
  tokenAddress,
  sourceChainProvider
}: ValidateOftTransferParams): Promise<boolean> {
  // Check if both source and destination chains are supported by LayerZero
  const isSourceChainSupported = sourceChainId in lzProtocolConfig
  const isDestinationChainSupported = destinationChainId in lzProtocolConfig

  if (!isSourceChainSupported || !isDestinationChainSupported) {
    return false
  }

  // Check if we have a token address
  if (!tokenAddress) {
    return false
  }

  // USDT on Ethereum is not an OFT, but it will support OFT transfers
  if (tokenAddress.toLowerCase() === USDT_ETH_ADDRESS.toLowerCase()) {
    return true
  }

  // Check if the token is an OFT
  return isLayerZeroToken(tokenAddress, sourceChainProvider)
}

export async function isLayerZeroToken(
  parentChainErc20Address: string,
  parentProvider: Provider
) {
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
