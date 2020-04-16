export type { ERC20 } from './contracts/ERC20.d'
export type { ERC721 } from './contracts/ERC721.d'
export { ERC20Factory } from './contracts/ERC20Factory'
export { ERC721Factory } from './contracts/ERC721Factory'

export function assertNever(x: never, message = 'Unexpected object'): never {
  console.error(message, x)
  throw new Error('see console ' + message)
}
