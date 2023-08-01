import { utils, BigNumber, Signer } from 'ethers'
import { useCallback, useMemo } from 'react'
import { prepareWriteContract, writeContract } from '@wagmi/core'
import { useToken } from 'wagmi'
import * as Sentry from '@sentry/react'

import { ChainId } from '../util/networks'
import { messengerTransmitterAbi, tokenMessengerAbi } from '../util/cctp/abi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { CommonAddress } from '../util/CommonAddressUtils'
import { getTokenAllowanceForSpender } from '../util/TokenUtils'
import { Provider } from '@ethersproject/providers'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { ChainDomain } from '../pages/api/cctp/[type]'
import { errorToast } from '../components/common/atoms/Toast'

type CCTPSupportedChainId =
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
}

const contracts: Record<CCTPSupportedChainId, Contracts> = {
  [ChainId.Mainnet]: {
    tokenMessengerContractAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumOne,
    usdcContractAddress: CommonAddress.Mainnet.USDC,
    messengerTransmitterContractAddress:
      '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    attestationApiUrl: 'https://iris-api.circle.com'
  },
  [ChainId.Goerli]: {
    tokenMessengerContractAddress: '0xd0c3da58f55358142b8d3e06c1c30c5c6114efe8',
    targetChainDomain: ChainDomain.ArbitrumOne,
    targetChainId: ChainId.ArbitrumGoerli,
    usdcContractAddress: CommonAddress.Goerli.USDC,
    messengerTransmitterContractAddress:
      '0x109bc137cb64eab7c0b1dddd1edf341467dc2d35',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com'
  },
  [ChainId.ArbitrumOne]: {
    tokenMessengerContractAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    targetChainDomain: ChainDomain.Mainnet,
    targetChainId: ChainId.Mainnet,
    usdcContractAddress: CommonAddress.ArbitrumOne.USDC,
    messengerTransmitterContractAddress:
      '0x0a992d191deec32afe36203ad87d7d289a738f81',
    attestationApiUrl: 'https://iris-api.circle.com'
  },
  [ChainId.ArbitrumGoerli]: {
    tokenMessengerContractAddress: '0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352',
    targetChainDomain: ChainDomain.Mainnet,
    targetChainId: ChainId.Goerli,
    usdcContractAddress: CommonAddress.ArbitrumGoerli.USDC,
    messengerTransmitterContractAddress:
      '0x26413e8157cd32011e726065a5462e97dd4d03d9',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com'
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

function getContracts(chainId: CCTPSupportedChainId | undefined) {
  if (!chainId) {
    return contracts[ChainId.Mainnet]
  }
  return contracts[chainId]
}

export function useCCTP({
  sourceChainId,
  walletAddress
}: {
  sourceChainId?: CCTPSupportedChainId
  walletAddress?: `0x${string}` | string
}) {
  const {
    tokenMessengerContractAddress,
    targetChainDomain,
    targetChainId,
    attestationApiUrl,
    usdcContractAddress,
    messengerTransmitterContractAddress
  } = getContracts(sourceChainId)
  const { data: usdcToken } = useToken({ address: usdcContractAddress })

  const destinationAddress = useMemo(() => {
    if (!walletAddress) return

    // CCTP uses 32 bytes addresses, while EVEM uses 20 bytes addresses
    return utils.hexlify(utils.zeroPad(walletAddress, 32)) as `0x${string}`
  }, [walletAddress])

  const depositForBurn = useCallback(
    async (amount: BigNumber) => {
      const config = await prepareWriteContract({
        address: tokenMessengerContractAddress,
        abi: tokenMessengerAbi,
        functionName: 'depositForBurn',
        args: [
          amount,
          targetChainDomain,
          destinationAddress as `0x${string}`,
          usdcContractAddress
        ]
      })
      return writeContract(config)
    },
    [
      tokenMessengerContractAddress,
      targetChainDomain,
      destinationAddress,
      usdcContractAddress
    ]
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
      attestation
    }: {
      messageBytes: `0x${string}`
      attestation: `0x${string}`
    }) => {
      const config = await prepareWriteContract({
        address: messengerTransmitterContractAddress,
        abi: messengerTransmitterAbi,
        functionName: 'receiveMessage',
        chainId: targetChainId,
        args: [messageBytes, attestation]
      })
      return writeContract(config)
    },
    [messengerTransmitterContractAddress, targetChainId]
  )

  const approveUSDC = useCallback(
    async (signer: Signer, amount: BigNumber) => {
      const contract = ERC20__factory.connect(usdcContractAddress, signer)
      return contract.functions.approve(tokenMessengerContractAddress, amount)
    },
    [usdcContractAddress, tokenMessengerContractAddress]
  )

  const approveAndDeposit = useCallback(
    async ({
      amount,
      provider,
      signer,
      onSubmit,
      onAllowanceTooLow
    }: {
      amount: string
      provider: Provider
      signer: Signer
      onAllowanceTooLow?: () => Promise<boolean>
      onSubmit: () => void
    }) => {
      if (!walletAddress || !usdcToken) {
        return false
      }

      const { decimals, address } = usdcToken
      const amountRaw = utils.parseUnits(amount, decimals)
      const allowance = await getTokenAllowanceForSpender({
        account: walletAddress,
        erc20Address: address,
        provider,
        spender: tokenMessengerContractAddress
      })

      try {
        if (allowance.lte(amountRaw)) {
          const shouldContinue = await onAllowanceTooLow?.()
          if (!shouldContinue) {
            return
          }

          const tx = await approveUSDC(signer, amountRaw)
          await tx.wait()
        }
        await depositForBurn(amountRaw)
        onSubmit()
      } catch (error: any) {
        if (isUserRejectedError(error)) {
          return
        }

        Sentry.captureException(error)
        return errorToast(
          `There was an error approving USDC, here is more information: ${error.message}`
        )
      }
    },
    [
      approveUSDC,
      depositForBurn,
      tokenMessengerContractAddress,
      usdcToken,
      walletAddress
    ]
  )

  return {
    approveAndDeposit,
    receiveMessage,
    waitForAttestation
  }
}
