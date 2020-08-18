import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
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
import type { abi } from 'arb-provider-ethers'
import { L1Bridge, withdrawEth as _withdrawEth } from 'arb-provider-ethers'

import { ArbErc20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbErc20Factory'
import { ArbErc721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbErc721Factory'

import deepEquals from 'lodash.isequal'
import cloneDeep from 'lodash.clonedeep'
import isEmpty from 'lodash.isempty'
import useTransactions from './useTransactions'

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
  owner: string
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
  arb: abi.ArbErc20 | abi.ArbErc721
  eth: ERC20 | ERC721
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: abi.ArbErc20
  eth: ERC20
  decimals: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: abi.ArbErc721
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
// const pWToPWCache = (
//   pW: PendingWithdrawal,
//   type: AssetType,
//   owner: string,
//   address?: string
// ): PendingWithdrawalCache => {
//   return { ...pW, value: pW.value.toString(), type, address, owner }
// }
// const pWCacheToPW = (pWCache: PendingWithdrawalCache): PendingWithdrawal => {
//   return {
//     value: utils.bigNumberify(pWCache.value),
//     blockHeight: pWCache.blockHeight
//   }
// }

const usePrevious = (value: any): undefined => {
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
): ContractStorage<T> {
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
interface ERC20L1Memo {
  [contractAddress: string]: ERC20L1
}

interface ERC20L1 {
  name: string | undefined
  decimals: number | undefined
  symbol: string | undefined
  address: string
}

// interface ArbTokenBridge { }

// may be worthwhile to separate state from token bridge fn
// should there be a 'ready' property? this would make checks simpler int + ext
// store inbox mgr in state?
// TODO error handling promises with try catch
// TODO more control & details about approvals
// TODO extract shared contract interaction logic?

const erc20L1Memo = {} as ERC20L1Memo

export const useArbTokenBridge = (
  ethProvider: ethers.providers.JsonRpcProvider,
  arbProvider: ethers.providers.JsonRpcProvider,
  arbchainAddress: string,
  _ethSigner?: ethers.providers.JsonRpcSigner,
  _arbSigner?: ethers.providers.JsonRpcSigner,
  walletIndex = 0,
  autoLoadCache = true
) => {
  const ethWallet = useMemo(() => {
    return _ethSigner && new L1Bridge(_ethSigner, arbchainAddress)
  }, [_ethSigner])

  const arbSigner = useMemo(() => {
    return _arbSigner
  }, [_arbSigner])

  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<BridgeToken>
  >({})

  const defaultBalance = {
    balance: constants.Zero,
    arbChainBalance: constants.Zero,
    totalArbBalance: constants.Zero,
    lockBoxBalance: constants.Zero,
    pendingWithdrawals: {} as PendingWithdrawals
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

  // const [pWsCache, setPWsCache] = useLocalStorage<PendingWithdrawalsCache>(
  //   'PendingWithdrawalsCache',
  //   {}
  // ) as [
  //   PendingWithdrawalsCache,
  //   React.Dispatch<PendingWithdrawalsCache>,
  //   React.Dispatch<void>
  // ]

  const [walletAddress, setWalletAddress] = useState('')

  const [transactions, {addTransaction, setTransactionSuccess, setTransactionFailure, clearPendingTransactions  } ] = useTransactions()

  /* pending withdrawals cache*/

  // const addToPWCache = (
  //   pW: PendingWithdrawal,
  //   nodeHash: string,
  //   type: AssetType,
  //   owner: string,
  //   address?: string
  // ) => {
  //   // converts bignum to number for local storage
  //   setPWsCache({
  //     ...pWsCache,
  //     [nodeHash]: pWToPWCache(pW, type, owner, address)
  //   })
  // }

  // const removeFromPWCache = (nodeHash: string) => {
  //   const newPWsCache: PendingWithdrawalsCache = { ...pWsCache }
  //   if (newPWsCache) {
  //     delete newPWsCache[nodeHash]
  //     setPWsCache(newPWsCache)
  //   }
  // }

  // const addCachedPWsToBalances = useCallback(() => {
  //   if (!walletAddress) {
  //     console.warn('Warning: wallet address not yet loaded')
  //     return
  //   }
  //   const ethBalanceCopy: BridgeBalance = cloneDeep(ethBalances)
  //   const erc20BalancesCopy: ContractStorage<BridgeBalance> = cloneDeep(
  //     erc20Balances
  //   )
  //   const erc721BalancesCopy: ContractStorage<ERC721Balance> = cloneDeep(
  //     erc721Balances
  //   )

  //   let ethUpdate = false
  //   let erc20Update = false
  //   let erc721Update = false

  //   for (const nodeHash in pWsCache) {
  //     const pWCache = pWsCache[nodeHash]
  //     // skip withdrawals that aren't the current user's
  //     if (pWCache.owner !== walletAddress) {
  //       continue
  //     }
  //     const pW = pWCacheToPW(pWCache)
  //     switch (pWCache.type) {
  //       case AssetType.ETH: {
  //         ethBalanceCopy.pendingWithdrawals[nodeHash] = pW
  //         ethUpdate = true
  //         break
  //       }
  //       case AssetType.ERC20: {
  //         const address = pWCache.address
  //         if (!address) continue
  //         const balance = erc20BalancesCopy[address]
  //         if (!balance) continue
  //         if (!balance.pendingWithdrawals[nodeHash]) {
  //           balance.pendingWithdrawals[nodeHash] = pW
  //           erc20Update = true
  //         }
  //         break
  //       }
  //       case AssetType.ERC721: {
  //         const address = pWCache.address
  //         if (!address) continue
  //         const balance = erc721BalancesCopy[address]
  //         if (!balance) continue
  //         if (!balance.pendingWithdrawals[nodeHash]) {
  //           balance.pendingWithdrawals[nodeHash] = pW
  //           erc721Update = true
  //         }
  //         break
  //       }
  //       default:
  //         break
  //     }
  //   }
  //   if (ethUpdate) {
  //     setEthBalances(ethBalanceCopy)
  //   }
  //   if (erc20Update) {
  //     setErc20Balances(erc20BalancesCopy)
  //   }
  //   if (erc721Update) {
  //     setErc721Balances(erc721BalancesCopy)
  //   }
  // }, [ethBalances, erc20Balances, erc721Balances, walletAddress])

  /*
  ETH METHODS:
  */
  const updateEthBalances = useCallback(async () => {
    if (!arbProvider) throw new Error('updateEthBalances no arb provider')
    if (!walletAddress) throw new Error('updateEthBalances walletAddress')
    if (!_ethSigner) throw new Error('updateEthBalances _ethSigner')
    if (!ethWallet) throw new Error('updateEthBalances ethWallet')
    if (!arbSigner) throw new Error('updateEthBalances ethWallet')

    const [
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
    ] = await Promise.all([
      _ethSigner.getBalance(),
      arbProvider.getBalance(walletAddress),
      ethWallet.getEthLockBoxBalance(walletAddress),
      ethWallet.getEthLockBoxBalance(arbchainAddress)
    ])

    const update: typeof ethBalances = {
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance,
      pendingWithdrawals: ethBalances.pendingWithdrawals
    }

    if (!deepEquals(ethBalances, update)) {
      setEthBalances(oldBalances => {
        return { ...update, pendingWithdrawals: oldBalances.pendingWithdrawals }
      })
    }
    return update
  }, [
    arbProvider,
    ethBalances,
    walletAddress,
    walletIndex,
    _ethSigner,
    ethWallet
  ])

  const depositEth = useCallback(
    async (etherVal: string) => {
      if (!ethWallet || !walletAddress)
        throw new Error('depositEth no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      const tx = await ethWallet.depositETH(walletAddress, weiValue)
      try {

        addTransaction({
          type: 'deposit',
          status: 'pending',
          value: etherVal,
          txID: tx.hash,
          assetName: 'ETH',
          assetType: AssetType.ETH,
          sender: walletAddress
        })
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)
        updateEthBalances()
        return receipt
      } catch (e) {
        console.error('depositEth err: ' + e)
        setTransactionFailure(tx.hash)
      }
    },
    [ethWallet, walletAddress, updateEthBalances]
  )

  const withdrawEth = useCallback(
    async (etherVal: string) => {
      if (!arbSigner) throw new Error('withdrawETH no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      const tx = await _withdrawEth(arbSigner, weiValue)
      try {
        addTransaction({
          type: 'withdraw',
          status: 'pending',
          value: etherVal,
          txID: tx.hash,
          assetName: 'ETH',
          assetType: AssetType.ETH,
          sender: walletAddress
        })
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)

        updateEthBalances()
        const { hash } = tx
        if (!hash)
          throw new Error("Withdraw error: Transactions doesn't include hash")

        // arbProvider.getMessageResult(hash).then(data => {
        //   return
        //   if (!data) return
        //   if (!data.nodeInfo) return
        //   const nodeHash = data.nodeInfo.nodeHash
        //   const pendingWithdrawal: PendingWithdrawal = {
        //     value: weiValue,
        //     blockHeight: receipt.blockNumber,
        //     from: walletAddress
        //   }
        //   setEthBalances(balance => {
        //     const newEthBalances = { ...balance }
        //     newEthBalances.pendingWithdrawals[nodeHash] = pendingWithdrawal
        //     return newEthBalances
        //   })
        //   addToPWCache(
        //     pendingWithdrawal,
        //     nodeHash,
        //     AssetType.ETH,
        //     walletAddress
        //   )
        // })
        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
        setTransactionFailure(tx.hash)

      }
    },
    [arbSigner, updateEthBalances]
  )

  const withdrawLockBoxETH = useCallback(async () => {
    if (!ethWallet) throw new Error('withdrawLockBoxETH no ethWallet')

    const tx = await ethWallet.withdrawEthFromLockbox()
    try {
      addTransaction({
        type: 'lockbox',
        status: 'pending',
        value: null,
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: walletAddress
      })
      const receipt = await tx.wait()
      updateEthBalances()
      setTransactionSuccess(tx.hash)
      return receipt
    } catch (e) {
      setTransactionFailure(tx.hash)
      console.error('withdrawLockBoxETH err', e)
    }
  }, [ethWallet, updateEthBalances])

  /* TOKEN METHODS */

  // TODO targeted token updates to prevent unneeded iteration
  const updateTokenBalances = useCallback(
    async (type?: TokenType) => {
      if (!arbProvider || !walletAddress || !ethWallet)
        throw new Error('updateTokenBalances missing req')

      const filtered = Object.values(bridgeTokens).filter(c => {
        return !!c && (!type || c.type === type)
      }) as BridgeToken[]

      const erc20Updates: typeof erc20Balances = {}
      const erc721Updates: typeof erc721Balances = {}

      for (const contract of filtered) {
        const code = await arbProvider.getCode(contract.eth.address)
        switch (contract.type) {
          case TokenType.ERC20: {
            let arbBalancePromise: Promise<utils.BigNumber>
            if (code.length > 2){
              arbBalancePromise = contract.arb.balanceOf(walletAddress)
              console.warn("update bal: contract not yet deployed on arb", contract.eth.address);
            } else {
              arbBalancePromise = new Promise((exec)=> exec(constants.Zero));
            }
            const [
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance
            ] = await Promise.all([
              contract.eth.balanceOf(walletAddress),
              arbBalancePromise,
              ethWallet.getERC20LockBoxBalance(
                contract.eth.address,
                walletAddress
              ),
              ethWallet.getERC20LockBoxBalance(
                contract.eth.address,
                arbchainAddress
              )
            ])
            const erc20Balance = erc20Balances[contract.eth.address]
            const updated = {
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance,
              pendingWithdrawals: erc20Balance
                ? erc20Balance.pendingWithdrawals
                : ({} as PendingWithdrawals)
            }

            erc20Updates[contract.eth.address] = updated

            break
          }
          case TokenType.ERC721: {
            let arbTokensPromise: Promise<utils.BigNumber[]>
            if (code.length > 2){
              arbTokensPromise = contract.arb.tokensOfOwner(walletAddress)
              console.warn("update bal: contract not yet deployed on arb", contract.eth.address);
            } else {
              arbTokensPromise = new Promise((exec)=>exec([]));
            }
            // TODO: remove total arb tokens; overkill
            const [
              tokens,
              arbChainTokens,
              lockBoxTokens,
              totalArbTokens
            ] = await Promise.all([
              contract.eth.tokensOfOwner(walletAddress),
              arbTokensPromise,
              ethWallet.getERC721LockBoxTokens(
                contract.eth.address,
                walletAddress
              ),
              ethWallet.getERC721LockBoxTokens(
                contract.eth.address,
                arbchainAddress
              )
            ])
            const erc721Balance = erc721Balances[contract.eth.address]

            const updated = {
              tokens,
              arbChainTokens,
              totalArbTokens,
              lockBoxTokens,
              pendingWithdrawals: erc721Balance
                ? erc721Balance.pendingWithdrawals
                : ({} as PendingWithdrawals)
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
      return {
        erc20: erc20Updates,
        erc721: erc721Updates
      }
    },
    [
      arbProvider,
      erc20Balances,
      erc721Balances,
      bridgeTokens,
      walletAddress,
      ethWallet
    ]
  )
  const approveToken = useCallback(
    async (contractAddress: string) => {
      const contract = bridgeTokens[contractAddress]
      if (!contract) {
        throw new Error(`Contract ${contractAddress} not present`)
      }
      if (!ethWallet) return
      let tx: ContractTransaction
      const inboxAddress = (await ethWallet.globalInboxConn()).address

      switch (contract.type) {
        case TokenType.ERC20:
          tx = await contract.eth.approve(inboxAddress, MIN_APPROVAL)
          break
        case TokenType.ERC721:
          tx = await contract.eth.setApprovalForAll(inboxAddress, true)
          break
        default:
          assertNever(contract, 'approveToken exhaustive check failed')
      }
      addTransaction({
        type: 'approve',
        status: 'pending',
        value: null,
        txID: tx.hash,
        assetName: contract.name,
        assetType: contract.type,
        sender: walletAddress
      })
      try{
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)



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

      return { tx, receipt }
    }
    catch (err){
        setTransactionFailure(tx.hash)
      }
    },
    [bridgeTokens, ethWallet]
  )

  const depositToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt | undefined> => {
      if (!ethWallet) throw new Error('deposit missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO fail fast if not approved

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20: {
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await ethWallet.depositERC20(
            walletAddress,
            contract.eth.address,
            amount
          )
          break
        }
        case TokenType.ERC721:
          tx = await ethWallet.depositERC721(
            walletAddress,
            contract.eth.address,
            amountOrTokenId
          )
          break
        default:
          assertNever(contract, 'depositToken exhaustive check failed')
      }

      addTransaction({
        type: 'deposit',
        status: 'pending',
        value: amountOrTokenId,
        txID: tx.hash,
        assetName: contract.name,
        assetType: contract.type,
        sender: walletAddress
      })
      try {
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)
        updateTokenBalances(contract.type)
        return receipt
      } catch(err){
        setTransactionFailure(tx.hash)

      }

    },
    [ethWallet, bridgeTokens]
  )

  const withdrawToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt | undefined> => {
      // TODO check for arbsigner?
      if (!walletAddress) throw new Error('withdraw token no walletAddress')
      if (!arbSigner) throw new Error('withdraw token no arbSigner')
      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20: {
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await contract.arb.withdraw(walletAddress, amount)
          break
        }
        case TokenType.ERC721:
          tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
          break
        default:
          assertNever(contract, 'withdrawToken exhaustive check failed')
      }
      addTransaction({
        type: 'withdraw',
        status: 'pending',
        value: amountOrTokenId,
        txID: tx.hash,
        assetName: contract.name,
        assetType: contract.type,
        sender: walletAddress
      })

      try {
      const receipt = await tx.wait()
      setTransactionSuccess(tx.hash)

      const { hash } = tx

      if (!hash) throw new Error('withdrawToken: missing hash in txn')
      // arbProvider.getMessageResult(hash).then(data => {
      // return
      // if (!data) return
      // if (!data.nodeInfo) return
      // const nodeHash = data.nodeInfo.nodeHash
      // const pendingWithdrawal: PendingWithdrawal = {
      //   value: utils.parseEther(amountOrTokenId),
      //   blockHeight: receipt.blockNumber,
      //   from: walletAddress
      // }
      // /* add to pending withdrawals and update without mutating
      //   ERC20 && ERC721 could probably by DRYed up, but had typing issues, so keeping separate
      // */
      // if (contract.type === TokenType.ERC20) {
      //   setErc20Balances(oldErc20Balances => {
      //     const balance = oldErc20Balances?.[contractAddress]
      //     if (!balance) return oldErc20Balances
      //     const newPendingWithdrawals: PendingWithdrawals = {
      //       ...balance.pendingWithdrawals,
      //       [nodeHash]: pendingWithdrawal
      //     }
      //     const newBalance: BridgeBalance = {
      //       ...balance,
      //       pendingWithdrawals: newPendingWithdrawals
      //     }
      //     return {
      //       ...oldErc20Balances,
      //       [contractAddress]: newBalance
      //     }
      //   })
      //   addToPWCache(
      //     pendingWithdrawal,
      //     nodeHash,
      //     AssetType.ERC20,
      //     walletAddress,
      //     contractAddress
      //   )
      // } else if (contract.type === TokenType.ERC721) {
      //   setErc721Balances(oldERC721Balances => {
      //     const balance = oldERC721Balances?.[contractAddress]
      //     if (!balance) return oldERC721Balances
      //     const newPendingWithdrawals: PendingWithdrawals = {
      //       ...balance.pendingWithdrawals,
      //       [nodeHash]: pendingWithdrawal
      //     }
      //     const newBalance: ERC721Balance = {
      //       ...balance,
      //       pendingWithdrawals: newPendingWithdrawals
      //     }
      //     return {
      //       ...oldERC721Balances,
      //       [contractAddress]: newBalance
      //     }
      //   })
      //   addToPWCache(
      //     pendingWithdrawal,
      //     nodeHash,
      //     AssetType.ERC721,
      //     walletAddress,
      //     contractAddress
      //   )
      // }
      // })

      updateTokenBalances(contract.type)
      return receipt
      } catch (err){
        console.warn('err', err);

        setTransactionFailure(tx.hash)

      }
    },
    [walletAddress, bridgeTokens]
  )

  const withdrawLockBoxToken = useCallback(
    async (
      contractAddress: string,
      tokenId?: string
    ): Promise<ContractReceipt | undefined> => {
      if (!ethWallet) throw new Error('ethWallet missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO error handle
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await ethWallet.withdrawERC20FromLockbox(contract.eth.address)
          break
        case TokenType.ERC721:
          if (!tokenId) {
            throw Error(
              'withdrawLockBox tokenId not present ' + contractAddress
            )
          }
          tx = await ethWallet.withdrawERC721FromLockbox(
            contract.eth.address,
            tokenId
          )
          break
        default:
          assertNever(contract, 'withdrawLockBoxToken exhaustive check failed')
      }
      addTransaction({
        type: 'lockbox',
        status: 'pending',
        value: null,
        txID: tx.hash,
        assetName: contract.name,
        assetType: contract.type,
        sender: walletAddress
      })
      try {
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)
        updateTokenBalances(contract.type)
        return receipt
      } catch(err){
        console.warn(err);
        setTransactionFailure(tx.hash)

      }
    },
    [ethWallet, bridgeTokens]
  )

  const getERC20Info = useCallback(
    async (contractAddress: string): Promise<ERC20L1 | undefined> => {
      if (!ethProvider) return

      if (erc20L1Memo[contractAddress]) {
        return erc20L1Memo[contractAddress]
      }

      const isContract = (await ethProvider.getCode(contractAddress)).length > 2
      if (!isContract) return
      const ethERC20 = ERC20Factory.connect(contractAddress, ethProvider)
      let tokenName, decimals, symbol
      try {
        ;[tokenName, decimals, symbol] = await Promise.all([
          ethERC20.name(),
          ethERC20.decimals(),
          ethERC20.symbol()
        ])
      } catch (err) {
        console.warn('Error: could not get ERC20 info:', err)
      }

      const infoObject = {
        name: tokenName,
        decimals,
        symbol,
        address: contractAddress
      }
      erc20L1Memo[contractAddress] = infoObject
      return infoObject
    },
    [ethProvider]
  )

  const addToken = useCallback(
    async (contractAddress: string, type: TokenType): Promise<string> => {
      if (!arbProvider || !ethWallet || !_ethSigner || !_arbSigner)
        throw Error('addToken missing req')

      const isEthContract =
        (await ethProvider.getCode(contractAddress)).length > 2
      if (!isEthContract) {
        console.warn('contract not deployed')
        return ''
      } else if (bridgeTokens[contractAddress]){
        console.warn('token already added');
        return ''
      }

      // TODO error handle
      let newContract: BridgeToken
      const inboxAddress = (await ethWallet.globalInboxConn()).address

      let arbContractCode = await arbProvider.getCode(contractAddress)
      switch (type) {
        case TokenType.ERC20: {

          if (arbContractCode.length <= 2) {
            console.warn('ERC20 contract does not yet exist on arbchain:')

            const tx = await ethWallet.depositERC20(
              walletAddress,
              contractAddress,
              0
            )
            const res = await tx.wait()
            console.info('Token contract added to arb chain:', res)
          }
          const arbERC20 = ArbErc20Factory.connect(
            contractAddress,
            _arbSigner || arbProvider
          )
          const ethERC20 = ERC20Factory.connect(
            contractAddress,
            _ethSigner || ethProvider
          )
          const [allowance, tokenName, decimals, symbol] = await Promise.all([
            ethERC20.allowance(walletAddress, inboxAddress),
            ethERC20.name(),
            ethERC20.decimals(),
            ethERC20.symbol()
          ])

          newContract = {
            arb: arbERC20,
            eth: ethERC20,
            type,
            allowed: allowance.gte(MIN_APPROVAL.div(2)),
            name: tokenName,
            decimals,
            symbol
          }

          if (!ERC20Cache?.includes(contractAddress)) {
            setERC20Cache([...ERC20Cache, contractAddress])
          }
          break
        }
        case TokenType.ERC721: {
          const arbERC721 = ArbErc721Factory.connect(
            contractAddress,
            _arbSigner
          )
          const ethERC721 = ERC721Factory.connect(contractAddress, _ethSigner)

          const [allowed, tokenName, symbol] = await Promise.all([
            ethERC721.isApprovedForAll(walletAddress, inboxAddress),
            ethERC721.name(),
            ethERC721.symbol()
          ])

          newContract = {
            arb: arbERC721,
            eth: ethERC721,
            type,
            name: tokenName,
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
    [
      arbProvider,
      ethWallet,
      _ethSigner,
      _arbSigner,
      bridgeTokens,
      updateTokenBalances
    ]
  )

  const updateAllBalances = useCallback(
    () => Promise.all([updateEthBalances(), updateTokenBalances()]),
    [updateEthBalances, updateTokenBalances]
  )

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  // const updatePendingWithdrawals = useCallback(
  //   (rollup: abi.ArbRollup, assertionHash: string) => {
  //     if (!arbProvider)
  //       throw new Error('updatePendingWithdrawals no arb provider')
  //     if (pWsCache[assertionHash]) {
  //       removeFromPWCache(assertionHash)
  //     }

  //     Promise.all([rollup.vmParams(), arbProvider.getBlockNumber()]).then(
  //       ([vmParams, currentBlockHeight]) => {
  //         const gracePeriodBlocks = vmParams.gracePeriodTicks.toNumber() / 1000
  //         const isPastGracePeriod = (withdrawal: PendingWithdrawal) =>
  //           withdrawal.blockHeight &&
  //           withdrawal.blockHeight + 2 * gracePeriodBlocks < currentBlockHeight

  //         // remove completed eth withdrawals
  //         const ethWithDrawalsCopy = { ...ethBalances.pendingWithdrawals }
  //         let ethUpdate = false
  //         for (const key in ethBalances.pendingWithdrawals) {
  //           const withdrawal = ethBalances.pendingWithdrawals[key]
  //           if (key === assertionHash || isPastGracePeriod(withdrawal)) {
  //             delete ethWithDrawalsCopy[key]
  //             ethUpdate = true
  //           }
  //         }
  //         // remove completed ERC20 withdrawals
  //         const erc20BalancesClone: ContractStorage<BridgeBalance> = cloneDeep(
  //           erc20Balances
  //         )
  //         let erc20Update = false
  //         for (const address in erc20BalancesClone) {
  //           const erc20Balance = erc20BalancesClone[address]
  //           if (!erc20Balance) continue
  //           for (const key in erc20Balance.pendingWithdrawals) {
  //             const withdrawal = erc20Balance.pendingWithdrawals[key]
  //             if (key === assertionHash || isPastGracePeriod(withdrawal)) {
  //               delete erc20Balance.pendingWithdrawals[key]
  //               erc20Update = true
  //             }
  //           }
  //         }

  //         // remove completed ERC721 withdrawals
  //         const erc721BalancesClone: ContractStorage<ERC721Balance> = cloneDeep(
  //           erc721Balances
  //         )
  //         let erc721Update = false
  //         for (const address in erc721BalancesClone) {
  //           const erc721Balance = erc721BalancesClone[address]
  //           if (!erc721Balance) continue
  //           for (const key in erc721Balance.pendingWithdrawals) {
  //             const withdrawal = erc721Balance.pendingWithdrawals[key]
  //             if (key === assertionHash || isPastGracePeriod(withdrawal)) {
  //               delete erc721Balance.pendingWithdrawals[key]
  //               erc721Update = true
  //             }
  //           }
  //         }

  //         // update if necessary
  //         if (ethUpdate) {
  //           setEthBalances(oldBalances => ({
  //             ...oldBalances,
  //             pendingWithdrawals: ethWithDrawalsCopy
  //           }))
  //         }

  //         if (erc20Update) {
  //           setErc20Balances(erc20BalancesClone)
  //         }
  //         if (erc721Update) {
  //           setErc721Balances(erc721BalancesClone)
  //         }
  //       }
  //     )
  //   },
  //   [erc20Balances, erc721Balances, arbProvider]
  // )

  // const handleConfirmedAssertion = async (assertionHash: string) => {
  //   console.info('Incoming confirmed assertion:', assertionHash)
  //   if (!arbProvider) return
  //   const rollup = await arbProvider.arbRollupConn()
  //   updatePendingWithdrawals(rollup, assertionHash)
  // }

  // useEffect(() => {
  //   if (arbProvider && vmId) {
  //     arbProvider.arbRollupConn().then(rollup => {
  //       const {
  //         ConfirmedAssertion: { name: confirmed },
  //         ConfirmedValidAssertion: { name: confirmedValid }
  //       } = rollup.interface.events
  //       rollup.on(confirmed, updateAllBalances)
  //       rollup.on(confirmedValid, handleConfirmedAssertion)
  //     })

  //     return () => {
  //       arbProvider.arbRollupConn().then(rollup => {
  //         const {
  //           ConfirmedAssertion: { name: confirmed },
  //           ConfirmedValidAssertion: { name: confirmedValid }
  //         } = rollup.interface.events
  //         rollup.removeListener(confirmed, updateAllBalances)
  //         rollup.removeListener(confirmedValid, handleConfirmedAssertion)
  //       })
  //     }
  //   }
  // }, [arbProvider, updateAllBalances, vmId])

  // TODO replace IIFEs with Promise.allSettled once available
  useEffect(() => {
    if (arbProvider && walletAddress) {
      if (autoLoadCache) {
        if (ERC20Cache?.length) {
          Promise.all(
            ERC20Cache.map(address => {
              return addToken(address, TokenType.ERC20).catch(err => {
                console.warn(`invalid cache entry erc20 ${address}`)
                console.warn(err)
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
                console.warn(err)
              })
            })
          ).then(values => {
            setERC721Cache(values.filter((val): val is string => !!val))
          })
        }
        // if (isEmpty(pWsCache)) return
        // arbProvider.arbRollupConn().then(async rollup => {
        //   const { ethProvider } = arbProvider
        //   const currentBlockHeight = await ethProvider.getBlockNumber()
        //   const targetAssertionHashes = Object.keys(pWsCache)
        //   const minBlockHeight = Object.values(pWsCache).reduce(
        //     (acc, pW) => Math.min(pW.blockHeight || 0, acc),
        //     Infinity
        //   )

        //   const topics = [
        //     [rollup.interface.events.ConfirmedValidAssertion.topic],
        //     targetAssertionHashes
        //   ]
        //   ethProvider
        //     .getLogs({
        //       address: vmId,
        //       topics,
        //       fromBlock: minBlockHeight,
        //       toBlock: currentBlockHeight
        //     })
        //     .then(events => {
        //       events.forEach(log => {
        //         const { nodeHash } = rollup.interface.parseLog(log).values
        //         if (pWsCache[nodeHash]) {
        //           updatePendingWithdrawals(rollup, nodeHash)
        //         }
        //       })
        //     })
        //     .catch(e => {
        //       console.warn('filter error:', e)
        //     })
        // })
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
      // addCachedPWsToBalances()
      // arguably unnecessary, but I like it, for insurance
      window.setInterval(updateAllBalances, 7500)
    }
    if (
      prevERC20Balances &&
      isEmpty(prevERC20Balances) &&
      !isEmpty(erc20Balances)
    ) {
      console.info('ERC20 Balances initial load')
      // addCachedPWsToBalances()
    }
    if (
      prevERC721Balances &&
      isEmpty(prevERC721Balances) &&
      !isEmpty(erc721Balances)
    ) {
      console.info('ERC721 Balances initial load')
      // addCachedPWsToBalances()
    }
  }, [prevEthBalances, ethBalances, erc20Balances, erc721Balances])

  useEffect(() => {
    if (arbProvider && !walletAddress) {
      const address = _arbSigner || _ethSigner
      _arbSigner?.getAddress().then(add => {

        setWalletAddress(add)
      })

      // Promise.resolve(signer && signer.getAddress()).then(addr =>{

      // }
      // )
    }
    if (arbProvider && walletAddress) {
      updateAllBalances()
    }
  }, [arbProvider, walletAddress, walletIndex])

  /* update balances on render */
  // may be better to leave this to the user
  useEffect(() => {
    if (arbProvider) {
      updateAllBalances().catch(e =>
        console.error('updateAllBalances failed', e)
      )
    }
  })
  return {
    walletAddress,
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
      updateBalances: updateTokenBalances,
      getERC20Info
    },
    arbSigner,
    transactions: {
      transactions,
      clearPendingTransactions
    }
  }
}
