import { Provider } from '@ethersproject/providers'

export async function addressIsSmartContract(
  address: string,
  provider: Provider
) {
  return (await provider?.getCode(address)).length > 2 || false
}
