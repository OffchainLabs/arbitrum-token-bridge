import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { TransactionReceipt } from '@ethersproject/providers'

export function assertNever(x: never, message = 'Unexpected object'): never {
  console.error(message, x)
  throw new Error('see console ' + message)
}

export const validateTokenList = (tokenList: TokenList) => {
  const ajv = new Ajv()
  addFormats(ajv)
  const validate = ajv.compile(schema)

  return validate(tokenList)
}

// The status of a transaction is 1 is successful or 0 if it was reverted.
// Only transactions included in blocks post-Byzantium Hard Fork have this property.
// https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
export const isTxSuccessful = (txReceipt: TransactionReceipt) =>
  txReceipt.status === 1
