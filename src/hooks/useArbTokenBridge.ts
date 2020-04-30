import { useCallback, useEffect, useState, useRef } from 'react'
import { ContractTransaction, constants, ethers, utils } from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import { ContractReceipt } from 'ethers/contract'
import {
  ERC20,
  ERC721,
  ERC20Factory,
  ERC721Factory,
  assertNever
} from '../util'
import { useArbProvider } from './useArbProvider'
import type { abi } from 'arb-provider-ethers'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { ArbERC721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC721Factory'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEquals = require('lodash.isequal')
const cloneDeep = require('lodash.clonedeep')
const isEmpty = require('lodash.isempty')

const MIN_APPROVAL = constants.MaxUint256

/* eslint-disable no-shadow */
export enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721'
}
/* eslint-enable no-shadow */

export enum AssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ETH = 'ETH'
}

interface PendingWithdrawals {
  [assertionHash: string]: PendingWithdrawal
}

interface PendingWithdrawalSuper {
  blockHeight: number | undefined
  value: utils.BigNumber | string
  from?: string
}

interface PendingWithdrawal extends PendingWithdrawalSuper {
  value: utils.BigNumber
}

interface PendingWithdrawalCache extends PendingWithdrawalSuper {
  value: string
  type: AssetType
  address?: string
}

interface PendingWithdrawalsCache {
  [assertionHash: string]: PendingWithdrawalCache
}

interface BridgedToken {
  type: TokenType
  name: string
  symbol: string
  allowed: boolean
  arb: abi.ArbERC20 | abi.ArbERC721
  eth: ERC20 | ERC721
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: abi.ArbERC20
  eth: ERC20
  decimals: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: abi.ArbERC721
  eth: ERC721
}

export type BridgeToken = ERC20BridgeToken | ERC721BridgeToken

export interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}

export interface BridgeBalance {
  balance: utils.BigNumber
  arbChainBalance: utils.BigNumber
  totalArbBalance: utils.BigNumber
  lockBoxBalance: utils.BigNumber
  pendingWithdrawals: PendingWithdrawals
}

// removing 'tokens' / 'balance' could result in one interface
export interface ERC721Balance {
  tokens: utils.BigNumber[]
  arbChainTokens: utils.BigNumber[]
  totalArbTokens: utils.BigNumber[]
  lockBoxTokens: utils.BigNumber[]
  pendingWithdrawals: PendingWithdrawals
}

interface BridgeConfig {
  vmId: string
  walletAddress: string
}

// helpers:
const pWToPWCache = (
  pW: PendingWithdrawal,
  type: AssetType,
  address?: string
): PendingWithdrawalCache => {
  return { ...pW, value: pW.value.toString(), type, address }
}
const pWCacheToPW = (pWCache: PendingWithdrawalCache): PendingWithdrawal => {
  return {
    value: utils.bigNumberify(pWCache.value),
    blockHeight: pWCache.blockHeight
  }
}

const usePrevious = (value: any) => {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

type TokenBalance = BridgeBalance | ERC721Balance
type StorageBalance = ContractStorage<TokenBalance>

function mergeAndPreservePWs<T extends TokenBalance>(
  prevBalances: ContractStorage<T>,
  latestBalances: ContractStorage<T>
) {
  // return latest balance but override all pending withdrawals from prevBalance
  const freshBalances: ContractStorage<T> = {}

  for (const hash in latestBalances) {
    const latestBalance: T | undefined = latestBalances[hash]
    if (!latestBalance)
      throw new Error('Err in balance merge: impossible operation')

    const previousBalance: T | undefined = prevBalances[hash]
    if (!previousBalance) {
      // here, we could be in a state update after a token has just been added; we can safely skip
      freshBalances[hash] = latestBalance
    } else {
      freshBalances[hash] = {
        ...latestBalance,
        pendingWithdrawals: previousBalance.pendingWithdrawals
      }
    }
  }

  return freshBalances
}

// interface ArbTokenBridge { }

// may be worthwhile to separate state from token bridge fn
// should there be a 'ready' property? this would make checks simpler int + ext
// store inbox mgr in state?
// TODO error handling promises with try catch
// TODO more control & details about approvals
// TODO extract shared contract interaction logic?
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex = 0,
  autoLoadCache = true
) => {
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<BridgeToken>
  >({})

  const defaultBalance = {
    balance: constants.Zero,
    arbChainBalance: constants.Zero,
    totalArbBalance: constants.Zero,
    lockBoxBalance: constants.Zero,
    pendingWithdrawals: <PendingWithdrawals>{}
  }
  const [ethBalances, setEthBalances] = useState<BridgeBalance>(defaultBalance)

  const balanceIsEmpty = (balance: BridgeBalance) =>
    balance['balance'] === defaultBalance['balance'] &&
    balance['arbChainBalance'] === defaultBalance['arbChainBalance'] &&
    balance['totalArbBalance'] === defaultBalance['totalArbBalance'] &&
    balance['lockBoxBalance'] === defaultBalance['lockBoxBalance']

  const [erc20Balances, setErc20Balances] = useState<
    ContractStorage<BridgeBalance>
  >({})
  const [erc721Balances, setErc721Balances] = useState<
    ContractStorage<ERC721Balance>
  >({})

  const prevEthBalances: BridgeBalance | undefined = usePrevious(ethBalances)
  const prevERC20Balances:
    | ContractStorage<BridgeBalance>
    | undefined = usePrevious(erc20Balances)
  const prevERC721Balances:
    | ContractStorage<ERC721Balance>
    | undefined = usePrevious(erc721Balances)
  // use local storage for list of token addresses
  // TODO remove type assertion when hook dependency fix update is released
  const [ERC20Cache, setERC20Cache, clearERC20Cache] = useLocalStorage<
    string[]
  >('ERC20Cache', []) as [
    string[],
    React.Dispatch<string[]>,
    React.Dispatch<void>
  ]
  const [ERC721Cache, setERC721Cache, clearERC721Cache] = useLocalStorage<
    string[]
  >('ERC721Cache', []) as [
    string[],
    React.Dispatch<string[]>,
    React.Dispatch<void>
  ]

  const [pWsCache, setPWsCache, clearPWsCache] = useLocalStorage<
    PendingWithdrawalsCache
  >('PendingWithdrawalsCache', {}) as [
    PendingWithdrawalsCache,
    React.Dispatch<PendingWithdrawalsCache>,
    React.Dispatch<void>
  ]
  console.warn('pws cahce', pWsCache)

  const [{ walletAddress, vmId }, setConfig] = useState<BridgeConfig>({
    walletAddress: '',
    vmId: ''
  })

  const arbProvider = useArbProvider(validatorUrl, ethProvider)
  const arbWallet = arbProvider?.getSigner(walletIndex)

  /* pending withdrawals cache*/

  const addToPWCache = (
    pW: PendingWithdrawal,
    nodeHash: string,
    type: AssetType
  ) => {
    // converts bignum to number for local storage
    setPWsCache({
      ...pWsCache,
      [nodeHash]: pWToPWCache(pW, type)
    })
  }

  const removeFromPWCache = (nodeHash: string) => {
    const newPWsCache: PendingWithdrawalsCache = { ...pWsCache }
    if (newPWsCache) {
      delete newPWsCache[nodeHash]
      setPWsCache(newPWsCache)
    }
  }

  const addCachedPWsToBalances = useCallback(() => {
    const ethBalanceCopy: BridgeBalance = cloneDeep(ethBalances)
    const erc20BalancesCopy: ContractStorage<BridgeBalance> = cloneDeep(
      erc20Balances
    )
    const erc721BalancesCopy: ContractStorage<ERC721Balance> = cloneDeep(
      erc721Balances
    )

    let ethUpdate = false
    let erc20Update = false
    let erc721Update = false

    for (const nodeHash in pWsCache) {
      const pWCache = pWsCache[nodeHash]
      const pW = pWCacheToPW(pWCache)
      switch (pWCache.type) {
        case AssetType.ETH: {
          ethBalanceCopy.pendingWithdrawals[nodeHash] = pW
          ethUpdate = true
          break
        }
        case AssetType.ERC20: {
          const address = pWCache.address
          if (!address) continue
          const balance = erc20BalancesCopy[address]
          if (!balance) continue
          if (!balance.pendingWithdrawals[nodeHash]) {
            balance.pendingWithdrawals[nodeHash] = pW
            erc20Update = true
          }
          break
        }
        case AssetType.ERC721: {
          const address = pWCache.address
          if (!address) continue
          const balance = erc721BalancesCopy[address]
          if (!balance) continue
          if (!balance.pendingWithdrawals[nodeHash]) {
            balance.pendingWithdrawals[nodeHash] = pW
            erc721Update = true
          }
          break
        }
        default:
          break
      }
    }
    if (ethUpdate) {
      setEthBalances(ethBalanceCopy)
    }
    if (erc20Update) {
      setErc20Balances(erc20BalancesCopy)
    }
    if (erc721Update) {
      setErc721Balances(erc721BalancesCopy)
    }
  }, [ethBalances, erc20Balances, erc721Balances])

  /*
  ETH METHODS:
  */
  const updateEthBalances = useCallback(async () => {
    if (!arbProvider) throw new Error('updateEthBalances no arb provider')
    if (!vmId) throw new Error('updateEthBalances no vmId')
    if (!walletAddress) throw new Error('updateEthBalances walletAddress')

    const inboxManager = await arbProvider.globalInboxConn()
    const ethWallet = arbProvider.ethProvider.getSigner(walletIndex)

    const [
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
    ] = await Promise.all([
      ethWallet.getBalance(),
      arbProvider.getBalance(walletAddress),
      inboxManager.getEthBalance(walletAddress),
      inboxManager.getEthBalance(vmId)
    ])

    const update: typeof ethBalances = {
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance,
      pendingWithdrawals: <PendingWithdrawals>{}
    }

    let different = true
    for (const key in ethBalances) {
      const k = key as keyof typeof ethBalances
      different = ethBalances[k] !== update[k]
    }

    if (!deepEquals(ethBalances, update)) {
      // if (different) {
      setEthBalances(oldBalances => {
        return { ...update, pendingWithdrawals: oldBalances.pendingWithdrawals }
      })
    }
  }, [arbProvider, ethBalances, vmId, walletAddress, walletIndex])

  const depositEth = useCallback(
    async (etherVal: string) => {
      if (!arbWallet || !walletAddress)
        throw new Error('depositEth no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      try {
        const tx = await arbWallet.depositETH(walletAddress, weiValue)
        const receipt = await tx.wait()
        updateEthBalances()
        return receipt
      } catch (e) {
        console.error('depositEth err: ' + e)
      }
    },
    [arbWallet, walletAddress, updateEthBalances]
  )

  const withdrawEth = useCallback(
    async (etherVal: string) => {
      if (!arbWallet || !arbProvider || !walletAddress)
        throw new Error('withdrawETH no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      try {
        const tx = await arbWallet.withdrawEthFromChain(weiValue)

        const receipt = await tx.wait()
        updateEthBalances()
        const { hash } = tx
        if (!hash)
          throw new Error("Withdraw error: Transactions doesn't include hash")

        arbProvider.getMessageResult(hash).then(data => {
          if (!data) return
          const pendingWithdrawal: PendingWithdrawal = {
            value: weiValue,
            blockHeight: receipt.blockNumber,
            from: walletAddress
          }
          const newEthBalances = { ...ethBalances }
          ethBalances.pendingWithdrawals[
            data!.validNodeHash
          ] = pendingWithdrawal
          setEthBalances(newEthBalances)
          addToPWCache(pendingWithdrawal, data.validNodeHash, AssetType.ETH)
        })
        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
      }
    },
    [arbWallet, updateEthBalances]
  )

  const withdrawLockBoxETH = useCallback(async () => {
    if (!arbProvider) throw new Error('withdrawLockBoxETH no arbprovider')

    try {
      const inboxManager = (await arbProvider.globalInboxConn()).connect(
        arbProvider.ethProvider.getSigner(walletIndex)
      )
      const tx = await inboxManager.withdrawEth()
      const receipt = await tx.wait()
      updateEthBalances()
      return receipt
    } catch (e) {
      console.error('withdrawLockBoxETH err', e)
    }
  }, [arbProvider, updateEthBalances])

  /* TOKEN METHODS */

  // TODO targeted token updates to prevent unneeded iteration
  const updateTokenBalances = useCallback(
    async (type?: TokenType): Promise<void> => {
      if (!arbProvider || !walletAddress)
        throw new Error('updateTokenBalances missing req')

      const inboxManager = await arbProvider.globalInboxConn()

      const filtered = Object.values(bridgeTokens).filter(c => {
        return !!c && (!type || c.type === type)
      }) as BridgeToken[]

      const erc20Updates: typeof erc20Balances = {}
      const erc721Updates: typeof erc721Balances = {}

      for (const contract of filtered) {
        switch (contract.type) {
          case TokenType.ERC20: {
            const [
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance
            ] = await Promise.all([
              contract.eth.balanceOf(walletAddress),
              contract.arb.balanceOf(walletAddress),
              inboxManager.getERC20Balance(contract.eth.address, walletAddress),
              inboxManager.getERC20Balance(contract.eth.address, vmId)
            ])
            const erc20Balance = erc20Balances[contract.eth.address]
            const updated = {
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance,
              pendingWithdrawals: erc20Balance
                ? erc20Balance.pendingWithdrawals
                : <PendingWithdrawals>{}
            }

            erc20Updates[contract.eth.address] = updated

            break
          }
          case TokenType.ERC721: {
            const [
              tokens,
              arbChainTokens,
              lockBoxTokens,
              totalArbTokens
            ] = await Promise.all([
              contract.eth.tokensOfOwner(walletAddress),
              contract.arb.tokensOfOwner(walletAddress),
              inboxManager.getERC721Tokens(contract.eth.address, walletAddress),
              inboxManager.getERC721Tokens(contract.eth.address, vmId)
            ])
            const erc721Balance = erc721Balances[contract.eth.address]

            const updated = {
              tokens,
              arbChainTokens,
              totalArbTokens,
              lockBoxTokens,
              pendingWithdrawals: erc721Balance
                ? erc721Balance.pendingWithdrawals
                : <PendingWithdrawals>{}
            }
            erc721Updates[contract.eth.address] = updated
            break
          }
          default:
            assertNever(contract, 'updateTokenBalances exhaustive check failed')
        }
      }

      if (!deepEquals(erc20Balances, erc20Updates)) {
        setErc20Balances(balances =>
          mergeAndPreservePWs<BridgeBalance>(balances, erc20Updates)
        )
      }
      if (!deepEquals(erc721Balances, erc721Updates)) {
        setErc721Balances(balances =>
          mergeAndPreservePWs<ERC721Balance>(balances, erc721Updates)
        )
      }
    },
    [
      arbProvider,
      erc20Balances,
      erc721Balances,
      bridgeTokens,
      vmId,
      walletAddress
    ]
  )
  const approveToken = useCallback(
    async (contractAddress: string): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('approve missing provider')

      const contract = bridgeTokens[contractAddress]
      if (!contract) {
        throw new Error(`Contract ${contractAddress} not present`)
      }

      const inboxManager = await arbProvider.globalInboxConn()

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await contract.eth.approve(inboxManager.address, MIN_APPROVAL)
          break
        case TokenType.ERC721:
          tx = await contract.eth.setApprovalForAll(inboxManager.address, true)
          break
        default:
          assertNever(contract, 'approveToken exhaustive check failed')
      }

      const receipt = await tx.wait()

      setBridgeTokens(contracts => {
        const target = contracts[contractAddress]
        if (!target) throw Error('approved contract missing ' + contractAddress)

        const updated = {
          ...target,
          allowed: true
        }

        return {
          ...contracts,
          [contractAddress]: updated
        }
      })

      return receipt
    },
    [arbProvider, bridgeTokens]
  )

  const depositToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!arbWallet || !walletAddress) throw new Error('deposit missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO fail fast if not approved

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
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

      const receipt = await tx.wait()
      updateTokenBalances(contract.type)
      return receipt
    },
    [arbWallet, walletAddress, bridgeTokens]
  )

  const withdrawToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!walletAddress) throw new Error('withdraw token no walletAddress')
      if (!arbProvider) throw new Error('withdraw token no arbProvider')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await contract.arb.withdraw(walletAddress, amount)
          break
        case TokenType.ERC721:
          tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
          break
        default:
          assertNever(contract, 'withdrawToken exhaustive check failed')
      }

      const receipt = await tx.wait()

      const { hash } = tx

      if (!hash) throw new Error('withdrawToken: missing hash in txn')

      arbProvider.getMessageResult(hash).then(data => {
        if (!data) return
        const pendingWithdrawal: PendingWithdrawal = {
          value: utils.parseEther(amountOrTokenId),
          blockHeight: receipt.blockNumber,
          from: walletAddress
        }
        /* add to pending withdrawals and update without mutating
          ERC20 && ERC721 could probably by DRYed up, but had typing issues, so keeping separate
        */
        if (contract.type === TokenType.ERC20) {
          const balance = erc20Balances?.[contractAddress]
          if (!balance) return
          const newPendingWithdrawals: PendingWithdrawals = {
            ...balance.pendingWithdrawals,
            [data.validNodeHash]: pendingWithdrawal
          }
          const newBalance: BridgeBalance = {
            ...balance,
            pendingWithdrawals: newPendingWithdrawals
          }
          const newBalances: ContractStorage<BridgeBalance> = {
            ...erc20Balances,
            [contractAddress]: newBalance
          }
          setErc20Balances(newBalances)
          addToPWCache(pendingWithdrawal, data.validNodeHash, AssetType.ERC20)
        } else if (contract.type === TokenType.ERC721) {
          const balance = erc721Balances?.[contractAddress]
          if (!balance) return
          const newPendingWithdrawals: PendingWithdrawals = {
            ...balance.pendingWithdrawals,
            [data.validNodeHash]: pendingWithdrawal
          }
          const newBalance: ERC721Balance = {
            ...balance,
            pendingWithdrawals: newPendingWithdrawals
          }
          const newBalances: ContractStorage<ERC721Balance> = {
            ...erc721Balances,
            [contractAddress]: newBalance
          }
          setErc721Balances(newBalances)
          addToPWCache(pendingWithdrawal, data.validNodeHash, AssetType.ERC721)
        }
      })

      updateTokenBalances(contract.type)
      return receipt
    },
    [walletAddress, bridgeTokens, erc20Balances, erc721Balances]
  )

  const withdrawLockBoxToken = useCallback(
    async (
      contractAddress: string,
      tokenId?: string
    ): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('withdrawLockBoxToken missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      const inboxManager = (await arbProvider.globalInboxConn()).connect(
        arbProvider.ethProvider.getSigner(walletIndex)
      )

      // TODO error handle
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await inboxManager.withdrawERC20(contract.eth.address)
          break
        case TokenType.ERC721:
          if (!tokenId) {
            throw Error(
              'withdrawLockBox tokenId not present ' + contractAddress
            )
          }
          tx = await inboxManager.withdrawERC721(contract.eth.address, tokenId)
          break
        default:
          assertNever(contract, 'withdrawLockBoxToken exhaustive check failed')
      }

      const receipt = await tx.wait()
      updateTokenBalances(contract.type)
      return receipt
    },
    [arbProvider, bridgeTokens]
  )

  const addToken = useCallback(
    async (contractAddress: string, type: TokenType): Promise<string> => {
      if (!arbProvider || !walletAddress || !arbWallet)
        throw Error('addToken missing req')

      const isEthContract =
        (await arbProvider.ethProvider.getCode(contractAddress)).length > 2
      if (!isEthContract) throw Error('contract is not deployed on eth')
      else if (bridgeTokens[contractAddress]) throw Error('token already added')

      const inboxManager = await arbProvider.globalInboxConn()

      // TODO error handle
      let newContract: BridgeToken
      switch (type) {
        case TokenType.ERC20: {
          const arbContractCode = await arbProvider.getCode(contractAddress)
          if (arbContractCode === '0x') {
            console.warn('contract does not exist')
            // TODO replace with non signature required handling
            await arbWallet.depositERC20(walletAddress, contractAddress, 0)
          }

          const arbERC20 = ArbERC20Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC20 = ERC20Factory.connect(
            contractAddress,
            arbProvider.ethProvider.getSigner(walletIndex)
          )

          const [allowance, name, decimals, symbol] = await Promise.all([
            ethERC20.allowance(walletAddress, inboxManager.address),
            ethERC20.name(),
            ethERC20.decimals(),
            ethERC20.symbol()
          ])

          newContract = {
            arb: arbERC20,
            eth: ethERC20,
            type,
            allowed: allowance.gte(MIN_APPROVAL),
            name,
            decimals,
            symbol
          }

          if (!ERC20Cache?.includes(contractAddress)) {
            setERC20Cache([...ERC20Cache, contractAddress])
          }
          break
        }
        case TokenType.ERC721: {
          const arbERC721 = ArbERC721Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC721 = ERC721Factory.connect(
            contractAddress,
            arbProvider.ethProvider.getSigner(walletIndex)
          )

          const [allowed, name, symbol] = await Promise.all([
            ethERC721.isApprovedForAll(walletAddress, inboxManager.address),
            ethERC721.name(),
            ethERC721.symbol()
          ])

          newContract = {
            arb: arbERC721,
            eth: ethERC721,
            type,
            name,
            symbol,
            allowed
          }
          if (ERC721Cache && !ERC721Cache.includes(contractAddress)) {
            setERC721Cache([...ERC721Cache, contractAddress])
          }
          break
        }
        default:
          assertNever(type, 'addToken exhaustive check failed')
      }

      setBridgeTokens(contracts => {
        return {
          ...contracts,
          [contractAddress]: newContract
        }
      })

      // we await here to ensure initial balance entry is set
      await updateTokenBalances(type)
      return contractAddress
    },
    [arbProvider, walletAddress, bridgeTokens, updateTokenBalances]
  )

  const updateAllBalances = useCallback(
    () => Promise.all([updateEthBalances(), updateTokenBalances()]),
    [updateEthBalances, updateTokenBalances]
  )

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  const updatePendingWithdrawals = useCallback(
    (rollup: any, assertionHash: string) => {
      if (!arbProvider)
        throw new Error('updatePendingWithdrawals no arb provider')

      Promise.all([rollup.vmParams(), arbProvider.getBlockNumber()]).then(
        ([vmParams, currentBlockHeight]) => {
          const gracePeriodBlocks = vmParams.gracePeriodTicks.toNumber() / 1000
          const isPastGracePeriod = (withdrawal: PendingWithdrawal) =>
            withdrawal.blockHeight &&
            withdrawal.blockHeight + 2 * gracePeriodBlocks < currentBlockHeight

          // remove completed eth withdrawals
          const ethWithDrawalsCopy = { ...ethBalances.pendingWithdrawals }
          let ethUpdate = false
          for (const key in ethBalances.pendingWithdrawals) {
            const withdrawal = ethBalances.pendingWithdrawals[key]
            if (key === assertionHash || isPastGracePeriod(withdrawal)) {
              delete ethWithDrawalsCopy[key]
              ethUpdate = true
              removeFromPWCache(assertionHash)
            }
          }
          // remove completed ERC20 withdrawals
          const erc20BalancesClone: ContractStorage<BridgeBalance> = cloneDeep(
            erc20Balances
          )
          let erc20Update = false
          for (const address in erc20BalancesClone) {
            const erc20Balance = erc20BalancesClone[address]
            if (!erc20Balance) continue
            for (const key in erc20Balance.pendingWithdrawals) {
              const withdrawal = erc20Balance.pendingWithdrawals[key]
              if (key === assertionHash || isPastGracePeriod(withdrawal)) {
                delete erc20Balance.pendingWithdrawals[key]
                erc20Update = true
                removeFromPWCache(assertionHash)
              }
            }
          }

          // remove completed ERC721 withdrawals
          const erc721BalancesClone: ContractStorage<ERC721Balance> = cloneDeep(
            erc721Balances
          )
          let erc721Update = false
          for (const address in erc721BalancesClone) {
            const erc721Balance = erc721BalancesClone[address]
            if (!erc721Balance) continue
            for (const key in erc721Balance.pendingWithdrawals) {
              const withdrawal = erc721Balance.pendingWithdrawals[key]
              if (key === assertionHash || isPastGracePeriod(withdrawal)) {
                delete erc721Balance.pendingWithdrawals[key]
                erc721Update = true
                removeFromPWCache(assertionHash)
              }
            }
          }

          // update if necessary
          if (ethUpdate) {
            setEthBalances(oldBalances => ({
              ...oldBalances,
              pendingWithdrawals: ethWithDrawalsCopy
            }))
          }

          if (erc20Update) {
            setErc20Balances(erc20BalancesClone)
          }
          if (erc721Update) {
            setErc721Balances(erc721BalancesClone)
          }
        }
      )
    },
    [erc20Balances, erc721Balances, arbProvider]
  )

  const handleConfirmedAssertion = async (assertionHash: string) => {
    console.info('Incoming confirmed assertion:', assertionHash)
    if (!arbProvider) return
    const rollup = await arbProvider.arbRollupConn()
    updatePendingWithdrawals(rollup, assertionHash)
  }

  useEffect(() => {
    if (arbProvider && vmId) {
      arbProvider.arbRollupConn().then(rollup => {
        const {
          ConfirmedAssertion: { name: confirmed },
          ConfirmedValidAssertion: { name: confirmedValid }
        } = rollup.interface.events
        rollup.on(confirmed, updateAllBalances)
        rollup.on(confirmedValid, handleConfirmedAssertion)
      })

      return () => {
        arbProvider.arbRollupConn().then(rollup => {
          const {
            ConfirmedAssertion: { name: confirmed },
            ConfirmedValidAssertion: { name: confirmedValid }
          } = rollup.interface.events
          rollup.removeListener(confirmed, updateAllBalances)
          rollup.removeListener(confirmedValid, handleConfirmedAssertion)
        })
      }
    }
  }, [arbProvider, updateAllBalances, vmId])

  // TODO replace IIFEs with Promise.allSettled once available
  useEffect(() => {
    if (arbProvider && walletAddress) {
      if (autoLoadCache) {
        if (ERC20Cache?.length) {
          Promise.all(
            ERC20Cache.map(address => {
              return addToken(address, TokenType.ERC20).catch(err => {
                console.warn(`invalid cache entry erc20 ${address}`)
              })
            })
          ).then(values => {
            setERC20Cache(values.filter((val): val is string => !!val))
          })
        }

        if (ERC721Cache?.length) {
          Promise.all(
            ERC721Cache.map(address => {
              return addToken(address, TokenType.ERC721).catch(err => {
                console.warn(`invalid cache entry erc721 ${address}`)
              })
            })
          ).then(values => {
            setERC721Cache(values.filter((val): val is string => !!val))
          })
        }
      }
    }
  }, [arbProvider, walletAddress])

  useEffect(() => {
    if (
      prevEthBalances &&
      balanceIsEmpty(prevEthBalances) &&
      !balanceIsEmpty(ethBalances)
    ) {
      console.info('Eth Balances initial load')
      addCachedPWsToBalances()
    }
    if (
      prevERC20Balances &&
      isEmpty(prevERC20Balances) &&
      !isEmpty(erc20Balances)
    ) {
      console.info('ERC20 Balances initial load')
      addCachedPWsToBalances()
    }
    if (
      prevERC20Balances &&
      isEmpty(prevERC20Balances) &&
      !isEmpty(erc20Balances)
    ) {
      console.info('ERC721 Balances initial load')
      addCachedPWsToBalances()
    }
  }, [prevEthBalances, ethBalances, erc20Balances, erc721Balances])

  useEffect(() => {
    if (arbProvider && (!walletAddress || !vmId)) {
      // set both of these at the same time for cleaner external usage
      Promise.all([
        arbProvider.getSigner(walletIndex).getAddress(),
        arbProvider.getVmID()
      ]).then(([addr, vm]) => setConfig({ walletAddress: addr, vmId: vm }))
    }
    if (arbProvider && vmId && walletAddress) {
      updateAllBalances()
    }
  }, [arbProvider, vmId, walletAddress, walletIndex])

  return {
    walletAddress,
    vmId,
    bridgeTokens,
    balances: {
      eth: ethBalances,
      erc20: erc20Balances,
      erc721: erc721Balances,
      update: updateAllBalances
    },
    cache: {
      erc20: ERC20Cache,
      erc721: ERC721Cache,
      expire: expireCache
    },
    eth: {
      deposit: depositEth,
      withdraw: withdrawEth,
      withdrawLockBox: withdrawLockBoxETH,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      approve: approveToken,
      deposit: depositToken,
      withdraw: withdrawToken,
      withdrawLockBox: withdrawLockBoxToken,
      updateBalances: updateTokenBalances
    }
  }
}
