import { Signer } from 'ethers'

export const getProviderFromSigner = (signer: Signer) => {
  if (!signer.provider) throw Error('Signer not able to return provider')
  return signer.provider
}
