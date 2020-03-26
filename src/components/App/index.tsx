import React, { useState, useEffect } from 'react'
import styles from './styles.module.scss'
import { statement } from '@babel/template'
import { getInjectedWeb3 } from '../../util/web3'
import * as ethers from 'ethers'
import * as ArbProviderEthers from "arb-provider-ethers"
import { ArbProvider } from "arb-provider-ethers"


const App = () => {
  const [ethAddress, setEthAddress] = useState("")
  const [ethProvider, setEthProvider] = useState<ethers.providers.JsonRpcProvider>()
  const [arbProvider, setArbProviderf] = useState<ArbProviderEthers.ArbProvider>()
  const [arbWallet, setArbWallet] = useState<ethers.Signer>()
  const [ethWallet, setEthWallet] = useState<ethers.Signer>()
  const [contracts, setContracts] = useState({})
  const [web3, setWeb3] = useState<ethers.providers.JsonRpcProvider>()

  useEffect(()=>{
   (async ()=> {
    const url =  process.env.REACT_APP_ARB_VALIDATOR_URL || "";
    let ethProvider = await getInjectedWeb3()

    // const ethProvider = new ethers.providers.Web3Provider(standardProvider)
    setEthProvider(ethProvider)
    const arbProvider = new ArbProvider( url,
      new ethers.providers.Web3Provider(ethProvider)
    );
    setArbProviderf(arbProvider)
  })()

  }, [])

   const updateWallets = ()=>{
    (async ()=>{
      let ethWalletSigner = ethWallet
      if (ethProvider){
        const ethWallet = ethProvider.getSigner(0)
        setEthWallet(ethWallet)

        const ethAddress = await ethWallet.getAddress()
        setEthAddress(ethAddress)
      }

      if (arbProvider){
        setArbWallet(arbProvider.getSigner(0))
      }
    })()

  }
  useEffect(updateWallets, [ethProvider, arbProvider ])

  if (!ethAddress){
    return <div>"loading..."</div>
  }

  return <div  className={styles.App}>xyz</div>
}

export default App
