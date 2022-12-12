import { Provider } from '@ethersproject/providers'

export async function addressIsSmartContract(
  address: string,
  provider: Provider
) {
  try {
    return !!((await provider?.getCode(address)).length > 2)
  } catch {
    return false
  }
}
