import { useState, useEffect } from 'react'
import { ArbProvider } from 'arb-provider-ethers'
import * as ethers from 'ethers'

// should async provider arg be allowed? complicates logic
// should vmId + address be managed here?
export const useArbProvider = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex: number
): {
  arbProvider: ArbProvider | undefined
  vmId: string
  walletAddress: string
} => {
  const [walletAddress, setWalletAddress] = useState('')
  const [arbProvider, setProvider] = useState(
    ethProvider instanceof ethers.providers.JsonRpcProvider
      ? new ArbProvider(validatorUrl, ethProvider)
      : undefined
  )
  const [vmId, setVmId] = useState('')

  useEffect(() => {
    if (!arbProvider) {
      Promise.resolve(ethProvider).then((ep) =>
        setProvider(new ArbProvider(validatorUrl, ep))
      )
    }

    if (arbProvider) {
      if (!walletAddress) {
        arbProvider.getSigner(walletIndex).getAddress().then(setWalletAddress)
      }
      if (!vmId) {
        arbProvider.getVmID().then(setVmId)
      }
    }

    // TODO: on wallet change listener if metamask
    // standardProvider.on('accountsChanged', async function (accounts: string[]) {
    //   // Time to reload your interface with accounts[0]!
    //   console.warn(accounts);
    //   if (accounts[0] !== ethAddress){
    //     console.warn("updating");

    //     updateWallets()
    //   }

    // })
  }, [vmId, walletAddress])

  return {
    arbProvider,
    vmId,
    walletAddress,
  }
}
