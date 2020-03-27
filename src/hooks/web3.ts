import React, { useState, useEffect } from 'react'
import { getInjectedWeb3 } from '../util/web3'
import * as ethers from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'

interface Web3Data {
  ethAddress: string
  vmId: string
}

export default (): [Web3Data, () => void] => {
  const [ethAddress, setEthAddress] = useState('')
  const [ethProvider, setEthProvider] = useState<
    ethers.providers.JsonRpcProvider
  >()
  const [arbProvider, setArbProviderf] = useState<
    ArbProviderEthers.ArbProvider
  >()
  const [arbWallet, setArbWallet] = useState<ethers.Signer>()
  const [ethWallet, setEthWallet] = useState<ethers.Signer>()
  const [contracts, setContracts] = useState({})
  const [web3, setWeb3] = useState<ethers.providers.JsonRpcProvider>()
  const [vmId, setVimId] = useState('')

  useEffect(() => {
    ;(async () => {
      const url = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
      const ethProvider = await getInjectedWeb3()
      setEthProvider(ethProvider)
      const arbProvider = new ArbProvider(
        url,
        new ethers.providers.Web3Provider(ethProvider)
      )
      setArbProviderf(arbProvider)

      // set listeners:
      const arbRollup = await arbProvider.arbRollupConn()
      arbRollup.on('ConfirmedAssertion', () => {
        // TODO
        console.info('assertion confirmed; rerender')
      })
      await updateWallets()
      window.setInterval(async () => {
        if (arbWallet) {
          const address = await arbWallet.getAddress()
          // TODO
          // if (address != this.account) {
          //   this.account = address;
          //   console.info('assertion confirmed; rerender');

          // }
        }
      }, 1000)
    })()
  }, [])

  const updateWallets = (): void => {
    ;(async () => {
      const ethWalletSigner = ethWallet
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
  useEffect(updateWallets, [ethProvider, arbProvider])
  return [{ ethAddress, vmId }, updateWallets]
}
