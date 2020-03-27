import React, { useState, useEffect } from 'react'
import { getInjectedWeb3 } from '../util/web3'
import { providers, utils, Signer } from 'ethers'
import * as ArbProviderEthers from 'arb-provider-ethers'
import { ArbProvider } from 'arb-provider-ethers'

const erc20ABI = require('contractABIs/ERC20.json')
const erc721ABI = require('contractABIs/ERC721.json')

interface Web3Data {
  ethAddress: string
  vmId: string
}

interface EthBalances {
  ethBalance: string
  arbChainEthBalance: string
  arbEthBalance: string
  lockBoxBalance: string
}

interface ArbSigner {
  [x: string]: any
}

let x: ArbSigner

export default (): [Web3Data, () => void] => {
  const [ethAddress, setEthAddress] = useState('')
  const [ethProvider, setEthProvider] = useState<providers.JsonRpcProvider>()
  const [arbProvider, setArbProviderf] = useState<
    ArbProviderEthers.ArbProvider
  >()
  const [arbWallet, setArbWallet] = useState<ArbSigner>()
  const [ethWallet, setEthWallet] = useState<ArbSigner>()
  const [contracts, setContracts] = useState({})
  const [web3, setWeb3] = useState<providers.JsonRpcProvider>()
  const [vmId, setVimId] = useState('')

  const [ethBalances, setEthBalances] = useState<EthBalances>()

  /*
  ETH METHODS:
  */
  const depositEthToArb = async (ethValue: string) => {
    if (!arbWallet) return
    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    let tx
    try {
      tx = arbWallet.depositETH(ethAddress, weiValue)
    } catch (e) {
      console.warn(e)
    }

    await tx.wait()
  }

  const withdrawEthFromArb = async (ethValue: string) => {
    if (!arbWallet) return

    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    let tx
    try {
      tx = await arbWallet.withdrawEthFromChain(weiValue)
    } catch (e) {
      console.warn('err')
    }
    await tx.wait()
  }

  const withdrawLockboxETH = async () => {
    if (!arbWallet) return

    const inboxManager = await arbWallet.globalInboxConn()
    let tx
    try {
      tx = await inboxManager.withdrawEth()
    } catch (e) {
      console.warn('err')
    }
  }

  const updateEthBalances = async () => {
    if (!arbProvider || !ethWallet) return

    const inboxManager = await arbProvider.globalInboxConn()

    const ethBalanceWei = await ethWallet.getBalance()
    const arbChainEthBalanceWei = await inboxManager.getEthBalance(vmId)
    const lockBoxBalanceWei = await inboxManager.getEthBalance(ethAddress)
    const arbEthBalanceWei = await arbProvider.getBalance(ethAddress)
    const { formatEther } = utils
    setEthBalances({
      ethBalance: formatEther(ethBalanceWei),
      arbChainEthBalance: formatEther(arbChainEthBalanceWei),
      lockBoxBalance: formatEther(lockBoxBalanceWei),
      arbEthBalance: formatEther(arbEthBalanceWei),
    })
  }

  useEffect(() => {
    ;(async () => {
      const url = process.env.REACT_APP_ARB_VALIDATOR_URL || ''
      const ethProvider = await getInjectedWeb3()
      setEthProvider(ethProvider)
      const arbProvider = new ArbProvider(
        url,
        new providers.Web3Provider(ethProvider)
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
