import { ethers } from 'ethers'
import { ChainId } from '../types/ChainId'
import { CommonAddress } from '../util/CommonAddressUtils'
import { BigNumber } from 'ethers'

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
  [ChainId.Holesky]: {
    lzEndpointId: 40217,
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
  to: string
  amountLD: string
  minAmountLD: string
  extraOptions: string
  composeMsg: string
  oftCmd: string
}

interface QuoteResult {
  nativeFee: string
  lzTokenFee: string
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
  destinationAddress?: string
}): SendParam {
  return {
    dstEid,
    to: ethers.utils.hexZeroPad(destinationAddress ?? address, 32),
    amountLD: amount.toString(),
    minAmountLD: amount.toString(),
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x'
  }
}

export async function getOftV2Quote({
  contract,
  sendParams
}: {
  contract: ethers.Contract
  sendParams: SendParam
}): Promise<QuoteResult> {
  const quote = await contract.quoteSend(sendParams, false)
  return {
    nativeFee: quote.nativeFee.toString(),
    lzTokenFee: quote.lzTokenFee.toString()
  }
}
