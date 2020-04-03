import { useState, useEffect } from 'react'
import { utils, Contract, constants, ethers } from 'ethers'
import { useArbProvider } from './providersWalletsHook'
import { useLocalStorage } from '@rehooks/local-storage'
import { Balances, Template, NFTBalances } from 'types'
import { ArbERC20 } from 'arb-provider-ethers/dist/lib/abi/ArbERC20'
import { ArbERC721 } from 'arb-provider-ethers/dist/lib/abi/ArbERC721'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { ArbERC721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC721Factory'
import * as erc20ABI from 'contractABIs/ERC20.json'
import * as erc721ABI from 'contractABIs/ERC721.json'

interface Web3Data {
  address: string
  vmId: string
}

interface ContractStorage<T> {
  [contractAddress: string]: {
    arb: T
    eth: any // TODO
    units: number
    symbol: string
    allowed: boolean
  }
}

// would it be better to encourage a flatter structure by passing in the
// ready arbProvider from the useArbProvider hook?
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex: number = 0
): [Template, Template, Template, Template] => {
  const [erc20Contracts, setERC20s] = useState<ContractStorage<ArbERC20>>({})
  const [erc721Contracts, setERC721s] = useState<ContractStorage<ArbERC721>>({})

  // use local storage for current tokens and list of token addresses
  const [currentERC20, setCurrentERC20] = useLocalStorage<string>(
    'currentERC20'
  )
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

  // get providers amd wallets from hook
  const { arbProvider, vmId, address } = useArbProvider(
    validatorUrl,
    ethProvider,
    walletIndex
  )
  if (!arbProvider) throw new Error('ap not present') // this is bad - fix async?

  arbProvider
    .arbRollupConn()
    .then((rollup) => rollup.on('ConfirmedAssertion', updateAllBalances))

  const currentERC20Contract = currentERC20
    ? erc20Contracts[currentERC20]
    : undefined
  const currentERC721Contract = currentERC721
    ? erc721Contracts[currentERC721]
    : undefined
  const arbWallet = arbProvider.getSigner(walletIndex)
  const ethWallet = arbProvider.provider.getSigner(walletIndex)

  /*
  ETH METHODS:
  */
  const depositEth = async (ethValue: string) => {
    if (!arbWallet) return
    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    try {
      const tx = await arbWallet.depositETH(address, weiValue)
      await tx.wait()
      await updateEthBalances()
    } catch (e) {
      console.error('depositEth err: ' + e)
    }
  }

  const withdrawEth = async (ethValue: string) => {
    if (!arbWallet) return

    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    try {
      const tx = await arbWallet.withdrawEthFromChain(weiValue)
      await tx.wait()
      await updateEthBalances()
    } catch (e) {
      console.error('withdrawEth err', e)
    }
  }

  const withdrawLockboxETH = async () => {
    if (!arbWallet) return

    try {
      const inboxManager = await arbWallet.globalInboxConn()
      const tx = await inboxManager.withdrawEth()
      await tx.wait()
      await updateEthBalances()
    } catch (e) {
      console.error('withdrawLockboxETH err', e)
    }
  }

  const updateEthBalances = async () => {
    if (!arbProvider || !ethWallet) return

    const inboxManager = await arbProvider.globalInboxConn()

    const ethBalanceWei = await ethWallet.getBalance()
    const arbChainEthBalanceWei = await inboxManager.getEthBalance(vmId)
    const lockBoxBalanceWei = await inboxManager.getEthBalance(address)
    const arbEthBalanceWei = await arbProvider.getBalance(address)

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
    /*
      retrieves ERC20 contract object and adds it to ERC20s array. Uses address param or currentERC20 address if no param given
    */
    if (!arbProvider || !erc20Contracts || !erc20sCached) return

    const address = addressParam ? addressParam : currentERC20
    if (!address) return
    // check if contract is already in array
    if (erc20Contracts[address]) return

    const code = await arbProvider.provider.getCode(address)
    // TODO: better sanity check?
    if (code.length > 2) {
      // TODO typechain types for ERC20 abi
      const inboxManager = await arbProvider.globalInboxConn()
      const ethTokenContractRaw = new Contract(
        address,
        erc20ABI,
        arbProvider.provider
      )
      const arbTokenContractRaw = ArbERC20Factory.connect(address, arbProvider)
      const connectedEthContract = ethTokenContractRaw.connect(ethWallet)

      const units: number = await connectedEthContract.decimals()
      const allowance = await connectedEthContract.allowance(
        address,
        inboxManager.address
      )
      const allowed = allowance.gt(utils.bigNumberify(0))

      const newContracts: Template = {}
      newContracts[address] = {
        arb: arbTokenContractRaw.connect(arbWallet),
        eth: connectedEthContract,
        units,
        symbol: await connectedEthContract.symbol(),
        allowed,
      }
      setERC20s({ ...erc20Contracts, ...newContracts })
      setCurrentERC20(address)
      // add to cache (if not already added)
      if (!erc20sCached.includes(address)) {
        setERC20sPersister([...erc20sCached, ...[address]])
      }
    }
  }

  const approveERC20 = async () => {
    if (!arbProvider || !erc20Contracts || !currentERC20Contract) return

    const inboxManager = await arbProvider.globalInboxConn()
    let txn
    try {
      txn = await currentERC20Contract.eth.approve(
        inboxManager.address,
        constants.MaxUint256
      )
    } catch (e) {
      console.warn(e)
    }
    await txn.wait()
    const erc20Address: string = currentERC20Contract.eth.address
    setERC20s((contracts) => {
      return {
        ...contracts,
        [erc20Address]: { ...contracts[erc20Address], allowed: true },
      }
    })
  }

  const depositERC20 = async (value: string) => {
    if (!arbProvider || !erc20Contracts || !arbWallet || !currentERC20Contract)
      return

    const val = utils.parseUnits(value, currentERC20Contract.units)
    try {
      const tx = await arbWallet.depositERC20(
        address,
        currentERC20Contract.eth.address,
        val
      )
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const withdrawERC20 = async (value: string) => {
    if (!arbProvider || !erc20Contracts || !arbWallet || !currentERC20Contract)
      return

    const val = utils.parseUnits(value, currentERC20Contract.units)
    try {
      const tx = await currentERC20Contract.arb.withdraw(address, val)
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const withdrawLockboxERC20 = async () => {
    if (!arbWallet || !currentERC20Contract) return

    const inboxManager = await arbWallet.globalInboxConn()
    try {
      const tx = await inboxManager.withdrawERC20(
        currentERC20Contract.eth.address
      )
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const updateERC20Balances = async () => {
    if (!arbProvider || !erc20Contracts || !arbWallet || !currentERC20Contract)
      return

    const inboxManager = await arbProvider.globalInboxConn()
    const tokenBalanceRaw = await currentERC20Contract.eth.balanceOf(address)
    const totalArbBalance = await inboxManager.getERC20Balance(
      currentERC20Contract.eth.address,
      vmId
    )
    const lockBoxBalance = await inboxManager.getERC20Balance(
      currentERC20Contract.eth.address,
      address
    )

    const arbBalance = await currentERC20Contract.arb.balanceOf(address)
    const format = (value: utils.BigNumber) =>
      utils.formatUnits(value, currentERC20Contract.units)

    setERC20Balances({
      balance: format(tokenBalanceRaw),
      arbChainBalance: format(arbBalance),
      lockBoxBalance: format(lockBoxBalance),
      totalArbBalance: format(totalArbBalance),
      asset: currentERC20Contract.symbol,
    })
  }

  /*
ERC 721 Methods
*/
  const addERC721 = async (addressParam: string | undefined) => {
    if (!arbProvider || !currentERC721 || !erc721sCached) return
    const address = addressParam ? addressParam : currentERC721
    const code = await arbProvider.provider.getCode(address)
    // TODO: better santiy check
    if (code.length > 2) {
      const inboxManager = await arbProvider.globalInboxConn()

      const ethTokenContractRaw = new Contract(
        address,
        erc721ABI,
        arbProvider.provider
      )
      const arbTokenContractRaw = ArbERC721Factory.connect(address, arbProvider)
      const connectedEthContract = ethTokenContractRaw.connect(
        arbProvider.provider
      )
      const allowed = await connectedEthContract.isApprovedForAll(
        address,
        inboxManager.address
      )
      const newContracts: Template = {}
      newContracts[address] = {
        arb: arbTokenContractRaw.connect(arbWallet),
        eth: connectedEthContract,
        symbol: await connectedEthContract.symbol(),
        allowed,
      }
      setERC721s({ ...erc721Contracts, ...newContracts })
      if (!erc721sCached.includes(address)) {
        setERC721sPersister([...erc721sCached, ...[address]])
      }
      await updateERC721Balances()
    }
  }

  const approveERC721 = async () => {
    if (!arbProvider || !erc20Contracts || !currentERC721Contract) return

    const inboxManager = await arbProvider.globalInboxConn()
    if (!currentERC721Contract) return
    try {
      const tx = await currentERC721Contract.eth.setApprovalForAll(
        inboxManager.address,
        true
      )
      await tx.wait()
    } catch (e) {
      console.warn(e)
    }
  }

  const depositERC721 = async (tokenId: string) => {
    if (
      !arbProvider ||
      !erc721Contracts ||
      !arbWallet ||
      !currentERC721Contract
    )
      return

    try {
      const tx = await arbWallet.depositERC721(
        address,
        currentERC721Contract.eth.address,
        tokenId
      )
      await tx.wait()
      await updateERC721Balances()
    } catch (e) {
      console.error('depositERC721 err', e)
    }
  }

  const withdrawERC721 = async (tokenId: string) => {
    if (
      !arbProvider ||
      !erc721Contracts ||
      !arbWallet ||
      !currentERC721Contract
    )
      return

    try {
      const tx = await currentERC721Contract.arb.withdraw(address, tokenId)
      await tx.wait()
      await updateERC721Balances()
    } catch (e) {
      console.error('withdrawERC721', e)
    }
  }

  const withdrawLockboxERC721 = async (tokenId: string) => {
    if (
      !arbProvider ||
      !erc721Contracts ||
      !arbWallet ||
      !currentERC721Contract
    )
      return

    const inboxManager = await arbWallet.globalInboxConn()

    try {
      const tx = await inboxManager.withdrawERC721(
        currentERC721Contract.eth.address,
        tokenId
      )
      await tx.wait()
      await updateERC721Balances()
    } catch (e) {
      console.error('withdrawLockboxERC721', e)
    }
  }

  const updateERC721Balances = async () => {
    if (
      !arbProvider ||
      !erc721Contracts ||
      !arbWallet ||
      !currentERC721Contract
    )
      return

    const inboxManager = await arbProvider.globalInboxConn()
    const nftsOnEth = await currentERC721Contract.eth.tokensOfOwner(address)
    const nftsOnArb = await currentERC721Contract.arb.tokensOfOwner(address)
    const totalArbNfts = await inboxManager.getERC721Tokens(
      currentERC721Contract.eth.address,
      vmId
    )
    const lockBoxNfts = await inboxManager.getERC721Tokens(
      currentERC721Contract.eth.address,
      address
    )

    setErc721Balances({
      tokens: nftsOnEth,
      arbChainTokens: nftsOnArb,
      totalArbTokens: totalArbNfts,
      lockBoxTokens: lockBoxNfts,
      asset: await currentERC721Contract.eth.symbol(),
    })
  }

  const updateAllBalances = async () => {
    await updateEthBalances()
    await updateERC20Balances()
    await updateERC721Balances()
  }
  useEffect(() => {
    /* add contract (if necessary) when new erc20 is selected */
    if (currentERC20) {
      addERC20(currentERC20)
    }

    /* add contract (if necessary) when new erc721 is selected */
    if (currentERC721) {
      addERC721(currentERC721)
    }

    /* update balances on render */
    updateAllBalances()
      .catch(e => console.error('updateAllBalances failed', e))
  }, [currentERC20, currentERC721])

  const expireCache = () => {
    setERC20sPersister([])
    setERC721sPersister([])
    setCurrentERC20('')
    setCurrentERC721State('')
  }

  // [ data , eth methods, erc20 methods, erc721 methods]
  return [
    {
      address,
      ethBalances,
      erc20Balances,
      erc721Balances,
      currentERC20,
      erc20sCached,
      currentERC721,
      currentERC20Contract,
      currentERC721Contract,
      erc721sCached,
      expireCache,
      vmId,
    },
    {
      depositEth,
      withdrawEth,
      withdrawLockboxETH,
      forceEthBalanceUpdate: updateEthBalances,
    },
    {
      setCurrentERC20,
      approveERC20,
      depositERC20,
      withdrawERC20,
      withdrawLockboxERC20,
      forceERC20BalanceUpdate: updateERC20Balances,
    },
    {
      setCurrentERC721State,
      approveERC721,
      depositERC721,
      withdrawERC721,
      withdrawLockboxERC721,
      updateERC721Balances,
      forceERC721BalanceUpdate: updateERC721Balances,
    },
  ]
}
