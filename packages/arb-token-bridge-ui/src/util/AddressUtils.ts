import { JsonRpcProvider } from '@ethersproject/providers'

export async function addressIsSmartContract(
  address: string,
  provider: JsonRpcProvider
) {
  return (await provider.getCode(address)).length > 2
}
