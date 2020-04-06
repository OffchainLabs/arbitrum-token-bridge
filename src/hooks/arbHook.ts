import { useState, useEffect } from 'react'
import { utils, constants, ethers, ContractTransaction } from 'ethers'
import { useArbProvider } from './providersWalletsHook'
import { useLocalStorage } from '@rehooks/local-storage'
import { ArbERC20 } from 'arb-provider-ethers/dist/lib/abi/ArbERC20'
import { ArbERC721 } from 'arb-provider-ethers/dist/lib/abi/ArbERC721'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { ArbERC721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC721Factory'
import {
  ERC20Factory,
  ERC20,
  ERC721,
  ERC721Factory,
  assertNever,
} from '../util'
import { ContractReceipt } from 'ethers/contract'

/* eslint-disable no-shadow */
enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
}
/* eslint-enable no-shadow */

interface BridgedToken {
  type: TokenType
  arb: ArbERC20 | ArbERC721
  eth: ERC20 | ERC721
  symbol: string
  allowed: boolean
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: ArbERC20
  eth: ERC20
  units: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: ArbERC721
  eth: ERC721
}

type BridgeToken = ERC20BridgeToken | ERC721BridgeToken

interface ContractStorage {
  [contractAddress: string]: BridgeToken | undefined
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
// interface ArbTokenBridge { }
type ArbTokenBridge = any

interface Balances { }
interface NFTBalances { }
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex = 0
): ArbTokenBridge => {
  const [tokenContracts, setTokenContracts] = useState<ContractStorage>({})

  // TODO load all contracts - in useEffect or on select?
  // use local storage for list of token addresses
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

  /* token fns */
  // TODO error handling promises with try catch

  const updateTokenBalances = async (type?: TokenType): Promise<void> => {
    if (!arbProvider) throw new Error('updateTokenBalances missing req')

    const inboxManager = await arbProvider.globalInboxConn()
    const filtered = Object.values(tokenContracts).filter((c) => {
      return !!c && (!type || c.type === type)
    }) as BridgeToken[]

    for (const contract of filtered) {
      switch (contract.type) {
        case TokenType.ERC20:
          const format = (value: utils.BigNumber) =>
            utils.formatUnits(value, contract.units)

          setERC20Balances({
            balance: format(await contract.eth.balanceOf(walletAddress)),
            arbChainBalance: format(
              await contract.arb.balanceOf(walletAddress)
            ),
            lockBoxBalance: format(
              await inboxManager.getERC20Balance(
                contract.eth.address,
                walletAddress
              )
            ),
            totalArbBalance: format(
              await inboxManager.getERC20Balance(contract.eth.address, vmId)
            ),
            asset: contract.symbol,
          })
          break
        case TokenType.ERC721:
          const nftsOnEth = await contract.eth.tokensOfOwner(walletAddress)
          const nftsOnArb = await contract.arb.tokensOfOwner(walletAddress)
          const totalArbNfts = await inboxManager.getERC721Tokens(
            contract.eth.address,
            vmId
          )
          const lockBoxNfts = await inboxManager.getERC721Tokens(
            contract.eth.address,
            walletAddress
          )

          setErc721Balances({
            tokens: nftsOnEth,
            arbChainTokens: nftsOnArb,
            totalArbTokens: totalArbNfts,
            lockBoxTokens: lockBoxNfts,
            asset: await contract.eth.symbol(),
          })
          break
        default:
          assertNever(contract, 'updateTokenBalances exhaustive check failed')
      }
    }
  }

  const approveToken = async (
    contractAddress: string
  ): Promise<ContractReceipt> => {
    if (!arbProvider) throw new Error('approve missing provider')

    const contract = tokenContracts[contractAddress]
    if (!contract) {
      throw new Error(`Contract ${contractAddress} not present`)
    }

    const inboxManager = await arbProvider.globalInboxConn()

    let tx: ContractTransaction
    switch (contract.type) {
      case TokenType.ERC20:
        tx = await contract.eth.approve(
          inboxManager.address,
          constants.MaxUint256
        )
        break
      case TokenType.ERC721:
        tx = await contract.eth.setApprovalForAll(inboxManager.address, true)
        break
      default:
        assertNever(contract, 'approveToken exhaustive check failed')
    }

    const receipt = await tx.wait()

    setTokenContracts((contracts) => {
      const target = contracts[contractAddress]
      if (!target) throw Error('approved contract missing ' + contractAddress)

      const updated = {
        ...target,
        allowed: true,
      }

      return {
        ...contracts,
        [contractAddress]: updated,
      }
    })

    return receipt
  }

  const depositToken = async (
    contractAddress: string,
    amountOrTokenId: string
  ): Promise<ContractReceipt> => {
    if (!arbProvider) throw new Error('deposit missing req')

    const contract = tokenContracts[contractAddress]
    if (!contract) throw new Error('contract not present')

    // TODO trigger balance updates
    let tx: ContractTransaction
    switch (contract.type) {
      case TokenType.ERC20:
        const amount = utils.parseUnits(amountOrTokenId, contract.units)
        tx = await arbWallet.depositERC20(
          walletAddress,
          contract.eth.address,
          amount
        )
        break
      case TokenType.ERC721:
        tx = await arbWallet.depositERC721(
          walletAddress,
          contract.eth.address,
          amountOrTokenId
        )
        break
      default:
        assertNever(contract, 'depositToken exhaustive check failed')
    }

    return await tx.wait()
  }

  const withdrawToken = async (
    contractAddress: string,
    amountOrTokenId: string
  ): Promise<ContractReceipt> => {
    if (!arbProvider) throw new Error('withdrawToken missing req')

    const contract = tokenContracts[contractAddress]
    if (!contract) throw new Error('contract not present')

    // TODO trigger balance updates
    let tx: ContractTransaction
    switch (contract.type) {
      case TokenType.ERC20:
        tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
        break
      case TokenType.ERC721:
        tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
        break
      default:
        assertNever(contract, 'withdrawToken exhaustive check failed')
    }

    return await tx.wait()
  }

  const withdrawLockboxToken = async (
    contractAddress: string,
    tokenId?: string
  ): Promise<ContractReceipt> => {
    if (!arbProvider) throw new Error('withdrawLockboxToken missing req')

    const contract = tokenContracts[contractAddress]
    if (!contract) throw new Error('contract not present')

    const inboxManager = await arbWallet.globalInboxConn()

    // TODO error handle
    // TODO trigger balance updates
    let tx: ContractTransaction
    switch (contract.type) {
      case TokenType.ERC20:
        tx = await inboxManager.withdrawERC20(contract.eth.address)
        break
      case TokenType.ERC721:
        if (!tokenId) {
          throw Error('withdrawLockbox tokenId not present ' + contractAddress)
        }
        tx = await inboxManager.withdrawERC721(contract.eth.address, tokenId)
        break
      default:
        assertNever(contract, 'withdrawLockboxToken exhaustive check failed')
    }

    return await tx.wait()
  }

  const addToken = async (contractAddress: string, type: TokenType) => {
    if (!arbProvider) throw Error('addToken missing req')

    // TODO is this the best test? is it needed - can we rely on connect err?
    const isContract =
      (await arbProvider.provider.getCode(contractAddress)).length > 2
    if (!isContract) throw Error('address is not a contract')
    else if (tokenContracts[contractAddress]) throw Error('contract is present')

    const inboxManager = await arbProvider.globalInboxConn()

    // TODO error handle
    // TODO trigger balance updates
    let newContract: BridgeToken
    switch (type) {
      case TokenType.ERC20:
        const arbERC20 = ArbERC20Factory.connect(
          contractAddress,
          arbProvider.getSigner(walletIndex)
        )
        const ethERC20 = ERC20Factory.connect(
          contractAddress,
          arbProvider.provider.getSigner(walletIndex)
        )

        // TODO should be checking against another number for `allowed` presumably
        const allowance = await ethERC20.allowance(
          walletAddress,
          inboxManager.address
        )

        newContract = {
          arb: arbERC20,
          eth: ethERC20,
          type,
          allowed: allowance.gt(utils.bigNumberify(0)),
          units: await ethERC20.decimals(),
          symbol: await ethERC20.symbol(),
        }

        if (erc20sCached && !erc20sCached.includes(contractAddress)) {
          setERC20sPersister([...erc20sCached, contractAddress])
        }
        break
      case TokenType.ERC721:
        const arbERC721 = ArbERC721Factory.connect(
          contractAddress,
          arbProvider.getSigner(walletIndex)
        )
        const ethERC721 = ERC721Factory.connect(
          contractAddress,
          arbProvider.provider.getSigner(walletIndex)
        )

        newContract = {
          arb: arbERC721,
          eth: ethERC721,
          type,
          symbol: await ethERC721.symbol(),
          allowed: await ethERC721.isApprovedForAll(
            walletAddress,
            inboxManager.address
          ),
        }
        if (erc721sCached && !erc721sCached.includes(contractAddress)) {
          setERC721sPersister([...erc721sCached, contractAddress])
        }
        break
      default:
        assertNever(type, 'addToken exhaustive check failed')
    }

    setTokenContracts((contracts) => {
      return {
        ...contracts,
        [contractAddress]: newContract,
      }
    })
  }

  const updateAllBalances = async () => {
    await updateEthBalances()
    await updateTokenBalances()
  }

  const expireCache = () => {
    setERC20sPersister([])
    setERC721sPersister([])
  }

  // TODO only register once
  arbProvider.arbRollupConn().then((rollup) =>
    rollup.on('ConfirmedAssertion', () => {
      console.log('event triggered balance update')
      updateAllBalances()
    })
  )

  useEffect(() => {
    /* update balances on render */
    updateAllBalances().catch((e) =>
      console.error('updateAllBalances failed', e)
    )
  })

  // [ data , eth methods, erc20 methods, erc721 methods]
  return [
    {
      address: walletAddress,
      ethBalances,
      erc20Balances,
      erc721Balances,
      erc20sCached,
      erc721sCached,
      expireCache,
      vmId,
    },
    // store individual token balances with their methods?
    // remove 'force' fn?
    {
      depositEth,
      withdrawEth,
      withdrawLockboxETH,
      forceEthBalanceUpdate: updateEthBalances,
    },
    {
      approveToken,
      depositToken,
      withdrawToken,
      withdrawLockboxToken,
      updateTokenBalances,
    },
  ]
}
