import { useEffect, useState } from 'react'
import { ArbProvider } from 'arb-provider-ethers'
import * as ethers from 'ethers'

export const useArbProvider = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  aggregatorUrl?: string,
  deterministicAssertions?: boolean,
): ArbProvider | undefined => {
  const [arbProvider, setProvider] = useState(
    ethProvider instanceof Promise
      ? undefined
      : new ArbProvider(validatorUrl, ethProvider, aggregatorUrl, deterministicAssertions)
  )

  useEffect(() => {
    if (!arbProvider) {
      Promise.resolve(ethProvider)
        .then(ep =>
          setProvider(new ArbProvider(validatorUrl, ep, aggregatorUrl, deterministicAssertions))
        )
        .catch(e => {
          console.log(e)
          throw new Error('unable to resolve provider')
        })
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
  })

  return arbProvider
}
