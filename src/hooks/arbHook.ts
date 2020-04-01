import { useState, useEffect } from 'react'
import { utils, Contract, constants } from 'ethers'
import useProvidersAndWallets from './providersWalletsHook'
import { useLocalStorage } from '@rehooks/local-storage'

const {
  ArbERC20Factory,
} = require('arb-provider-ethers/dist/lib/abi/ArbERC20Factory')
const {
  ArbERC721Factory,
} = require('arb-provider-ethers/dist/lib/abi/ArbERC721Factory')
const erc20ABI = require('contractABIs/ERC20.json')
const erc721ABI = require('contractABIs/ERC721.json')

interface Web3Data {
  ethAddress: string
  vmId: string
}

interface Balances {
  balance: string
  arbChainBalance: string
  totalArbBalance: string
  lockBoxBalance: string
  asset: string
}

interface NFTBalances {
  tokens: utils.BigNumber[]
  arbChainTokens: utils.BigNumber[]
  totalArbTokens: utils.BigNumber[]
  lockBoxTokens: utils.BigNumber[]
  asset: string
}

interface Template {
  [x: string]: any
}

export default (): [Template, Template, Template, Template] => {
  const [erc20s, setERC20s] = useState<any>({})

  const [currentERC20, setCurrentERC20State] = useLocalStorage<string>(
    'currentERC20',
    '0xD02bEC7Ee5Ee73A271B144E829EeD1C19218D813'
  )

  const [erc721s, setERC721s] = useState<any>({})

  const [currentERC721, setCurrentERC721State] = useLocalStorage<string>(
    'currentERC721'
  )

  const [erc20sCached, setERC20sPersister] = useLocalStorage<string[]>(
    'erc20sCached',
    []
  )
  const [erc721sCached, setERC721sPersister] = useLocalStorage<string[]>(
    'erc721sCached',
    []
  )

  const [ethBalances, setEthBalances] = useState<Balances>()
  const [erc20Balances, setERC20Balances] = useState<Balances>()
  const [erc721Balances, setErc721Balances] = useState<NFTBalances>()
  const {
    ethProvider,
    arbProvider,
    arbWallet,
    ethWallet,
    vmId,
    ethAddress,
  } = useProvidersAndWallets(async (txnId: string[], txn: any) => {
    // TODO
    console.info('ASSERTION CONFIRMED', txnId, txn)
    await updateAllBalances()
  })

  /*
  ETH METHODS:
  */
  const depositEthToArb = async (ethValue: string) => {
    if (!arbWallet) return
    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    let tx
    try {
      tx = await arbWallet.depositETH(ethAddress, weiValue)
    } catch (e) {
      console.warn('err', e)
    }

    await tx.wait()

    await updateEthBalances()
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

    await updateEthBalances()
  }

  const withdrawLockboxETH = async () => {
    if (!arbWallet) return

    const inboxManager = await arbWallet.globalInboxConn()
    let tx
    try {
      tx = await inboxManager.withdrawEth()
    } catch (e) {
      console.warn('err', e)
    }
    await tx.wait()

    await updateEthBalances()
  }

  const updateEthBalances = async () => {
    if (!arbProvider || !ethWallet) return
    console.warn('updating eth balances')

    const inboxManager = await arbProvider.globalInboxConn()

    const ethBalanceWei = await ethWallet.getBalance()
    const arbChainEthBalanceWei = await inboxManager.getEthBalance(vmId)
    const lockBoxBalanceWei = await inboxManager.getEthBalance(ethAddress)

    const arbEthBalanceWei = await arbProvider.getBalance(ethAddress)
    const { formatEther } = utils

    setEthBalances({
      balance: formatEther(ethBalanceWei),
      arbChainBalance: formatEther(arbEthBalanceWei),
      lockBoxBalance: formatEther(lockBoxBalanceWei),
      totalArbBalance: formatEther(arbChainEthBalanceWei),
      asset: 'ETH',
    })
  }

  /*
  ERC20 Methods
  */
  const addERC20 = async (addressParam: string | undefined) => {
    if (!ethProvider || !arbWallet || !ethWallet || !erc20s || !erc20sCached)
      return
    const address = addressParam ? addressParam : currentERC20

    if (!address) {
      return
    }
    // check if already loaded
    if (erc20s[address]) {
      return
    }
    const code = await ethProvider.getCode(address)

    // TODO ...
    if (code.length > 2) {
      const ethTokenContractRaw = new Contract(address, erc20ABI, ethProvider)
      const arbTokenContractRaw = ArbERC20Factory.connect(address, arbProvider)
      const newContracts: Template = {}
      const connectedEthContract = ethTokenContractRaw.connect(ethWallet)
      const units = await connectedEthContract.decimals()
      // TODO: name
      const inboxManager = await arbProvider.globalInboxConn()
      const allowance = await connectedEthContract.allowance(
        ethAddress,
        inboxManager.address
      )
      const allowed = allowance.gt(utils.bigNumberify(0))
      newContracts[address] = {
        arb: arbTokenContractRaw.connect(arbWallet),
        eth: connectedEthContract,
        units,
        symbol: await connectedEthContract.symbol(),
        allowed,
      }
      setERC20s({ ...erc20s, ...newContracts })
      setCurrentERC20State(address)
      if (!erc20sCached.includes(address)) {
        setERC20sPersister([...erc20sCached, ...[address]])
      }
    }
  }

  const approveERC20 = async (address: string | undefined) => {
    if (!arbProvider || !erc20s) return

    const erc20Address = address ? address : currentERC20
    if (!erc20Address) {
      return
    }
    const inboxManager = await arbProvider.globalInboxConn()
    const tokenContract = erc20s[erc20Address]
    if (!tokenContract) return
    let txn
    try {
      txn = await tokenContract.eth.approve(
        inboxManager.address,
        constants.MaxUint256
      )
    } catch (e) {
      console.warn(e)
    }
    await txn.wait()
    erc20s[erc20Address] = { ...tokenContract, ...{ allowed: true } }
  }

  const getCurrentERC20Contract = (): Contract | undefined => {
    if (!erc20s || !currentERC20) return
    return erc20s[currentERC20]
  }

  const depositERC20 = async (value: string) => {
    if (!arbProvider || !erc20s || !arbWallet) return
    // const erc20Address = address ? address : currentERC20;
    const erc20Contract = getCurrentERC20Contract()

    if (!erc20Contract) return

    const val = utils.parseUnits(value, erc20Contract.units)
    let tx
    try {
      tx = await arbWallet.depositERC20(
        ethAddress,
        erc20Contract.eth.address,
        val
      )
    } catch (e) {
      console.warn(e)
    }
    // TODO: 0?
    await tx.wait(0)
    await updateERC20Balances()
  }

  const withdrawERC20 = async (value: string) => {
    if (!arbProvider || !erc20s || !arbWallet) return
    const erc20Contract = getCurrentERC20Contract()
    if (!erc20Contract) return

    const val = utils.parseUnits(value, erc20Contract.units)
    let tx
    try {
      tx = await erc20Contract.arb.withdraw(ethAddress, val)
    } catch (e) {
      console.warn(e)
    }
    try {
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const withdrawLockboxERC20 = async () => {
    if (!arbWallet) return
    const erc20Contract = getCurrentERC20Contract()

    if (!erc20Contract) return

    const inboxManager = await arbWallet.globalInboxConn()
    let tx
    try {
      tx = await inboxManager.withdrawERC20(erc20Contract.eth.address)
    } catch (e) {
      console.warn(e)
    }
    await tx.wait()
    await updateERC20Balances()
  }

  const updateERC20Balances = async () => {
    if (!arbProvider || !erc20s || !arbWallet) return
    const erc20Contract = getCurrentERC20Contract()
    if (!erc20Contract) return

    const inboxManager = await arbProvider.globalInboxConn()

    const tokenBalanceRaw = await erc20Contract.eth.balanceOf(ethAddress)

    const totalArbBalance = await inboxManager.getERC20Balance(
      erc20Contract.eth.address,
      vmId
    )
    const lockBoxBalance = await inboxManager.getERC20Balance(
      erc20Contract.eth.address,
      ethAddress
    )

    const arbBalance = await erc20Contract.arb.balanceOf(ethAddress)
    const format = (value: utils.BigNumber) =>
      utils.formatUnits(value, erc20Contract.units)

    setERC20Balances({
      balance: format(tokenBalanceRaw),
      arbChainBalance: format(arbBalance),
      lockBoxBalance: format(lockBoxBalance),
      totalArbBalance: format(totalArbBalance),
      asset: erc20Contract.symbol,
    })
  }

  /*
ERC 721 Methods
*/
  const addERC721 = async (addressParam: string | undefined) => {
    if (
      !ethProvider ||
      !arbWallet ||
      !ethWallet ||
      !currentERC721 ||
      !erc721sCached
    )
      return
    const address = addressParam ? addressParam : currentERC721
    const code = await ethProvider.getCode(address)
    // TODO ...
    if (code.length > 2) {
      const ethTokenContractRaw = new Contract(address, erc721ABI, ethProvider)
      const arbTokenContractRaw = ArbERC721Factory.connect(address, arbProvider)

      const newContracts: Template = {}
      const connectedEthContract = ethTokenContractRaw.connect(ethWallet)
      const inboxManager = await arbProvider.globalInboxConn()

      const allowed = await connectedEthContract.isApprovedForAll(
        ethAddress,
        inboxManager.address
      )
      newContracts[address] = {
        arb: arbTokenContractRaw.connect(arbWallet),
        eth: connectedEthContract,
        symbol: await connectedEthContract.symbol(),
        allowed,
      }
      setERC721s({ ...erc721s, ...newContracts })
      if (!erc721sCached.includes(address)) {
        setERC721sPersister([...erc721sCached, ...[address]])
      }

      await updateERC721Balances()
    }
  }

  const setERC20 = async (address: string) => {
    setCurrentERC20State(address)
    await addERC20(address)
  }

  const getCurrentERC721Contract = (): Contract | undefined => {
    if (!erc721s || !currentERC721) return
    return erc721s[currentERC721]
  }

  const approveERC721 = async (address: string | undefined) => {
    if (!arbProvider || !erc20s) return

    const erc721Address = address ? address : currentERC721
    if (!erc721Address) return
    const inboxManager = await arbProvider.globalInboxConn()
    const tokenContract = erc20s[erc721Address]
    if (!tokenContract) return
    let txn
    try {
      txn = await tokenContract.eth.setApprovalForAll(
        inboxManager.address,
        true
      )
    } catch (e) {
      console.warn(e)
    }
    await txn.wait()
  }
  const depositERC721 = async (tokenId: string) => {
    if (!arbProvider || !erc721s || !arbWallet) return
    const erc721Contract = getCurrentERC721Contract()

    if (!erc721Contract) return

    let tx
    try {
      tx = await arbWallet.depositERC721(
        ethAddress,
        erc721Contract.eth.address,
        tokenId
      )
    } catch (e) {
      console.warn(e)
    }

    await tx.wait(0)
    await updateERC721Balances()
  }

  const withdrawERC721 = async (tokenId: string) => {
    if (!arbProvider || !erc721s || !arbWallet) return
    const erc721Contract = getCurrentERC721Contract()

    if (!erc721Contract) return

    let tx
    try {
      tx = await erc721Contract.arb.withdraw(ethAddress, tokenId)
    } catch (e) {
      console.warn(e)
    }

    try {
      await tx.wait()
      await updateERC721Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const withdrawLockboxERC721 = async (tokenId: string) => {
    if (!arbProvider || !erc721s || !arbWallet) return
    const erc721Contract = getCurrentERC721Contract()

    if (!erc721Contract) return
    const inboxManager = await arbWallet.globalInboxConn()

    let tx
    try {
      tx = await inboxManager.withdrawERC721(
        erc721Contract.eth.address,
        tokenId
      )
    } catch (e) {
      console.warn(e)
    }

    await tx.wait()
    await updateERC721Balances()
  }

  const updateERC721Balances = async () => {
    if (!arbProvider || !erc721s || !arbWallet) return
    const erc721contract = getCurrentERC721Contract()

    if (!erc721contract) return

    const inboxManager = await arbProvider.globalInboxConn()

    const nftsOnEth = await erc721contract.eth.tokensOfOwner(ethAddress)

    const nftsOnArb = await erc721contract.arb.tokensOfOwner(ethAddress)

    const totalArbNfts = await inboxManager.getERC721Tokens(
      erc721contract.eth.address,
      vmId
    )
    const lockBoxNfts = await inboxManager.getERC721Tokens(
      erc721contract.eth.address,
      ethAddress
    )

    setErc721Balances({
      tokens: nftsOnEth,
      arbChainTokens: nftsOnArb,
      totalArbTokens: totalArbNfts,
      lockBoxTokens: lockBoxNfts,
      asset: await erc721contract.eth.symbol(),
    })
  }

  const setERC721 = async (address: string) => {
    setCurrentERC721State(address)
    await addERC721(address)
  }

  const updateAllBalances = async () => {
    await updateEthBalances()
    await updateERC20Balances()
    await updateERC721Balances()
  }
  useEffect(() => {
    ;(async () => {
      console.warn('updating eth balances')
      try {
        await updateEthBalances()
      } catch (e) {
        console.warn(e)
      }
    })()
  }, [arbWallet])

  // [balance data, ethmethods, erc20amethods, erc721 methods]

  const expireCache = () => {
    setERC20sPersister([])
    setERC721sPersister([])
    setCurrentERC20State('')
    setCurrentERC721State('')
  }

  return [
    {
      ethAddress,
      ethBalances,
      erc20Balances,
      erc721Balances,
      currentERC20,
      currentERC721,
      vmId,
      erc20s,
      erc721s,
      erc20sCached,
      erc721sCached,
      expireCache,
    },
    {
      depositEthToArb,
      withdrawEthFromArb,
      withdrawLockboxETH,
      updateEthBalances,
    },
    {
      addERC20,
      setCurrentERC20State,
      approveERC20,
      depositERC20,
      withdrawERC20,
      withdrawLockboxERC20,
      updateERC20Balances,
      setERC20,
    },
    {
      addERC721,
      setCurrentERC721State,
      approveERC721,
      depositERC721,
      withdrawERC721,
      withdrawLockboxERC721,
      updateERC721Balances,
      setERC721,
    },
  ]
}
