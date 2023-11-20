import { BigNumber, Signer, utils } from 'ethers'
import { AttestationResponse, getContracts } from '../../../hooks/CCTP/useCCTP'
import { prepareWriteContract, writeContract } from '@wagmi/core'
import { TokenMessengerAbi } from '../../../util/cctp/TokenMessengerAbi'
import { MessageTransmitterAbi } from '../../../util/cctp/MessageTransmitterAbi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

export const cctpContracts = (sourceChainId: number) => {
  const {
    tokenMessengerContractAddress,
    targetChainDomain,
    targetChainId,
    attestationApiUrl,
    usdcContractAddress,
    messageTransmitterContractAddress
  } = getContracts(sourceChainId)

  const depositForBurn = async ({
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
      abi: TokenMessengerAbi,
      functionName: 'depositForBurn',
      signer,
      args: [amount, targetChainDomain, mintRecipient, usdcContractAddress]
    })
    return writeContract(config)
  }

  const fetchAttestation = async (attestationHash: `0x${string}`) => {
    const response = await fetch(
      `${attestationApiUrl}/attestations/${attestationHash}`,
      { method: 'GET', headers: { accept: 'application/json' } }
    )

    const attestationResponse: AttestationResponse = await response.json()
    return attestationResponse
  }

  const waitForAttestation = async (attestationHash: `0x${string}`) => {
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
    signer
  }: {
    messageBytes: `0x${string}`
    attestation: `0x${string}`
    signer: Signer
  }) => {
    const config = await prepareWriteContract({
      address: messageTransmitterContractAddress,
      abi: MessageTransmitterAbi,
      functionName: 'receiveMessage',
      chainId: targetChainId,
      signer,
      args: [messageBytes, attestation]
    })
    return writeContract(config)
  }
  const approveForBurn = async (amount: BigNumber, signer: Signer) => {
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    return contract.functions.approve(tokenMessengerContractAddress, amount)
  }

  return {
    approveForBurn,
    depositForBurn,
    receiveMessage,
    fetchAttestation,
    waitForAttestation
  }
}
