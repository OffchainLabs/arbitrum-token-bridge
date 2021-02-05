/** @namespace bridge
 * @description Hook entry point; object returned by useArbTokenBridge hook containing all other namespaces.
 *
 */

/**
 * @namespace bridge.eth
 * @description Ether related interactions.
 */

/**
 * @namespace bridge.cache
 * @description Cache's tokens current user has added; reloads on page load.
 */

/** @namespace bridge.token
 * @description ERC20/ERC721 related interactions.
 */

/** @namespace bridge.balances
 * @description Balance data on both L1 and L2 for Ether, tokens, and NFTs.
 */

/**
 *  @namespace bridge.transactions
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import { ContractTransaction, constants, ethers, utils, Contract } from 'ethers'
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
import useTransactions from './useTransactions'
import { Zero } from 'ethers/constants'
import ERC20ABI from '../../ABIs/ERC20.json'
const MIN_APPROVAL = constants.MaxUint256

/* eslint-disable no-shadow */

/** @interface
 * @description Enum for specifying type of token.
 * @alias TokenType
 */
export enum TokenType {
  /** */
  ERC20 = 'ERC20',
  /** */
  ERC721 = 'ERC721'
}
/* eslint-enable no-shadow */

export enum AssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ETH = 'ETH'
}

// whatever:
const tokenToAssetType = (tokenType: TokenType) =>
  tokenType === TokenType.ERC20 ? AssetType.ERC20 : AssetType.ERC721

interface BridgedToken {
  type: TokenType
  name: string
  symbol: string
  allowed: boolean
  arb: abi.ArbErc20 | abi.ArbErc721 | null
  eth: ERC20 | ERC721 | null
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: abi.ArbErc20 | null
  eth: ERC20 | null
  decimals: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: abi.ArbErc721 | null
  eth: ERC721
}

export type BridgeToken = ERC20BridgeToken | ERC721BridgeToken

export interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}
/**
 * Holds balance values for Ether or ERC20 Token.
 * @alias BridgeBalance
 */
export interface BridgeBalance {
  /**
   * User's balances on L1.
   */
  balance: utils.BigNumber
  /**
   * User's balance on Arbitrum.
   */
  arbChainBalance: utils.BigNumber
  /**
   * Total supply on Arbitrum.
   */
  totalArbBalance: utils.BigNumber
  /**
   * Balance available in lockbox (withdrawn from Arbitrum, ready to transfer out.)
   */
  lockBoxBalance: utils.BigNumber
}

// removing 'tokens' / 'balance' could result in one interface
/**
 * Holds balance values for ERC721 Token.
 * @name ERC721Balance
 * @alias ERC721Balance
 */
export interface ERC721Balance {
  /**
   * User's NFT balance on L1
   */
  ethBalance: utils.BigNumber
  arbBalance: utils.BigNumber
  /**
  /**
   * User's NFTs on L1
   */
  tokens: utils.BigNumber[]
  /**
   *  User's NFTs on Arbitrum
   */
  arbChainTokens: utils.BigNumber[]
  /**
   * All NFTs on Arbitrum
   */
  totalArbTokens: utils.BigNumber[]
  /**
   * All of user's NFTs available in lockbox (ready to transfer out.)
   */
  lockBoxTokens: utils.BigNumber[]
}

type TokenBalance = BridgeBalance | ERC721Balance

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
        ...latestBalance
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

/** @function
 * @description Main hook; returns bridge object.
 * @see bridge
 * @param {JsonRpcProvider} ethProvider
 * @param {JsonRpcProvider} arbProvider
 * @param {string} arbchainAddress
 * @param {JsonRpcSigner=} _ethSigner
 * @param {JsonRpcSigner=} _arbSigner
 * @param {number} [walletIndex=0]
 * @param {boolean} [autoLoadCache=true]
 * @return {bridge}
 */
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
    lockBoxBalance: constants.Zero
  }
  /**
   * @memberof bridge.balances
   * @type {BridgeBalance}
   * @name ethBalance
   * @see BridgeBalance
   * @name eth
   */
  const [ethBalances, setEthBalances] = useState<BridgeBalance>(defaultBalance)

  const balanceIsEmpty = (balance: BridgeBalance) =>
    balance['balance'] === defaultBalance['balance'] &&
    balance['arbChainBalance'] === defaultBalance['arbChainBalance'] &&
    balance['totalArbBalance'] === defaultBalance['totalArbBalance'] &&
    balance['lockBoxBalance'] === defaultBalance['lockBoxBalance']

  // TODO
  /**
   * @memberof bridge.balances
   * @type {{string: BridgeBalance}}
   * @name erc20
   * @description Maps ERC20 token addresses to BridgeBalances
   * @see BridgeBalance
   */
  const [erc20Balances, setErc20Balances] = useState<
    ContractStorage<BridgeBalance>
  >({})

  /**
   * @memberof bridge.balances
   * @type {{string: BridgeBalance}}
   * @name erc721
   * @description Maps ERC721 addresses to ERC721Balance
   * @see ERC721Balance

   */
  const [erc721Balances, setErc721Balances] = useState<
    ContractStorage<ERC721Balance>
  >({})

  // use local storage for list of token addresses
  // TODO remove type assertion when hook dependency fix update is released

  /**
   * @memberof bridge.cache
   * @type {string[]}
   * @description Cached ERC20 addresses
   * @name erc20
   */
  const defaultTokenList = [
    '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25', // ARBI
    '0xe41d965f6e7541139f8d9f331176867fb6972baf' // ARB
  ]
  const [ERC20Cache, setERC20Cache, clearERC20Cache] = useLocalStorage<
    string[]
  >('ERC20Cache', []) as [
    string[],
    React.Dispatch<string[]>,
    React.Dispatch<void>
  ]
  /**
   * @memberof bridge.cache
   * @type {string[]}
   * @description Cached ERC721 addresses
   * @name erc721
   */
  const [ERC721Cache, setERC721Cache, clearERC721Cache] = useLocalStorage<
    string[]
  >('ERC721Cache', []) as [
    string[],
    React.Dispatch<string[]>,
    React.Dispatch<void>
  ]
  /**
   * @memberof bridge
   * @type {string}
   * @description Address of current signer (both same for the eth-signer and arb-signer).
   * @name walletAddress
   */
  const [walletAddress, setWalletAddress] = useState('')

  /**
   * @memberof bridge.transactions
   * @type {Transaction[]}
   * @name transactions
   * @description Array of bridge-related transactions from current wallet, with live status. Automatically caches.
   * @see Transaction
   */
  /** @function
   * @memberof bridge.transactions
   * @description Removes all transactions with pending status from cache
   * @name clearPendingTransactions
   */
  const [
    transactions,
    {
      addTransaction,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransactionStatus
    }
  ] = useTransactions()

  /*
  ETH METHODS:
  */

  /** @function
   * @name updateBalances
   * @memberof bridge.eth
   * @description Updates balances.eth values
   * @return {BridgeBalance}
   */
  const updateEthBalances = useCallback(async () => {
    if (!arbProvider) throw new Error('updateEthBalances no arb provider')
    if (!walletAddress) {
      console.info('updateEthBalances: walletAddress not yet loaded')
      return
    }
    const [balance, arbChainBalance, lockBoxBalance, totalArbBalance]: [
      ethers.utils.BigNumber,
      ethers.utils.BigNumber,
      ethers.utils.BigNumber,
      ethers.utils.BigNumber
    ] = await Promise.all([
      ethProvider.getBalance(walletAddress),
      arbProvider.getBalance(walletAddress),
      ethWallet
        ? ethWallet.getEthLockBoxBalance(walletAddress)
        : constants.Zero,
      ethWallet
        ? ethWallet.getEthLockBoxBalance(arbchainAddress)
        : constants.Zero
    ])

    const update: typeof ethBalances = {
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
    }

    if (!deepEquals(ethBalances, update)) {
      setEthBalances(oldBalances => {
        return { ...update }
      })
    }
    return update
  }, [arbProvider, ethBalances, walletAddress, walletIndex, ethWallet])

  /** @function
  * @name deposit
  * @memberof bridge.eth
  * @description Deposits Eth from L1 into the arbitrum chain
  * @param {string} etherVal ether value (in ether units)
  * @return {TransactionReceipt}

   */
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
        updateTransactionStatus(receipt)
        updateEthBalances()
        return receipt
      } catch (e) {
        console.error('depositEth err: ' + e)
        setTransactionFailure(tx.hash)
      }
    },
    [ethWallet, walletAddress, updateEthBalances]
  )

  /** @function
   * @name withdraw
   * @memberof bridge.eth
   * @description Initiates withdrawal of Ether from Arbitrum chain onto the L1
   * @param {string} etherVal ether value (in ether units)
   * @return {TransactionReceipt}
   */
  const withdrawEth = useCallback(
    async (etherVal: string, reutrnResponse = false) => {
      if (!arbSigner) throw new Error('withdrawETH no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      const tx = await _withdrawEth(arbSigner, weiValue)
      if (reutrnResponse) {
        return tx
      }
      if (!tx.blockNumber) {
        tx.blockNumber = await ethProvider.getBlockNumber()
      }
      try {
        addTransaction({
          type: 'withdraw',
          status: 'pending',
          value: etherVal,
          txID: tx.hash,
          assetName: 'ETH',
          assetType: AssetType.ETH,
          sender: walletAddress,
          blockNumber: tx.blockNumber || 0
        })
        const receipt = await tx.wait()
        updateTransactionStatus(receipt)

        updateEthBalances()
        const { hash } = tx
        if (!hash)
          throw new Error("Withdraw error: Transactions doesn't include hash")

        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
        setTransactionFailure(tx.hash)
      }
    },
    [arbSigner, updateEthBalances]
  )
  /** @function
   * @memberof bridge.eth
   * @name withdrawLockBox
   * @description Transfers Ether from lockbox to L1 address
   * @return {TransactionReceipt}
   */
  const withdrawLockBoxETH = useCallback(async () => {
    if (!ethWallet) throw new Error('withdrawLockBoxETH no ethWallet')

    const tx = await ethWallet.withdrawEthFromLockbox()
    try {
      addTransaction({
        type: 'lockbox',
        status: 'pending',
        value: utils.formatEther(ethBalances.lockBoxBalance),
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: walletAddress
      })
      const receipt = await tx.wait()
      updateEthBalances()
      updateTransactionStatus(receipt)
      return receipt
    } catch (e) {
      setTransactionFailure(tx.hash)
      console.error('withdrawLockBoxETH err', e)
    }
  }, [ethWallet, updateEthBalances])

  const arbTokenCache = useCallback(
    async (_contractAddressUpcased: string, tokenType: TokenType) => {
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()
      const token = bridgeTokens[contractAddress]
      if (!token) {
        return null
      }

      if (token.arb) {
        return token.arb
      }
      try {
        const code = await arbProvider.getCode(contractAddress)
        console.info('contract code')
        if (code.length <= 2) {
          console.info('contract does not yet exist on arbchain:')
          return null
        }
      } catch (err) {
        console.info('contract (apparantly?) does not yet exist on arbchain:')
        console.warn(err)
        return null
      }

      // todo:

      const arbTokenContract: abi.ArbErc20 | abi.ArbErc721 = (tokenType ===
      TokenType.ERC20
        ? ArbErc20Factory
        : ArbErc721Factory
      ).connect(contractAddress, _arbSigner || arbProvider)
      setBridgeTokens(contracts => {
        const target = contracts[contractAddress]
        if (!target) throw Error('approved contract missing ' + contractAddress)

        const updated = {
          ...target,
          arb: arbTokenContract
        } as BridgeToken

        return {
          ...contracts,
          [contractAddress]: updated
        }
      })

      return arbTokenContract
    },
    [bridgeTokens, _arbSigner, arbProvider]
  )
  /* TOKEN METHODS */

  // TODO targeted token updates to prevent unneeded iteration
  /** @function
   * @name updateBalances
   * @memberof bridge.token
   * @description updates balances.erc20 and balances.erc721 objects
   * @param {TokenType=} type updates only specified type if included
   * @return {ContractStorage<BridgeBalance>}
   */
  const updateTokenBalances = useCallback(
    async (type?: TokenType) => {
      if (!arbProvider || !walletAddress) {
        console.info('updateTokenBalances missing req')
        return
      }

      const filtered = Object.values(bridgeTokens).filter(c => {
        return !!c && (!type || c.type === type)
      }) as BridgeToken[]

      const erc20Updates: typeof erc20Balances = {}
      const erc721Updates: typeof erc721Balances = {}
      // trigger update?
      for (let contract of filtered) {
        switch (contract.type) {
          case TokenType.ERC20: {

            if (contract.eth && !contract.arb){
              // check if arb copy of contract has been deployed
              contract = await getERC20TokenData(contract.eth.address) as BridgeToken
            }

            const balance = contract.eth
              ? await contract.eth.balanceOf(walletAddress)
              : Zero
            const arbChainBalance = contract.arb
              ? await contract.arb.balanceOf(walletAddress)
              : Zero
            const lockBoxBalance =
              contract.eth && ethWallet
                ? await ethWallet.getERC20LockBoxBalance(
                    contract.eth.address,
                    walletAddress
                  )
                : Zero
            // TODO if it's an L2 only token, this is misleading; currently it's not displayed tho
            const totalArbBalance =
              contract.eth && ethWallet
                ? await ethWallet.getERC20LockBoxBalance(
                    contract.eth.address,
                    arbchainAddress
                  )
                : Zero

            const updated = {
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance
            }
            const address =
              contract.eth?.address || (contract.arb?.address as string)
            erc20Updates[address] = updated

            break
          }
          case TokenType.ERC721: {
            const arbTokenContract = await arbTokenCache(
              contract.eth.address,
              contract.type
            )
            // TODO: remove total arb tokens; overkill
            const ethBalance = await contract.eth.balanceOf(walletAddress)
            const ethTokens: utils.BigNumber[] = []
            try {
              for (let i = 0; i < ethBalance.toNumber(); i++) {
                const token = await contract.eth.tokenOfOwnerByIndex(
                  walletAddress,
                  i
                )
                ethTokens.push(token)
              }
            } catch (err) {
              console.warn('Error getting user 721 L1 tokens', err)
            }

            const arbBalance: utils.BigNumber = await (arbTokenContract
              ? arbTokenContract.balanceOf(walletAddress)
              : new Promise(exec => exec(Zero)))
            const arbChainTokens: utils.BigNumber[] = []
            try {
              if (arbTokenContract !== null) {
                for (let i = 0; i < arbBalance.toNumber(); i++) {
                  const token = await arbTokenContract.tokenOfOwnerByIndex(
                    walletAddress,
                    i
                  )
                  arbChainTokens.push(token)
                }
              }
            } catch (err) {
              console.warn('Error getting user 721 L2 tokens', err)
            }

            const [lockBoxTokens, totalArbTokens] = await Promise.all([
              ethWallet
                ? ethWallet.getERC721LockBoxTokens(
                    contract.eth.address,
                    walletAddress
                  )
                : [],
              ethWallet
                ? ethWallet.getERC721LockBoxTokens(
                    contract.eth.address,
                    arbchainAddress
                  )
                : []
            ])
            const updated = {
              ethBalance,
              arbBalance,
              tokens: ethTokens,
              arbChainTokens,
              totalArbTokens,
              lockBoxTokens
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
  /** @function
   * @name approve
   * @memberof bridge.token
   * @description Approve spending token for current contract
   * @param {string} contractAddress ERC20 or ERC721 contract address
   * @return {Promise} Promise: includes ContractReceipt and ContractTransaction
   */
  const approveToken = useCallback(
    async (_contractAddressUpcased: string) => {
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()

      const contract = bridgeTokens[contractAddress]
      if (!contract) {
        throw new Error(`Contract ${contractAddress} not present`)
      }
      if (!hasL1Contract(contractAddress)) {
        throw new Error(`Token has no l1 copy`)
      }
      if (!ethWallet) return
      let tx: ContractTransaction
      const inboxAddress = (await ethWallet.globalInbox()).address

      switch (contract.type) {
        case TokenType.ERC20:
          tx = await (contract.eth as ERC20).approve(inboxAddress, MIN_APPROVAL)
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
        assetName: contract.symbol,
        assetType: tokenToAssetType(contract.type),
        sender: walletAddress
      })
      try {
        const receipt = await tx.wait()
        updateTransactionStatus(receipt)

        setBridgeTokens(contracts => {
          const target = contracts[contractAddress]
          if (!target)
            throw Error('approved contract missing ' + contractAddress)

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
      } catch (err) {
        setTransactionFailure(tx.hash)
      }
    },
    [bridgeTokens, ethWallet]
  )
  /** @function
   * @name deposit
   * @memberof bridge.token
   * @description Deposit ERC20 or ERC721 from L1 onto Arbitrum chain
   * @param {string} contractAddress ERC20 or ERC721 contract address
   * @param {string} amountOrTokenId Ammount to deposit for ERC20 or token to deposit for ERC721
   * @return {Promise} Promise: ContractReceipt
   */
  const depositToken = useCallback(
    async (
      _contractAddressUpcased: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt | undefined> => {
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()
      if (!ethWallet) throw new Error('deposit missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')
      if (!contract.eth) {
        throw new Error('Token is not depositable')
      }
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
        assetName: contract.symbol,
        assetType: tokenToAssetType(contract.type),
        sender: walletAddress
      })
      try {
        const receipt = await tx.wait()
        updateTransactionStatus(receipt)
        updateTokenBalances(contract.type)
        return receipt
      } catch (err) {
        setTransactionFailure(tx.hash)
      }
    },
    [ethWallet, bridgeTokens]
  )
  /** @function
   * @name withdraw
   * @memberof bridge.token
   * @description Initiate withdrawal ERC20 or ERC721 token from Arbitrum chain to L1
   * @param {string} contractAddress ERC20 or ERC721 contract address
   * @param {string} amountOrTokenId Ammount to withdraw for ERC20 or token to withdraw for ERC721
   * @return {Promise} Promise: ContractReceipt
   */
  const withdrawToken = useCallback(
    async (
      _contractAddressUpcased: string,
      amountOrTokenId: string,
      returnResponse = false
    ): Promise<ContractReceipt | ContractTransaction | undefined> => {
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()
      if (!walletAddress) throw new Error('withdraw token no walletAddress')
      if (!arbSigner) throw new Error('withdraw token no arbSigner')
      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      if (!hasL1Contract(contractAddress)) {
        throw new Error('Not a withdrawable Token')
      }

      const arbTokenContract = contract.arb
      if (!arbTokenContract) {
        throw new Error("Can't withdraw; arb token not present")
      }

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20: {
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await arbTokenContract.withdraw(walletAddress, amount)
          if (!tx.blockNumber) {
            tx.blockNumber = await ethProvider.getBlockNumber()
          }
          break
        }
        case TokenType.ERC721:
          tx = await arbTokenContract.withdraw(walletAddress, amountOrTokenId)
          if (!tx.blockNumber) {
            tx.blockNumber = await ethProvider.getBlockNumber()
          }
          break
        default:
          assertNever(contract, 'withdrawToken exhaustive check failed')
      }
      addTransaction({
        type: 'withdraw',
        status: 'pending',
        value: amountOrTokenId,
        txID: tx.hash,
        assetName: contract.symbol,
        assetType: tokenToAssetType(contract.type),
        sender: walletAddress,
        blockNumber: tx.blockNumber || 0
      })
      if (returnResponse) {
        return tx
      }
      try {
        const receipt = await tx.wait()
        updateTransactionStatus(receipt)

        const { hash } = tx

        if (!hash) throw new Error('withdrawToken: missing hash in txn')

        updateTokenBalances(contract.type)
        return receipt
      } catch (err) {
        console.warn('err', err)

        setTransactionFailure(tx.hash)
      }
    },
    [walletAddress, bridgeTokens]
  )
  /** @function
   * @memberof bridge.token
   * @name withdrawLockBox
   * @description Transfers token from lockbox to L1 address.
   * @param {string} contractAddress ERC20 or ERC721 contract address
   * @param {string=} tokenId NFT ID to transfer (for ERC20, transfers full balance)
   * @return {Promise} Promise: ContractReceipt
   */
  const withdrawLockBoxToken = useCallback(
    async (
      _contractAddressUpcased: string,
      tokenId?: string
    ): Promise<ContractReceipt | undefined> => {
      if (!ethWallet) throw new Error('ethWallet missing req')
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      const balance = erc20Balances[contractAddress]

      if (hasL1Contract(contractAddress)) {
        throw new Error('Not a withdrawable token')
      }
      // TODO error handle
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20: {
          tx = await ethWallet.withdrawERC20FromLockbox(
            (contract.eth as ERC20).address
          )
          break
        }
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
        value:
          tokenId ||
          (balance && utils.formatEther(balance.lockBoxBalance)) ||
          '0',
        txID: tx.hash,
        assetName: contract.symbol,
        assetType: tokenToAssetType(contract.type),
        sender: walletAddress
      })
      try {
        const receipt = await tx.wait()
        updateTransactionStatus(receipt)
        updateTokenBalances(contract.type)
        return receipt
      } catch (err) {
        console.warn(err)
        setTransactionFailure(tx.hash)
      }
    },
    [ethWallet, bridgeTokens]
  )

  const getERC20Info = useCallback(
    async (_contractAddressUpcased: string): Promise<ERC20L1 | undefined> => {
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()
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

  const hasL1Contract = useCallback(
    (contractAddress: string): boolean => {
      const contractData = bridgeTokens[contractAddress]
      if (!contractData) {
        return false
      }
      if (contractData.eth && contractData.arb) {
        return true
      }
      return false
    },
    [bridgeTokens]
  )

  const getERC20TokenData = useCallback(
    async (contractAddress: string): Promise<ERC20BridgeToken | null> => {
      if (!ethWallet) throw Error('getTokenData: missing required ethWallet')

      const cachedContractData = bridgeTokens[contractAddress]
      if (
        cachedContractData !== undefined &&
        !(cachedContractData.eth && !cachedContractData.arb)
      ) {
        // todo: enforce this properly?
        return cachedContractData as ERC20BridgeToken
      }

      const inboxAddress = (await ethWallet.globalInbox()).address

      const l1ContractData = await (async () => {
        const code = await ethProvider.getCode(contractAddress)
        // check if any contract present
        if (code.length <= 2) {
          return null
        }
        const ethERC20 = ERC20Factory.connect(
          contractAddress,
          _ethSigner || ethProvider
        )
        try {
          const [allowance, tokenName, decimals, symbol] = await Promise.all([
            ethERC20.allowance(walletAddress, inboxAddress),
            ethERC20.name(),
            ethERC20.decimals(),
            ethERC20.symbol()
          ])
          return {
            tokenContract: ethERC20,
            tokenData: {
              allowance,
              tokenName,
              decimals,
              symbol
            }
          }
        } catch (err) {
          console.warn(`Failed to get token data for ${contractAddress}:`, err)
          return null
        }
      })()

      const l2ContractData = await (async l1ContractData => {
        const code = await arbProvider.getCode(contractAddress)
        // check if any contract present
        if (code.length <= 2) {
          return null
        }

        const _arbTokenContract = ERC20Factory.connect(
          contractAddress,
          arbSigner || ethProvider
        )

        const arbTokenContract: abi.ArbErc20 | abi.ArbErc721 = ArbErc20Factory.connect(contractAddress, _arbSigner || arbProvider)
        // check that it looks like an ERC20
        try {
          await arbTokenContract.balanceOf(walletAddress)
        } catch (err) {
          console.warn(
            `Arb contract at ${contractAddress} doesn't look like an ERC20:`,
            err
          )
          return null
        }

        if (l1ContractData) {
          return {
            tokenContract: arbTokenContract,
            tokenData: null //token data is included on the L1 side
          }
        }

        //  if no L1 contract data, attempt to retrieve data from L2
        try {
          const [decimals, symbol] = await Promise.all([
            // arbTokenContract.name(),
            arbTokenContract.decimals(),
            arbTokenContract.symbol()
          ])
          return {
            tokenContract: arbTokenContract,
            tokenData: { tokenName: 'x', decimals, symbol }
          }
        } catch (err) {
          console.warn(
            `Could not fetch ERC20 token data for Arb contract at ${contractAddress}:`,
            err
          )
          return null
        }
      })(l1ContractData)

      if (!l1ContractData && !l2ContractData) {
        return null
      }

      if (l1ContractData) {
        const {
          allowance,
          tokenName,
          decimals,
          symbol
        } = l1ContractData.tokenData
        return {
          arb: l2ContractData ? l2ContractData.tokenContract : null,
          eth: l1ContractData.tokenContract,
          type: TokenType.ERC20,
          allowed: allowance.gte(MIN_APPROVAL.div(2)),
          name: tokenName,
          decimals,
          symbol
        }
      } else if (l2ContractData !== null && l2ContractData.tokenData !== null) {
        const { tokenName, decimals, symbol } = l2ContractData.tokenData
        return {
          arb: l2ContractData.tokenContract,
          eth: null,
          type: TokenType.ERC20,
          allowed: true, // this is ugly, but lets us avoid having to define a new type; there is no "allowance" consideration for an L2 only token
          name: tokenName,
          decimals,
          symbol
        }
      }

      return null
    },
    [
      bridgeTokens,
      ethProvider,
      _ethSigner,
      ethWallet,
      arbProvider,
      _arbSigner,
      walletAddress
    ]
  )

  /** @function
   * @name add
   * @memberof bridge.token
   * @description Add token to state (to track balances, deposit, withdraw, etc.)
   * @param {string} contractAddress ERC20 or ERC721 contract address
   * @param {TokenType} type
   * @return {Promise} Promise: contract address
   */
  const addToken = useCallback(
    async (
      _contractAddressUpcased: string,
      type: TokenType
    ): Promise<string> => {
      if (!arbProvider || !ethWallet || !_ethSigner || !_arbSigner)
        throw Error('addToken missing req')
      const contractAddress = _contractAddressUpcased.toLocaleLowerCase()
      const isEthContract =
        (await ethProvider.getCode(contractAddress)).length > 2
      if (!isEthContract) {
        console.warn('contract not deployed')
        return ''
      } else if (bridgeTokens[contractAddress]) {
        console.warn('token already added')
        return ''
      }

      // TODO error handle
      let newContract: BridgeToken | null

      switch (type) {
        case TokenType.ERC20: {
          newContract = await getERC20TokenData(contractAddress)

          if (newContract && !ERC20Cache?.includes(contractAddress)) {
            setERC20Cache([...ERC20Cache, contractAddress])
          }
          break
        }
        case TokenType.ERC721: {
          if (bridgeTokens[contractAddress]) {
            console.info('Token already added:', contractAddress)
            return ''
          }
          const isEthContract =
            (await ethProvider.getCode(contractAddress)).length > 2
          if (!isEthContract) {
            console.warn('contract not deployed')
            return ''
          }
          const arbContract = await arbTokenCache(contractAddress, type)
          const inboxAddress = (await ethWallet.globalInbox()).address
          const ethERC721 = ERC721Factory.connect(contractAddress, _ethSigner)

          const [allowed, tokenName, symbol] = await Promise.all([
            ethERC721.isApprovedForAll(walletAddress, inboxAddress),
            ethERC721.name(),
            ethERC721.symbol()
          ])

          newContract = {
            arb: arbContract as abi.ArbErc721 | null,
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
      if (newContract !== null) {
        const _newContract = newContract
        setBridgeTokens(contracts => {
          return {
            ...contracts,
            [contractAddress]: _newContract
          }
        })
      }

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
  /** @function
   * updateAllBalances
   * @memberof bridge.balances
   * @name update
   * @description Updates balances.eth, balances.erc20, and balances.erc721 objects with latest values.
   * */
  const updateAllBalances = useCallback(
    () => Promise.all([updateEthBalances(), updateTokenBalances()]),
    [updateEthBalances, updateTokenBalances, bridgeTokens]
  )

  /** @function
   * @name expire
   * @memberof bridge.cache
   * @description Clears ERC20 and ERC721 cache from local storage.
   * @return {undefined}
   */
  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  // TODO replace IIFEs with Promise.allSettled once available
  useEffect(() => {
    if (arbProvider && walletAddress) {
      const tokensToAdd = [
        ...new Set(
          [...ERC20Cache, ...defaultTokenList].map(t => t.toLocaleLowerCase())
        )
      ]
      if (autoLoadCache) {
        Promise.all(
          tokensToAdd.map(address => {
            return addToken(address, TokenType.ERC20).catch(err => {
              console.warn(`invalid cache entry erc20 ${address}`)
              console.warn(err)
            })
          })
        ).then(_values => {
          // hot fix remove duplicates and insure lowercase in cache for insurance against old bug:
          const values: (string | void)[] = [
            ...new Set(_values.map(t => t && t.toLocaleLowerCase()))
          ]
          setERC20Cache(values.filter((val): val is string => !!val))
        })

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
      }
    }
  }, [arbProvider, walletAddress])

  useEffect(() => {
    // TODO wallet address hsould be a dep
    const intervalID =
      bridgeTokens &&
      window.setInterval(function () {
        updateAllBalances()
      }, 4000)
    return () => {
      window.clearInterval(intervalID)
    }
  }, [bridgeTokens, walletAddress])

  useEffect(() => {
    if (arbProvider && !walletAddress) {
      const signer = _arbSigner || _ethSigner
      signer?.getAddress().then(add => {
        setWalletAddress(add)
      })
    }
    if (arbProvider && walletAddress) {
      updateAllBalances()
    }
  }, [arbProvider, walletAddress, walletIndex])

  /* update balances on render */
  // may be better to leave this to the user
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
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransactionStatus
    }
  }
}
