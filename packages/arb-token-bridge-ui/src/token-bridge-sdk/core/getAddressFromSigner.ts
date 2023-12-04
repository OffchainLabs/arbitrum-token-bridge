import { Signer } from 'ethers'

export const getAddressFromSigner = async (signer: Signer) => {
  const address = await signer.getAddress()
  return address
}
