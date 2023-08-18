import { TransactionReceipt } from '@ethersproject/providers'
import { utils } from 'ethers'

export function getAttestationHashAndMessageFromReceipt(
  txReceipt: TransactionReceipt
) {
  const eventTopic = utils.keccak256(utils.toUtf8Bytes('MessageSent(bytes)'))
  const log = txReceipt.logs.find(l => l.topics[0] === eventTopic)

  if (!log)
    return {
      messageBytes: null,
      attestationHash: null
    }

  const messageBytes = utils.defaultAbiCoder.decode(
    ['bytes'],
    log.data
  )[0] as `0x${string}`

  return {
    messageBytes,
    attestationHash: utils.keccak256(messageBytes) as `0x${string}`
  }
}
