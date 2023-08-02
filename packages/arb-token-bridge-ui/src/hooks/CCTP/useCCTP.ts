import { utils, BigNumber, Signer } from 'ethers'
import { useCallback } from 'react'
import { prepareWriteContract, writeContract } from '@wagmi/core'

import { ChainId } from '../../util/networks'
import { messengerTransmitterAbi, tokenMessengerAbi } from '../../util/cctp/abi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { CommonAddress } from '../../util/CommonAddressUtils'

import { ChainDomain } from '../../pages/api/cctp/[type]'

export type CCTPSupportedChainId =
  | ChainId.Mainnet
  | ChainId.Goerli
  | ChainId.ArbitrumOne
  | ChainId.ArbitrumGoerli

// see https://developers.circle.com/stablecoin/docs/cctp-protocol-contract
type Contracts = {
  tokenMessengerContractAddress: `0x${string}`
  targetChainDomain: ChainDomain
  targetChainId: CCTPSupportedChainId
  usdcContractAddress: `0x${string}`
  messengerTransmitterContractAddress: `0x${string}`
  attestationApiUrl: string
  tokenMinterContractAddress: `0x${string}`
}

const contracts: Record<CCTPSupportedChainId, Contracts> = {
  [ChainId.Mainnet]: {
    tokenMessengerContractAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumOne,
    usdcContractAddress: CommonAddress.Mainnet.USDC,
    messengerTransmitterContractAddress:
      '0xc30362313fbba5cf9163f0bb16a0e01f01a896ca',
    attestationApiUrl: 'https://iris-api.circle.com',
    tokenMinterContractAddress: '0xc4922d64a24675e16e1586e3e3aa56c06fabe907'
  },
  [ChainId.Goerli]: {
    tokenMessengerContractAddress: '0xd0c3da58f55358142b8d3e06c1c30c5c6114efe8',
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumGoerli,
    usdcContractAddress: CommonAddress.Goerli.USDC,
    messengerTransmitterContractAddress:
      '0x109bc137cb64eab7c0b1dddd1edf341467dc2d35',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com',
    tokenMinterContractAddress: '0xca6b4c00831ffb77afe22e734a6101b268b7fcbe'
  },
  [ChainId.ArbitrumOne]: {
    tokenMessengerContractAddress: '0x19330d10d9cc8751218eaf51e8885d058642e08a',
    targetChainDomain: ChainDomain.Mainnet,
    targetChainId: ChainId.Mainnet,
    usdcContractAddress: CommonAddress.ArbitrumOne.USDC,
    messengerTransmitterContractAddress:
      '0x0a992d191deec32afe36203ad87d7d289a738f81',
    attestationApiUrl: 'https://iris-api.circle.com',
    tokenMinterContractAddress: '0xe7ed1fa7f45d05c508232aa32649d89b73b8ba48'
  },
  [ChainId.ArbitrumGoerli]: {
    tokenMessengerContractAddress: '0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352',
    targetChainDomain: ChainDomain.Mainnet,
    targetChainId: ChainId.Goerli,
    usdcContractAddress: CommonAddress.ArbitrumGoerli.USDC,
    messengerTransmitterContractAddress:
      '0x26413e8157cd32011e726065a5462e97dd4d03d9',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com',
    tokenMinterContractAddress: '0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a'
  }
}

type AttestationResponse =
  | {
      attestation: `0x${string}`
      status: 'complete'
    }
  | {
      attestation: null
      status: 'pending_confirmations'
    }

export function getContracts(chainId: CCTPSupportedChainId | undefined) {
  if (!chainId) {
    return contracts[ChainId.Mainnet]
  }
  return contracts[chainId]
}

export type UseCCTPParams = {
  sourceChainId: CCTPSupportedChainId | undefined
  walletAddress: `0x${string}` | string | undefined
}
export function useCCTP({ sourceChainId, walletAddress }: UseCCTPParams) {
  const {
    tokenMessengerContractAddress,
    targetChainDomain,
    targetChainId,
    attestationApiUrl,
    usdcContractAddress,
    messengerTransmitterContractAddress
  } = getContracts(sourceChainId)

  const depositForBurn = useCallback(
    async ({
      amount,
      signer,
      recipient
    }: {
      amount: BigNumber
      signer: Signer
      recipient: string
    }) => {
      // CCTP uses 32 bytes addresses, while EVEM uses 20 bytes addresses
      const mintRecipient = utils.hexlify(
        utils.zeroPad(recipient, 32)
      ) as `0x${string}`

      const config = await prepareWriteContract({
        address: tokenMessengerContractAddress,
        abi: tokenMessengerAbi,
        functionName: 'depositForBurn',
        signer,
        args: [amount, targetChainDomain, mintRecipient, usdcContractAddress]
      })
      return writeContract(config)
    },
    [tokenMessengerContractAddress, targetChainDomain, usdcContractAddress]
  )

  const fetchAttestation = useCallback(
    async (attestationHash: `0x${string}`) => {
      const response = await fetch(
        `${attestationApiUrl}/attestations/${attestationHash}`
      )

      const attestationResponse: AttestationResponse = await response.json()
      return attestationResponse
    },
    [attestationApiUrl]
  )

  const waitForAttestation = useCallback(
    async (attestationHash: `0x${string}`) => {
      while (true) {
        const attestation = await fetchAttestation(attestationHash)
        if (attestation.status === 'complete') {
          return attestation.attestation
        }

        await new Promise(r => setTimeout(r, 5000))
      }
    },
    [fetchAttestation]
  )

  const receiveMessage = useCallback(
    async ({
      messageBytes,
      attestation,
      signer
    }: {
      messageBytes: `0x${string}`
      attestation: `0x${string}`
      signer: Signer
    }) => {
      const config = await prepareWriteContract({
        address: messengerTransmitterContractAddress,
        abi: messengerTransmitterAbi,
        functionName: 'receiveMessage',
        chainId: targetChainId,
        signer,
        args: [messageBytes, attestation]
      })
      return writeContract(config)
    },
    [messengerTransmitterContractAddress, targetChainId]
  )

  const approveForBurn = useCallback(
    async (amount: BigNumber, signer: Signer) => {
      const contract = ERC20__factory.connect(usdcContractAddress, signer)
      return contract.functions.approve(tokenMessengerContractAddress, amount)
    },
    [usdcContractAddress, tokenMessengerContractAddress]
  )

  return {
    approveForBurn,
    depositForBurn,
    receiveMessage,
    waitForAttestation
  }
}
