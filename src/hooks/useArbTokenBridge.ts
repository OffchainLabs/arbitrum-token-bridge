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

interface BridgedToken {
  type: TokenType
  name: string
  symbol: string
  allowed: boolean
  arb: abi.ArbErc20 | abi.ArbErc721 | null
  eth: ERC20 | ERC721
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: abi.ArbErc20 | null
  eth: ERC20
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

export interface BridgeBalance {
  balance: utils.BigNumber
  arbChainBalance: utils.BigNumber
  totalArbBalance: utils.BigNumber
  lockBoxBalance: utils.BigNumber
}

// removing 'tokens' / 'balance' could result in one interface
export interface ERC721Balance {
  tokens: utils.BigNumber[]
  arbChainTokens: utils.BigNumber[]
  totalArbTokens: utils.BigNumber[]
  lockBoxTokens: utils.BigNumber[]
}

const usePrevious = (value: any): undefined => {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
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

  const [walletAddress, setWalletAddress] = useState('')

  const [
    transactions,
    {
      addTransaction,
      setTransactionSuccess,
      setTransactionFailure,
      clearPendingTransactions
    }
  ] = useTransactions()

  /*
  ETH METHODS:
  */
  const updateEthBalances = useCallback(async () => {
    if (!arbProvider) throw new Error('updateEthBalances no arb provider')
    if (!walletAddress) throw new Error('updateEthBalances walletAddress')
    if (!ethWallet) throw new Error('updateEthBalances ethWallet')

    const [
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
    ] = await Promise.all([
      ethProvider.getBalance(walletAddress),
      arbProvider.getBalance(walletAddress),
      ethWallet.getEthLockBoxBalance(walletAddress),
      ethWallet.getEthLockBoxBalance(arbchainAddress)
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
  }, [
    arbProvider,
    ethBalances,
    walletAddress,
    walletIndex,
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
        const arbTokenContract =  await arbTokenCache(contract.eth.address)
        switch (contract.type) {
          case TokenType.ERC20: {

            let arbBalancePromise:  Promise<utils.BigNumber> = arbTokenContract ?  arbTokenContract.balanceOf(walletAddress) : new Promise(exec => exec(constants.Zero))
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
            const updated = {
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance
            }

            erc20Updates[contract.eth.address] = updated

            break
          }
          case TokenType.ERC721: {
            let arbTokensPromise: Promise<utils.BigNumber[]> = arbTokenContract ?  arbTokenContract.tokensOfOwner(walletAddress) : new Promise(exec => exec([]))

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
            const updated = {
              tokens,
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
      try {
        const receipt = await tx.wait()
        setTransactionSuccess(tx.hash)

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
      } catch (err) {
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

      const tokenContract = await arbTokenCache(contractAddress)
      if (!tokenContract){
        throw new Error ("Can't withdraw; arb token not present")
      }

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20: {
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await tokenContract.withdraw(walletAddress, amount)
          break
        }
        case TokenType.ERC721:
          tx = await tokenContract.withdraw(walletAddress, amountOrTokenId)
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

        updateTokenBalances(contract.type)
        return receipt
      } catch (err) {
        console.warn('err', err)

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
      } catch (err) {
        console.warn(err)
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

  const arbTokenCache = useCallback(
    async (contractAddress: string) => {
    const token = bridgeTokens[contractAddress]
    if (!token){
      return null
    }

    if(token.arb){
      return token.arb
    }

    if( (await arbProvider.getCode(contractAddress)).length <= 2){
      console.warn('contract does not yet exist on arbchain:')
      return null
    }

    // todo:
    const arbTokenContract: any = ArbErc20Factory.connect(
      contractAddress,
      _arbSigner || arbProvider
    )
    setBridgeTokens(contracts => {
      const target = contracts[contractAddress]
      if (!target)
        throw Error('approved contract missing ' + contractAddress)

      const updated = {
        ...target,
        arb: arbTokenContract
      }

      return {
        ...contracts,
        [contractAddress]: updated
      }
    })


    return arbTokenContract



  }, [bridgeTokens, _arbSigner, arbProvider])
  const addToken = useCallback(
    async (contractAddress: string, type: TokenType): Promise<string> => {
      if (!arbProvider || !ethWallet || !_ethSigner || !_arbSigner)
        throw Error('addToken missing req')

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
      let newContract: BridgeToken
      const inboxAddress = (await ethWallet.globalInboxConn()).address

      switch (type) {
        case TokenType.ERC20: {

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

          const arbERC20 = await arbTokenCache(contractAddress)
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
          const arbERC721 = await arbTokenCache(contractAddress)
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
      // arguably unnecessary, but I like it, for insurance
      window.setInterval(updateAllBalances, 7500)
    }
    if (
      prevERC20Balances &&
      isEmpty(prevERC20Balances) &&
      !isEmpty(erc20Balances)
    ) {
      console.info('ERC20 Balances initial load')
    }
    if (
      prevERC721Balances &&
      isEmpty(prevERC721Balances) &&
      !isEmpty(erc721Balances)
    ) {
      console.info('ERC721 Balances initial load')
    }
  }, [prevEthBalances, ethBalances, erc20Balances, erc721Balances])

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
