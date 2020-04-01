import { useState, useEffect } from 'react'
import { getInjectedWeb3 } from '../util/web3'
import { providers, utils, Contract, constants } from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'

interface ArbSigner {
  [x: string]: any
}

interface Template {
  [x: string]: any
}
export default (
  handleConfirmedAssertion: (txnId: string[], txn: Template) => Promise<void>
): Template => {
  const [ethAddress, setEthAddress] = useState('')
  const [ethProvider, setEthProvider] = useState<providers.JsonRpcProvider>()
  const [arbProvider, setArbProviderf] = useState<ArbProvider>()
  const [arbWallet, setArbWallet] = useState<ArbSigner>()
  const [ethWallet, setEthWallet] = useState<providers.JsonRpcSigner>()
  const [vmId, setVimId] = useState('')

  useEffect(() => {
    ;(async () => {
      const url = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
      const [ethProvider, standardProvider] = await getInjectedWeb3()
      // set providers:
      setEthProvider(ethProvider)
      const arbProvider = new ArbProvider(
        url,
        new providers.Web3Provider(standardProvider)
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

  const updateWallets = (): void => {
    ;(async () => {
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
    })()
  }
  useEffect(() => {
    ;(async () => {
      await updateWallets()
    })()
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
