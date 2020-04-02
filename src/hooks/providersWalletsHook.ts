import { useState, useEffect } from 'react'
import { getInjectedWeb3 } from '../util/web3'
import { providers, utils, Contract, constants } from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'
import { Listener } from 'ethers/providers'

interface ArbSigner {
  [x: string]: any
}

// TODO figure out args passed
// type ConfirmedAssertionListener = ([logsAccHash]: [string]) => void

export const useArbProvider = (
  // handleConfirmedAssertion: ConfirmedAssertionListener
  handleConfirmedAssertion: Listener
) => {
  const [ethAddress, setEthAddress] = useState('')
  const [ethProvider, setEthProvider] = useState<providers.JsonRpcProvider>()
  const [arbProvider, setArbProviderf] = useState<ArbProvider>()
  const [arbWallet, setArbWallet] = useState<ArbSigner>()
  const [ethWallet, setEthWallet] = useState<providers.JsonRpcSigner>()
  const [vmId, setVimId] = useState('')
  useEffect(() => {
    ; (async () => {
      const url = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
      const provider = await getInjectedWeb3()
      // set providers:
      setEthProvider(provider)
      const arbProvider = new ArbProvider(
        url,
        provider
      )
      setArbProviderf(arbProvider)
      const vmId: string = await arbProvider.getVmID()
      setVimId(vmId)

      // set listeners:
      const arbRollup = await arbProvider.arbRollupConn()
      arbRollup.on('ConfirmedAssertion', handleConfirmedAssertion)
      // TODO: on wallet change listener
      // standardProvider.on('accountsChanged', async function (accounts: string[]) {
      //   // Time to reload your interface with accounts[0]!
      //   console.warn(accounts);
      //   if (accounts[0] !== ethAddress){
      //     console.warn("updating");

      //     updateWallets()
      //   }

      // })
    })()
  }, [])

  const updateWallets = async (): Promise<void> => {
    if (ethProvider) {
      const ethWallet = ethProvider.getSigner(0)
      setEthWallet(ethWallet)

      const ethAddress = await ethWallet.getAddress()
      setEthAddress(ethAddress)
    }

    if (arbProvider) {
      setArbWallet(arbProvider.getSigner(0))
      const vmId: string = await arbProvider.getVmID()
      setVimId(vmId)
    }
  }
  useEffect(() => {
    updateWallets()
  }, [vmId])

  return {
    ethProvider,
    arbProvider,
    arbWallet,
    ethWallet,
    vmId,
    ethAddress,
  }
}
