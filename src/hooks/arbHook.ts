import { useState, useEffect } from 'react'
import { utils, constants, ethers } from 'ethers'
import { useArbProvider } from './providersWalletsHook'
import { useLocalStorage } from '@rehooks/local-storage'
import { Balances, NFTBalances } from 'types'
import { ArbERC20 } from 'arb-provider-ethers/dist/lib/abi/ArbERC20'
import { ArbERC721 } from 'arb-provider-ethers/dist/lib/abi/ArbERC721'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { ArbERC721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC721Factory'
import { ERC20Factory } from '../util/contracts/ERC20Factory'
import { ERC20 } from '../util/contracts/ERC20'
import { ERC721 } from '../util/contracts/ERC721'
import { ERC721Factory } from '../util/contracts/ERC721Factory'

interface BridgedToken<ArbContract, EthContract> {
  arb: ArbContract
  eth: EthContract
  symbol: string
  allowed: boolean
  units?: number
}

interface ERC20BridgeToken extends BridgedToken<ArbERC20, ERC20> {
  units: number
}

interface ERC721BridgeToken extends BridgedToken<ArbERC721, ERC721> {
  units?: never
}

interface ContractStorage<T> {
  [contractAddress: string]: T
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ArbTokenBridge {}

// would it be better to encourage a flatter structure by passing in the
// ready arbProvider from the useArbProvider hook?
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex = 0
): ArbTokenBridge => {
  const [erc20Contracts, setERC20s] = useState<
    ContractStorage<ERC20BridgeToken>
  >({})
  const [erc721Contracts, setERC721s] = useState<
    ContractStorage<ERC721BridgeToken>
  >({})

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
  const { arbProvider, vmId, walletAddress } = useArbProvider(
    validatorUrl,
    ethProvider,
    walletIndex
  )
  if (!arbProvider) throw new Error('ap not present') // this is bad - fix async?

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
  const updateEthBalances = async () => {
    if (!arbProvider || !ethWallet) return

    const inboxManager = await arbProvider.globalInboxConn()

    const ethBalanceWei = await ethWallet.getBalance()
    const arbChainEthBalanceWei = await inboxManager.getEthBalance(vmId)
    const lockBoxBalanceWei = await inboxManager.getEthBalance(walletAddress)
    const arbEthBalanceWei = await arbProvider.getBalance(walletAddress)

    const { formatEther } = utils
    setEthBalances({
      balance: formatEther(ethBalanceWei),
      arbChainBalance: formatEther(arbEthBalanceWei),
      lockBoxBalance: formatEther(lockBoxBalanceWei),
      totalArbBalance: formatEther(arbChainEthBalanceWei),
      asset: 'ETH',
    })
  }

  const depositEth = async (ethValue: string) => {
    if (!arbWallet) return
    const weiValue: utils.BigNumber = utils.parseEther(ethValue)
    try {
      const tx = await arbWallet.depositETH(walletAddress, weiValue)
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

      const ethTokenContract = ERC20Factory.connect(
        address,
        arbProvider.provider.getSigner(walletIndex)
      )
      const arbTokenContract = ArbERC20Factory.connect(
        address,
        arbProvider.getSigner(walletIndex)
      )

      // TODO should be checking against another number for `allowed` presumably
      const allowance = await ethTokenContract.allowance(
        address,
        inboxManager.address
      )
      const allowed = allowance.gt(utils.bigNumberify(0))

      setERC20s({
        ...erc20Contracts,
        [address]: {
          arb: arbTokenContract,
          eth: ethTokenContract,
          units: await ethTokenContract.decimals(),
          symbol: await ethTokenContract.symbol(),
          allowed,
        },
      })
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
    try {
      const tx = await currentERC20Contract.eth.approve(
        inboxManager.address,
        constants.MaxUint256
      )
      await tx.wait()
    } catch (e) {
      console.warn(e)
    }
    const erc20Address: string = currentERC20Contract.eth.address
    setERC20s((contracts) => {
      return {
        ...contracts,
        [erc20Address]: { ...contracts[erc20Address], allowed: true },
      }
    })
  }

  const updateERC20Balances = async () => {
    if (!arbProvider || !erc20Contracts || !arbWallet || !currentERC20Contract)
      return

    const inboxManager = await arbProvider.globalInboxConn()
    const tokenBalanceRaw = await currentERC20Contract.eth.balanceOf(
      walletAddress
    )
    const totalArbBalance = await inboxManager.getERC20Balance(
      currentERC20Contract.eth.address,
      vmId
    )
    const lockBoxBalance = await inboxManager.getERC20Balance(
      currentERC20Contract.eth.address,
      walletAddress
    )

    const arbBalance = await currentERC20Contract.arb.balanceOf(walletAddress)
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

  const depositERC20 = async (value: string) => {
    if (!arbProvider || !erc20Contracts || !arbWallet || !currentERC20Contract)
      return

    const val = utils.parseUnits(value, currentERC20Contract.units)
    try {
      const tx = await arbWallet.depositERC20(
        walletAddress,
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
      const tx = await currentERC20Contract.arb.withdraw(walletAddress, val)
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  const withdrawLockboxERC20 = async () => {
    if (!arbWallet || !currentERC20Contract) return

    try {
      const inboxManager = await arbWallet.globalInboxConn()
      const tx = await inboxManager.withdrawERC20(
        currentERC20Contract.eth.address
      )
      await tx.wait()
      await updateERC20Balances()
    } catch (e) {
      console.warn(e)
    }
  }

  /*
ERC 721 Methods
*/

  const updateERC721Balances = async () => {
    if (
      !arbProvider ||
      !erc721Contracts ||
      !arbWallet ||
      !currentERC721Contract
    )
      return

    const inboxManager = await arbProvider.globalInboxConn()
    const nftsOnEth = await currentERC721Contract.eth.tokensOfOwner(
      walletAddress
    )
    const nftsOnArb = await currentERC721Contract.arb.tokensOfOwner(
      walletAddress
    )
    const totalArbNfts = await inboxManager.getERC721Tokens(
      currentERC721Contract.eth.address,
      vmId
    )
    const lockBoxNfts = await inboxManager.getERC721Tokens(
      currentERC721Contract.eth.address,
      walletAddress
    )

    setErc721Balances({
      tokens: nftsOnEth,
      arbChainTokens: nftsOnArb,
      totalArbTokens: totalArbNfts,
      lockBoxTokens: lockBoxNfts,
      asset: await currentERC721Contract.eth.symbol(),
    })
  }

  const addERC721 = async (addressParam: string | undefined) => {
    if (!arbProvider || !currentERC721 || !erc721sCached) return
    const address = addressParam ? addressParam : currentERC721
    const code = await arbProvider.provider.getCode(address)
    // TODO: better santiy check
    if (code.length > 2) {
      const inboxManager = await arbProvider.globalInboxConn()

      const ethTokenContract = ERC721Factory.connect(
        address,
        arbProvider.provider.getSigner(walletIndex)
      )
      const arbTokenContract = ArbERC721Factory.connect(
        address,
        arbProvider.getSigner(walletIndex)
      )

      const allowed = await ethTokenContract.isApprovedForAll(
        address,
        inboxManager.address
      )

      setERC721s({
        ...erc721Contracts,
        [address]: {
          arb: arbTokenContract,
          eth: ethTokenContract,
          symbol: await ethTokenContract.symbol(),
          allowed,
        },
      })
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
        walletAddress,
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
      const tx = await currentERC721Contract.arb.withdraw(
        walletAddress,
        tokenId
      )
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

  const updateAllBalances = async () => {
    await updateEthBalances()
    await updateERC20Balances()
    await updateERC721Balances()
  }

  const expireCache = () => {
    setERC20sPersister([])
    setERC721sPersister([])
    setCurrentERC20('')
    setCurrentERC721State('')
  }

  // TODO only register once
  arbProvider.arbRollupConn().then((rollup) =>
    rollup.on('ConfirmedAssertion', () => {
      console.log('event triggered balance update')
      updateAllBalances()
    })
  )

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
    updateAllBalances().catch((e) =>
      console.error('updateAllBalances failed', e)
    )
  }, [currentERC20, currentERC721])

  // [ data , eth methods, erc20 methods, erc721 methods]
  return [
    {
      address: walletAddress,
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
