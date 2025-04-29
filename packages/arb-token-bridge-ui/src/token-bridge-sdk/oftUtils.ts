import { ethers } from 'ethers'
import { ChainId } from '../types/ChainId'
import { CommonAddress } from '../util/CommonAddressUtils'
import { BigNumber } from 'ethers'
import { Address } from 'wagmi'
import { ReadContractResult, readContract } from '@wagmi/core'
import { oftV2Abi } from './oftV2Abi'

// from https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
const oftProtocolConfig: {
  [id: number]: {
    lzEndpointId: number
    endpointV2: string
    peerToken?: { [id: string]: string }
    adapterConfig?: {
      [id: string]: { oftAdapterEndpoint: string }
    }
  }
} = {
  [ChainId.Ethereum]: {
    lzEndpointId: 30101,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
    adapterConfig: {
      [CommonAddress.Ethereum.USDT]: {
        oftAdapterEndpoint: '0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee'
      }
    }
  },
  [ChainId.Sepolia]: {
    lzEndpointId: 40161,
    endpointV2: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  [ChainId.ArbitrumOne]: {
    lzEndpointId: 30110,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
    adapterConfig: {
      [CommonAddress.ArbitrumOne.USDT]: {
        oftAdapterEndpoint: '0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92'
      }
    }
  },
  [ChainId.ArbitrumSepolia]: {
    lzEndpointId: 40231,
    endpointV2: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  [ChainId.ArbitrumNova]: {
    lzEndpointId: 30175,
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c'
  }
}

export function getOftV2TransferConfig({
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address
}: {
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
}):
  | { isValid: false }
  | {
      isValid: true
      sourceChainAdapterAddress: string
      destinationChainLzEndpointId: number
    } {
  if (!sourceChainErc20Address) {
    return {
      isValid: false
    }
  }
  const sourceChainOftAdapterConfig =
    oftProtocolConfig[sourceChainId]?.adapterConfig?.[sourceChainErc20Address]

  const destinationChainLzEndpointId =
    oftProtocolConfig[destinationChainId]?.lzEndpointId

  if (!sourceChainOftAdapterConfig || !destinationChainLzEndpointId) {
    return {
      isValid: false
    }
  }

  return {
    isValid: true,
    sourceChainAdapterAddress: sourceChainOftAdapterConfig.oftAdapterEndpoint,
    destinationChainLzEndpointId
  }
}
interface SendParam {
  dstEid: number
  to: Address
  amountLD: BigNumber
  minAmountLD: BigNumber
  extraOptions: `0x${string}`
  composeMsg: `0x${string}`
  oftCmd: `0x${string}`
}

export function buildSendParams({
  dstEid,
  address,
  amount,
  destinationAddress
}: {
  dstEid: number
  address: string
  amount: BigNumber
  destinationAddress: string | undefined
}): SendParam {
  return {
    dstEid,
    to: ethers.utils.hexZeroPad(destinationAddress ?? address, 32) as Address,
    amountLD: amount,
    minAmountLD: amount,
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x'
  }
}

type QuoteResult = ReadContractResult<typeof oftV2Abi, 'quoteSend'>
export async function getOftV2Quote({
  address,
  sendParams,
  chainId
}: {
  address: Address
  sendParams: SendParam
  chainId: number
}): Promise<QuoteResult> {
  const quote = await readContract({
    address,
    abi: oftV2Abi,
    functionName: 'quoteSend',
    chainId,
    args: [sendParams, false]
  })
  return {
    nativeFee: quote.nativeFee,
    lzTokenFee: quote.lzTokenFee
  }
}

export const getChainIdFromEid = (eid: number) => {
  const chainId = Object.keys(oftProtocolConfig).find(
    key => oftProtocolConfig[Number(key)]?.lzEndpointId === eid
  )

  if (!chainId) {
    return null
  }

  return Number(chainId)
}
