import { Address } from '@arbitrum/sdk'

export function getAliasedAddress(address: string) {
  return new Address(address).applyAlias()
}
