import {
  Config,
  readContract,
  simulateContract,
  writeContract
} from '@wagmi/core'
import { TokenMinterAbi } from '../util/cctp/TokenMinterAbi'
import { ChainDomain } from '../app/api/cctp/[type]'

import { MessageTransmitterAbi } from '../util/cctp/MessageTransmitterAbi'
import { CCTPSupportedChainId } from '../state/cctpState'
import { ChainId } from '../types/ChainId'
import { CommonAddress } from '../util/CommonAddressUtils'
import { Address } from '../util/AddressUtils'

// see https://developers.circle.com/stablecoin/docs/cctp-protocol-contract
type Contracts = {
  tokenMessengerContractAddress: Address
  targetChainDomain: ChainDomain
  targetChainId: CCTPSupportedChainId
  usdcContractAddress: Address
  messageTransmitterContractAddress: Address
  attestationApiUrl: string
  tokenMinterContractAddress: Address
}

const contracts: Record<CCTPSupportedChainId, Contracts> = {
  [ChainId.Ethereum]: {
    tokenMessengerContractAddress:
      CommonAddress.Ethereum.tokenMessengerContractAddress,
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumOne,
    usdcContractAddress: CommonAddress.Ethereum.USDC,
    messageTransmitterContractAddress:
      '0xc30362313fbba5cf9163f0bb16a0e01f01a896ca',
    attestationApiUrl: 'https://iris-api.circle.com/v1',
    tokenMinterContractAddress: '0xc4922d64a24675e16e1586e3e3aa56c06fabe907'
  },
  [ChainId.Sepolia]: {
    tokenMessengerContractAddress:
      CommonAddress.Sepolia.tokenMessengerContractAddress,
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumSepolia,
    usdcContractAddress: CommonAddress.Sepolia.USDC,
    messageTransmitterContractAddress:
      '0xacf1ceef35caac005e15888ddb8a3515c41b4872',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com/v1',
    tokenMinterContractAddress: '0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a'
  },
  [ChainId.ArbitrumOne]: {
    tokenMessengerContractAddress:
      CommonAddress.ArbitrumOne.tokenMessengerContractAddress,
    targetChainDomain: ChainDomain.Ethereum,
    targetChainId: ChainId.Ethereum,
    usdcContractAddress: CommonAddress.ArbitrumOne.USDC,
    messageTransmitterContractAddress:
      '0x0a992d191deec32afe36203ad87d7d289a738f81',
    attestationApiUrl: 'https://iris-api.circle.com/v1',
    tokenMinterContractAddress: '0xe7ed1fa7f45d05c508232aa32649d89b73b8ba48'
  },
  [ChainId.ArbitrumSepolia]: {
    tokenMessengerContractAddress:
      CommonAddress.ArbitrumSepolia.tokenMessengerContractAddress,
    targetChainDomain: ChainDomain.Ethereum,
    targetChainId: ChainId.Sepolia,
    usdcContractAddress: CommonAddress.ArbitrumSepolia.USDC,
    messageTransmitterContractAddress:
      '0x7865fafc2db2093669d92c0f33aeef291086befd',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com/v1',
    tokenMinterContractAddress: '0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a'
  }
}

export type AttestationResponse =
  | {
      attestation: Address
      status: 'complete'
    }
  | {
      attestation: null
      status: 'pending_confirmations'
    }

export function getCctpContracts({
  sourceChainId
}: {
  sourceChainId?: ChainId
}) {
  if (!sourceChainId) {
    return contracts[ChainId.Ethereum]
  }
  return (
    contracts[sourceChainId as CCTPSupportedChainId] ||
    contracts[ChainId.Ethereum]
  )
}

export function fetchPerMessageBurnLimit({
  sourceChainId,
  wagmiConfig
}: {
  sourceChainId: CCTPSupportedChainId
  wagmiConfig: Config
}) {
  const { usdcContractAddress, tokenMinterContractAddress } = getCctpContracts({
    sourceChainId
  })

  return readContract(wagmiConfig, {
    address: tokenMinterContractAddress,
    chainId: sourceChainId,
    abi: TokenMinterAbi,
    functionName: 'burnLimitsPerMessage',
    args: [usdcContractAddress]
  })
}

export const getCctpUtils = ({ sourceChainId }: { sourceChainId?: number }) => {
  const {
    targetChainId,
    attestationApiUrl,
    messageTransmitterContractAddress
  } = getCctpContracts({ sourceChainId })

  const fetchAttestation = async (attestationHash: Address) => {
    const response = await fetch(
      `${attestationApiUrl}/attestations/${attestationHash}`,
      { method: 'GET', headers: { accept: 'application/json' } }
    )

    const attestationResponse: AttestationResponse = await response.json()
    return attestationResponse
  }

  const waitForAttestation = async (attestationHash: Address) => {
    while (true) {
      const attestation = await fetchAttestation(attestationHash)
      if (attestation.status === 'complete') {
        return attestation.attestation
      }

      await new Promise(r => setTimeout(r, 30_000))
    }
  }

  const receiveMessage = async ({
    messageBytes,
    attestation,
    wagmiConfig
  }: {
    messageBytes: Address
    attestation: Address
    wagmiConfig: Config
  }) => {
    const { request } = await simulateContract(wagmiConfig, {
      address: messageTransmitterContractAddress,
      abi: MessageTransmitterAbi,
      functionName: 'receiveMessage',
      chainId: targetChainId,
      args: [messageBytes, attestation]
    })
    const txHash = await writeContract(wagmiConfig, request)
    return { hash: txHash }
  }

  return {
    receiveMessage,
    fetchAttestation,
    waitForAttestation
  }
}
