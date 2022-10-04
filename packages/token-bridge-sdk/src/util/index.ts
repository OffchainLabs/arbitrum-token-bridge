import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'

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

export function isClassicEvent(event: L2ToL1TransactionEvent) {
  return typeof (event as any).batchNumber !== 'undefined'
}
