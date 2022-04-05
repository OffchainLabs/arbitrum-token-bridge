import { useCallback, useEffect, useState, useMemo } from 'react'
import { BigNumber, constants, utils, providers } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import { Bridge } from 'arb-ts'
import {
  L1Network,
  L2Network,
  EthBridger,
  Erc20Bridger,
  MultiCaller,
  L2ToL1Message,
  L2ToL1MessageReader,
  L2TransactionReceipt
} from '@arbitrum/sdk'
import { getOutboxAddr } from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'

import { Node__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Node__factory'
import { Rollup__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Rollup__factory'

import useTransactions from './useTransactions'
import {
  AddressToSymbol,
  AddressToDecimals,
  ArbTokenBridge,
  AssetType,
  BridgeBalance,
  BridgeToken,
  ContractStorage,
  ERC20BridgeToken,
  ERC721Balance,
  L2ToL1EventResultPlus,
  PendingWithdrawalsMap,
  TokenType,
  L1TokenData,
  L2TokenData,
  OutgoingMessageState,
  WithdrawalInitiated
} from './arbTokenBridge.types'

import {
  getLatestOutboxEntryIndex,
  messageHasExecuted,
  getETHWithdrawals,
  getTokenWithdrawals as getTokenWithdrawalsGraph,
  getL2GatewayGraphLatestBlockNumber,
  getBuiltInsGraphLatestBlockNumber,
  getNodes,
  NodeDataResult
} from '../util/graph'

export const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms))
}

function notNull<TValue>(value: TValue | null): value is TValue {
  return value !== null
}
const { Zero } = constants
/* eslint-disable no-shadow */

const addressToSymbol: AddressToSymbol = {}
const addressToDecimals: AddressToDecimals = {}

class TokenDisabledError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'TokenDisabledError'
  }
}

function getDefaultTokenName(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

function getDefaultTokenSymbol(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

export interface TokenBridgeParams {
  l1: {
    signer: Signer
    network: L1Network
  }
  l2: {
    signer: Signer
    network: L2Network
  }
}

export const useArbTokenBridge = (
  bridge: Bridge,
  params: TokenBridgeParams,
  autoLoadCache = true
): ArbTokenBridge => {
  const { l1, l2 } = params

  const [walletAddress, setWalletAddress] = useState('')

  const defaultBalance = {
    balance: null,
    arbChainBalance: null
  }

  const [ethBalances, setEthBalances] = useState<BridgeBalance>(defaultBalance)

  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken>
  >({})

  const balanceIsEmpty = (balance: BridgeBalance) =>
    balance['balance'] === defaultBalance['balance'] &&
    balance['arbChainBalance'] === defaultBalance['arbChainBalance']

  const [erc20Balances, setErc20Balances] = useState<
    ContractStorage<BridgeBalance>
  >({})

  const [erc721Balances, setErc721Balances] = useState<
    ContractStorage<ERC721Balance>
  >({})

  const defaultTokenList: string[] = []

  const tokenBlackList: string[] = []
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

  interface ExecutedMessagesCache {
    [id: string]: boolean
  }

  const [
    executedMessagesCache,
    setExecutedMessagesCache,
    clearExecutedMessagesCache
  ] = useLocalStorage<ExecutedMessagesCache>('executedMessagesCache', {}) as [
    ExecutedMessagesCache,
    React.Dispatch<ExecutedMessagesCache>,
    React.Dispatch<void>
  ]

  const [pendingWithdrawalsMap, setPendingWithdrawalMap] =
    useState<PendingWithdrawalsMap>({})
  const [
    transactions,
    {
      addTransaction,
      addTransactions,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      updateL1ToL2MsgData
    }
  ] = useTransactions()

  const l1NetworkID = useMemo(() => String(l1.network.chainID), [l1.network])

  /**
   * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
   * @param erc20L1Address
   * @returns
   */
  async function getL1TokenData(erc20L1Address: string): Promise<L1TokenData> {
    if (typeof l1.signer.provider === 'undefined') {
      throw new Error(`No provider found for L1 signer`)
    }

    const erc20Bridger = new Erc20Bridger(l2.network)
    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1.signer.provider
    )

    const contract = ERC20__factory.connect(erc20L1Address, l1.signer)

    const multiCaller = await MultiCaller.fromProvider(l1.signer.provider)
    const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
      name: true,
      symbol: true,
      balanceOf: { account: walletAddress },
      allowance: { owner: walletAddress, spender: l1GatewayAddress },
      decimals: true
    })

    if (typeof tokenData.balance === 'undefined') {
      throw new Error(`No balance method available`)
    }

    if (typeof tokenData.allowance === 'undefined') {
      throw new Error(`No allowance method available`)
    }

    return {
      name: tokenData.name || getDefaultTokenName(erc20L1Address),
      symbol: tokenData.symbol || getDefaultTokenSymbol(erc20L1Address),
      balance: tokenData.balance,
      allowance: tokenData.allowance,
      decimals: tokenData.decimals || 0,
      contract
    }
  }

  /**
   * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
   * @param erc20L2Address
   * @returns
   */
  async function getL2TokenData(erc20L2Address: string): Promise<L2TokenData> {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const contract = StandardArbERC20__factory.connect(
      erc20L2Address,
      l2.signer
    )

    const multiCaller = await MultiCaller.fromProvider(l2.signer.provider)
    const [tokenData] = await multiCaller.getTokenData([erc20L2Address], {
      balanceOf: { account: walletAddress }
    })

    if (typeof tokenData.balance === 'undefined') {
      throw new Error(`No balance method available`)
    }

    return {
      balance: tokenData.balance,
      contract
    }
  }

  /**
   * Retrieves the L1 address of an ERC-20 token using its L2 address.
   * @param erc20L2Address
   * @returns
   */
  async function getL1ERC20Address(
    erc20L2Address: string
  ): Promise<string | null> {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    try {
      return await new Erc20Bridger(l2.network).getL1ERC20Address(
        erc20L2Address,
        l2.signer.provider
      )
    } catch (error) {
      return null
    }
  }

  /**
   * Retrieves the L2 address of an ERC-20 token using its L1 address.
   * @param erc20L1Address
   * @returns
   */
  async function getL2ERC20Address(erc20L1Address: string): Promise<string> {
    if (typeof l1.signer.provider === 'undefined') {
      throw new Error(`No provider found for L1 signer`)
    }

    return await new Erc20Bridger(l2.network).getL2ERC20Address(
      erc20L1Address,
      l1.signer.provider
    )
  }

  /**
   * Retrieves data about whether an ERC-20 token is disabled on the router.
   * @param erc20L1Address
   * @returns
   */
  async function l1TokenIsDisabled(erc20L1Address: string): Promise<boolean> {
    if (typeof l1.signer.provider === 'undefined') {
      throw new Error(`No provider found for L1 signer`)
    }

    return new Erc20Bridger(l2.network).l1TokenIsDisabled(
      erc20L1Address,
      l1.signer.provider
    )
  }

  const walletAddressCached = useCallback(async () => {
    if (walletAddress) {
      return walletAddress
    }

    const address = await l1.signer.getAddress()
    setWalletAddress(address)
    return address
  }, [walletAddress, l1.signer])

  const depositEth = async (amount: BigNumber) => {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const ethBridger = new EthBridger(l2.network)

    const tx = await ethBridger.deposit({
      l1Signer: l1.signer,
      l2Provider: l2.signer.provider,
      amount
    })

    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: utils.formatUnits(amount, 'wei'),
      txID: tx.hash,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: await walletAddressCached(),
      l1NetworkID
    })

    const receipt = await tx.wait()
    const messages = await receipt.getL1ToL2Messages(l2.signer)

    if (messages.length !== 1) {
      throw new Error(
        `Expected a single L1 to L2 message but got ${messages.length}`
      )
    }

    const seqNum = messages.map(m => m.messageNumber)[0]

    updateTransaction(receipt, tx, seqNum.toNumber())
    updateEthBalances()
  }

  async function withdrawEth(amount: BigNumber) {
    const ethBridger = new EthBridger(l2.network)
    const tx = await ethBridger.withdraw({ l2Signer: l2.signer, amount })

    try {
      addTransaction({
        type: 'withdraw',
        status: 'pending',
        value: utils.formatUnits(amount, 'wei'),
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await walletAddressCached(),
        blockNumber: tx.blockNumber || 0, // TODO: ensure by fetching blocknumber?,
        l1NetworkID
      })

      const receipt = await tx.wait()

      updateTransaction(receipt, tx)
      updateEthBalances()

      const l2ToL1Events = receipt.getL2ToL1Events()

      if (l2ToL1Events.length === 1) {
        const l2ToL1EventResult = l2ToL1Events[0]
        console.info('withdraw event data:', l2ToL1EventResult)

        const id = l2ToL1EventResult.uniqueId.toString()

        const outgoingMessageState = await getOutgoingMessageState(
          l2ToL1EventResult.batchNumber,
          l2ToL1EventResult.indexInBatch
        )
        const l2ToL1EventResultPlus: L2ToL1EventResultPlus = {
          ...l2ToL1EventResult,
          type: AssetType.ETH,
          value: amount,
          outgoingMessageState,
          symbol: 'ETH',
          decimals: 18,
          nodeBlockDeadline: 'NODE_NOT_CREATED'
        }
        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          return {
            ...oldPendingWithdrawalsMap,
            [id]: l2ToL1EventResultPlus
          }
        })
      }

      return receipt
    } catch (e) {
      console.error('withdrawEth err', e)
    }
  }

  const approveToken = async (erc20L1Address: string) => {
    const erc20Bridger = new Erc20Bridger(l2.network)

    const tx = await erc20Bridger.approveToken({
      l1Signer: l1.signer,
      erc20L1Address
    })

    const tokenData = await getL1TokenData(erc20L1Address)

    addTransaction({
      type: 'approve',
      status: 'pending',
      value: null,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: await walletAddressCached(),
      l1NetworkID
    })

    const receipt = await tx.wait()

    updateTransaction(receipt, tx)
    updateTokenData(erc20L1Address)
  }

  async function depositToken(erc20L1Address: string, amount: BigNumber) {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const erc20Bridger = new Erc20Bridger(l2.network)

    const { symbol, decimals } = await getL1TokenData(erc20L1Address)

    const tx = await erc20Bridger.deposit({
      l1Signer: l1.signer,
      l2Provider: l2.signer.provider,
      erc20L1Address,
      amount
    })

    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: utils.formatUnits(amount, decimals),
      txID: tx.hash,
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: await walletAddressCached(),
      l1NetworkID
    })

    const receipt = await tx.wait()
    const messages = await receipt.getL1ToL2Messages(l2.signer)

    if (messages.length !== 1) {
      throw new Error(
        `Expected a single L1 to L2 message but got ${messages.length}`
      )
    }

    const seqNum = messages.map(m => m.messageNumber)[0]

    updateTransaction(receipt, tx, seqNum.toNumber())
    updateTokenData(erc20L1Address)

    return receipt
  }

  async function withdrawToken(erc20l1Address: string, amount: BigNumber) {
    const bridgeToken = bridgeTokens[erc20l1Address]

    const { symbol, decimals } = await (async () => {
      if (bridgeToken) {
        const { symbol, decimals } = bridgeToken
        return { symbol, decimals }
      }
      const { symbol, decimals } = await getL1TokenData(erc20l1Address)
      addToken(erc20l1Address)
      return { symbol, decimals }
    })()

    const erc20Bridger = new Erc20Bridger(l2.network)
    const tx = await erc20Bridger.withdraw({
      l2Signer: l2.signer,
      erc20l1Address,
      amount
    })

    addTransaction({
      type: 'withdraw',
      status: 'pending',
      value: utils.formatUnits(amount, decimals),
      txID: tx.hash,
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: await l2.signer.getAddress(),
      blockNumber: tx.blockNumber || 0,
      l1NetworkID
    })

    try {
      const receipt = await tx.wait()
      updateTransaction(receipt, tx)

      const l2ToL1Events = receipt.getL2ToL1Events()

      if (l2ToL1Events.length === 1) {
        const l2ToL1EventDataResult = l2ToL1Events[0]
        const id = l2ToL1EventDataResult.uniqueId.toString()
        const outgoingMessageState = await getOutgoingMessageState(
          l2ToL1EventDataResult.batchNumber,
          l2ToL1EventDataResult.indexInBatch
        )
        const l2ToL1EventDataResultPlus: L2ToL1EventResultPlus = {
          ...l2ToL1EventDataResult,
          type: AssetType.ERC20,
          tokenAddress: erc20l1Address,
          value: amount,
          outgoingMessageState,
          symbol: symbol,
          decimals: decimals,
          nodeBlockDeadline: 'NODE_NOT_CREATED'
        }

        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          return {
            ...oldPendingWithdrawalsMap,
            [id]: l2ToL1EventDataResultPlus
          }
        })
      }
      updateTokenData(erc20l1Address)
      return receipt
    } catch (err) {
      console.warn('withdraw token err', err)
    }
  }

  const removeTokensFromList = (listID: number) => {
    setBridgeTokens(prevBridgeTokens => {
      const newBridgeTokens = { ...prevBridgeTokens }
      for (let address in bridgeTokens) {
        const token = bridgeTokens[address]
        if (!token) continue
        if (token.listID === listID) {
          delete newBridgeTokens[address]
        }
      }
      return newBridgeTokens
    })
  }

  const addTokensFromList = async (
    arbTokenList: TokenList,
    listID?: number
  ) => {
    const {
      l1Bridge: {
        network: { chainID: l1ChainIStr }
      },
      l2Bridge: {
        network: { chainID: l2ChainIDStr }
      }
    } = bridge

    const l1ChainID = +l1ChainIStr
    const l2ChainID = +l2ChainIDStr

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}

    const candidateUnbridgedTokensToAdd: ERC20BridgeToken[] = []

    for (const tokenData of arbTokenList.tokens) {
      const { address, name, symbol, extensions, decimals, logoURI, chainId } =
        tokenData

      if (![l1ChainID, l2ChainID].includes(chainId)) {
        continue
      }

      const bridgeInfo = (() => {
        // TODO: parsing the token list format could be from arbts or the tokenlist package
        interface Extensions {
          bridgeInfo: {
            [chainId: string]: {
              tokenAddress: string
              originBridgeAddress: string
              destBridgeAddress: string
            }
          }
        }
        const isExtensions = (obj: any): obj is Extensions => {
          if (!obj) return false
          if (!obj['bridgeInfo']) return false
          return Object.keys(obj['bridgeInfo'])
            .map(key => obj['bridgeInfo'][key])
            .every(
              e =>
                e &&
                'tokenAddress' in e &&
                'originBridgeAddress' in e &&
                'destBridgeAddress' in e
            )
        }
        if (!isExtensions(extensions)) {
          return null
        } else {
          return extensions.bridgeInfo
        }
      })()

      if (bridgeInfo) {
        const l1Address = bridgeInfo[l1NetworkID].tokenAddress
        bridgeTokensToAdd[l1Address] = {
          name,
          type: TokenType.ERC20,
          symbol,
          address: l1Address,
          l2Address: address,
          decimals,
          logoURI,
          listID
        }
      }
      // save potentially unbridged L1 tokens:
      // stopgap: giant lists (i.e., CMC list) currently severaly hurts page performace, so for now we only add the bridged tokens
      else if (arbTokenList.tokens.length < 1000) {
        const l1Address = address
        candidateUnbridgedTokensToAdd.push({
          name,
          type: TokenType.ERC20,
          symbol,
          address: l1Address,
          decimals,
          logoURI,
          listID
        })
      }
    }

    // add L1 tokens only if they aren't already bridged (i.e., if they haven't already beed added as L2 arb-tokens to the list)
    const l1AddressesOfBridgedTokens = new Set(
      Object.keys(bridgeTokensToAdd).map(
        l1Address =>
          l1Address.toLowerCase() /* lists should have the checksummed case anyway, but just in case (pun unintended) */
      )
    )
    for (let l1TokenData of candidateUnbridgedTokensToAdd) {
      if (!l1AddressesOfBridgedTokens.has(l1TokenData.address.toLowerCase())) {
        bridgeTokensToAdd[l1TokenData.address] = l1TokenData
      }
    }

    setBridgeTokens(oldBridgeTokens => {
      const newBridgeTokens = {
        ...oldBridgeTokens,
        ...bridgeTokensToAdd
      }
      updateTokenBalances(newBridgeTokens)
      return newBridgeTokens
    })
  }

  async function addToken(erc20L1orL2Address: string) {
    let l1Address: string
    let l2Address: string | undefined
    let l1TokenBalance: BigNumber | null = null
    let l2TokenBalance: BigNumber | null = null

    const maybeL1Address = await getL1ERC20Address(erc20L1orL2Address)

    if (maybeL1Address) {
      // looks like l2 address was provided
      l1Address = maybeL1Address
      l2Address = erc20L1orL2Address
    } else {
      // looks like l1 address was provided
      l1Address = erc20L1orL2Address
      l2Address = await getL2ERC20Address(l1Address)
    }

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}
    const { name, symbol, balance, decimals } = await getL1TokenData(l1Address)

    l1TokenBalance = balance

    try {
      // check if token is deployed at l2 address; if not this will throw
      const { balance } = await getL2TokenData(l2Address)
      l2TokenBalance = balance
    } catch (error) {
      console.info(`no L2 token for ${l1Address} (which is fine)`)

      l2Address = undefined
    }

    const isDisabled = await l1TokenIsDisabled(l1Address)

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled')
    }

    bridgeTokensToAdd[l1Address] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: l1Address,
      l2Address,
      decimals
    }
    setBridgeTokens(oldBridgeTokens => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd }
    })
    setErc20Balances(oldBridgeBalances => {
      const newBal = {
        [l1Address]: {
          balance: l1TokenBalance,
          arbChainBalance: l2TokenBalance
        }
      }
      return { ...oldBridgeBalances, ...newBal }
    })
    return l1Address
  }

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  useEffect(() => {
    const tokensToAdd = [
      ...new Set([...defaultTokenList].map(t => t.toLocaleLowerCase()))
    ].filter(tokenAddress => !tokenBlackList.includes(tokenAddress))
    if (autoLoadCache) {
      Promise.all(
        tokensToAdd.map(address => {
          return addToken(address).catch(err => {
            console.warn(`invalid cache entry erc20 ${address}`)
            console.warn(err)
          })
        })
      ).then(values => {
        setERC20Cache(values.filter((val): val is string => !!val))
      })
    }

    l1.signer.getAddress().then(_address => {
      setWalletAddress(_address)
    })
  }, [])

  async function updateEthBalances() {
    const l1Balance = await l1.signer.getBalance()
    const l2Balance = await l2.signer.getBalance()

    setEthBalances({
      balance: l1Balance,
      arbChainBalance: l2Balance
    })
  }

  const updateTokenData = useCallback(
    async (l1Address: string) => {
      const bridgeToken = bridgeTokens[l1Address]
      if (!bridgeToken) {
        return
      }
      const { l2Address } = bridgeToken
      const l1Data = await getL1TokenData(l1Address)
      const l2Data =
        (l2Address && (await getL2TokenData(l2Address))) || undefined
      const erc20TokenBalance: BridgeBalance = {
        balance: l1Data.balance,
        arbChainBalance: l2Data?.balance || Zero
      }

      setErc20Balances(oldErc20Balances => ({
        ...oldErc20Balances,
        [l1Address]: erc20TokenBalance
      }))
      const newBridgeTokens = { [l1Address]: bridgeToken }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...newBridgeTokens }
      })
    },
    [setErc20Balances, bridgeTokens, setBridgeTokens]
  )

  const updateTokenBalances = async (
    bridgeTokens: ContractStorage<BridgeToken>
  ) => {
    if (typeof l1.signer.provider === 'undefined') {
      throw new Error(`No provider found for L1 signer`)
    }

    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const walletAddress = await walletAddressCached()
    const l1MultiCaller = await MultiCaller.fromProvider(l1.signer.provider)
    const l2MultiCaller = await MultiCaller.fromProvider(l2.signer.provider)

    const l1Addresses = Object.keys(bridgeTokens)
    const l1AddressesBalances = await l1MultiCaller.getTokenData(l1Addresses, {
      balanceOf: { account: walletAddress }
    })
    const l1Balances = l1Addresses.map((address: string, index: number) => ({
      tokenAddr: address,
      balance: l1AddressesBalances[index].balance
    }))

    const l2Addresses = l1Addresses
      .map(l1Address => {
        return (bridgeTokens[l1Address] as ERC20BridgeToken).l2Address
      })
      .filter((val): val is string => !!val)
    const l2AddressesBalances = await l2MultiCaller.getTokenData(l2Addresses, {
      balanceOf: { account: walletAddress }
    })
    const l2Balances = l2Addresses.map((address: string, index: number) => ({
      tokenAddr: address,
      balance: l2AddressesBalances[index].balance
    }))

    const l2AddressToBalanceMap: {
      [l2Address: string]: BigNumber | undefined
    } = l2Balances.reduce((acc, l1Address) => {
      const { tokenAddr, balance } = l1Address
      return { ...acc, [tokenAddr]: balance }
    }, {})

    setErc20Balances(oldERC20Balances => {
      const newERC20Balances: ContractStorage<BridgeBalance> =
        l1Balances.reduce(
          (acc, { tokenAddr: l1TokenAddress, balance: l1Balance }) => {
            const l2Address = (bridgeTokens[l1TokenAddress] as ERC20BridgeToken)
              .l2Address

            return {
              ...acc,
              [l1TokenAddress]: {
                balance: l1Balance,
                arbChainBalance: l2Address
                  ? l2AddressToBalanceMap[l2Address]
                  : undefined
              }
            }
          },
          {}
        )

      return { ...oldERC20Balances, ...newERC20Balances }
    })
  }

  async function triggerOutboxToken(id: string) {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    if (!pendingWithdrawalsMap[id]) {
      throw new Error('Outbox message not found')
    }

    const { batchNumber, indexInBatch, tokenAddress, value } =
      pendingWithdrawalsMap[id]

    const proofInfo = await L2ToL1MessageReader.tryGetProof(
      l2.signer.provider,
      batchNumber,
      indexInBatch
    )

    if (!proofInfo) {
      throw new Error('No proof found')
    }

    const outboxAddress = getOutboxAddr(l2.network, batchNumber)
    const messageWriter = L2ToL1Message.fromBatchNumber(
      l1.signer,
      outboxAddress,
      batchNumber,
      indexInBatch
    )

    const res = await messageWriter.execute(proofInfo)

    const { symbol, decimals } = await getL1TokenData(tokenAddress as string)

    addTransaction({
      status: 'pending',
      type: 'outbox',
      value: utils.formatUnits(value, decimals),
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: await walletAddressCached(),
      txID: res.hash,
      l1NetworkID
    })

    try {
      const rec = await res.wait()

      if (rec.status === 1) {
        setTransactionConfirmed(rec.transactionHash)
        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
          delete newPendingWithdrawalsMap[id]
          return newPendingWithdrawalsMap
        })
        addToExecutedMessagesCache(batchNumber, indexInBatch)
      } else {
        setTransactionFailure(rec.transactionHash)
      }

      return rec
    } catch (err) {
      console.warn('WARNING: token outbox execute failed:', err)
    }
  }

  async function triggerOutboxEth(id: string) {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    if (!pendingWithdrawalsMap[id]) {
      throw new Error('Outbox message not found')
    }

    const { batchNumber, indexInBatch, value } = pendingWithdrawalsMap[id]

    const proofInfo = await L2ToL1MessageReader.tryGetProof(
      l2.signer.provider,
      batchNumber,
      indexInBatch
    )

    if (!proofInfo) {
      throw new Error('No proof found')
    }

    const outboxAddress = getOutboxAddr(l2.network, batchNumber)
    const messageWriter = L2ToL1Message.fromBatchNumber(
      l1.signer,
      outboxAddress,
      batchNumber,
      indexInBatch
    )

    const res = await messageWriter.execute(proofInfo)

    addTransaction({
      status: 'pending',
      type: 'outbox',
      value: utils.formatEther(value),
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: await walletAddressCached(),
      txID: res.hash,
      l1NetworkID
    })

    try {
      const rec = await res.wait()

      if (rec.status === 1) {
        setTransactionConfirmed(rec.transactionHash)
        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
          delete newPendingWithdrawalsMap[id]
          return newPendingWithdrawalsMap
        })

        addToExecutedMessagesCache(batchNumber, indexInBatch)
      } else {
        setTransactionFailure(rec.transactionHash)
      }

      return rec
    } catch (err) {
      console.warn('WARNING: ETH outbox execute failed:', err)
    }
  }

  const getTokenSymbol = async (_l1Address: string) => {
    const l1Address = _l1Address.toLocaleLowerCase()

    if (addressToSymbol[l1Address]) {
      return addressToSymbol[l1Address]
    }

    try {
      const { symbol } = await getL1TokenData(l1Address)
      addressToSymbol[l1Address] = symbol
      return symbol
    } catch (err) {
      console.warn('could not get token symbol', err)
      return '???'
    }
  }

  const getTokenDecimals = async (_l1Address: string) => {
    const l1Address = _l1Address.toLocaleLowerCase()

    if (addressToDecimals[l1Address]) {
      return addressToDecimals[l1Address]
    }

    try {
      const { decimals } = await getL1TokenData(l1Address)
      addressToDecimals[l1Address] = decimals
      return decimals
    } catch (err) {
      console.warn('could not get token decimals', err)
      return 18
    }
  }

  const getEthWithdrawalsV2 = async (filter?: providers.Filter) => {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const address = await walletAddressCached()
    const startBlock =
      (filter && filter.fromBlock && +filter.fromBlock.toString()) || 0

    const latestGraphBlockNumber = await getBuiltInsGraphLatestBlockNumber(
      l1NetworkID
    )
    const pivotBlock = Math.max(latestGraphBlockNumber, startBlock)

    console.log(
      `*** L2 gateway graph block number: ${latestGraphBlockNumber} ***`
    )

    const oldEthWithdrawalEventData = await getETHWithdrawals(
      address,
      startBlock,
      pivotBlock,
      l1NetworkID
    )

    const recentETHWithdrawalData =
      await L2ToL1MessageReader.getL2ToL1MessageLogs(
        l2.signer.provider,
        {
          fromBlock: pivotBlock, // Change to 0 for Nitro
          toBlock: 'latest'
        },
        undefined,
        address
      )

    const ethWithdrawalEventData = oldEthWithdrawalEventData.concat(
      recentETHWithdrawalData
    )
    const lastOutboxEntryIndexDec = await getLatestOutboxEntryIndex(l1NetworkID)

    console.log(
      `*** Last Outbox Entry Batch Number: ${lastOutboxEntryIndexDec} ***`
    )

    const ethWithdrawalData: L2ToL1EventResultPlus[] = []
    for (const eventData of ethWithdrawalEventData) {
      const {
        destination,
        timestamp,
        data,
        caller,
        uniqueId,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        callvalue
      } = eventData
      const batchNumberDec = batchNumber.toNumber()
      const outgoingMessageState =
        batchNumberDec > lastOutboxEntryIndexDec
          ? OutgoingMessageState.UNCONFIRMED
          : await getOutgoingMessageStateV2(batchNumber, indexInBatch)

      const allWithdrawalData: L2ToL1EventResultPlus = {
        caller,
        destination,
        uniqueId,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        timestamp,
        callvalue,
        data,
        type: AssetType.ETH,
        value: callvalue,
        symbol: 'ETH',
        outgoingMessageState,
        decimals: 18
      }
      ethWithdrawalData.push(allWithdrawalData)
    }
    return ethWithdrawalData
  }

  const getTokenWithdrawalsV2 = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const address = await walletAddressCached()

    const latestGraphBlockNumber = await getL2GatewayGraphLatestBlockNumber(
      l1NetworkID
    )
    console.log(
      `*** L2 gateway graph block number: ${latestGraphBlockNumber} ***`
    )

    const startBlock =
      (filter && filter.fromBlock && +filter.fromBlock.toString()) || 0

    const pivotBlock = Math.max(latestGraphBlockNumber, startBlock)

    const results = await getTokenWithdrawalsGraph(
      address,
      startBlock,
      pivotBlock,
      l1NetworkID
    )

    const symbols = await Promise.all(
      results.map(resultData =>
        getTokenSymbol(resultData.otherData.tokenAddress)
      )
    )
    const decimals = await Promise.all(
      results.map(resultData =>
        getTokenDecimals(resultData.otherData.tokenAddress)
      )
    )

    const outgoingMessageStates = await Promise.all(
      results.map((withdrawEventData, i) => {
        const { batchNumber, indexInBatch } = withdrawEventData.l2ToL1Event
        return getOutgoingMessageState(batchNumber, indexInBatch)
      })
    )
    const oldTokenWithdrawals = results.map((resultsData, i) => {
      const {
        caller,
        destination,
        uniqueId,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        timestamp,
        callvalue,
        data
      } = resultsData.l2ToL1Event
      const { value, tokenAddress, type } = resultsData.otherData
      const eventDataPlus: L2ToL1EventResultPlus = {
        caller,
        destination,
        uniqueId,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        timestamp,
        callvalue,
        data,
        type,
        value,
        tokenAddress,
        outgoingMessageState: outgoingMessageStates[i],
        symbol: symbols[i],
        decimals: decimals[i]
      }
      return eventDataPlus
    })

    const recentTokenWithdrawals = await getTokenWithdrawals(gatewayAddresses, {
      fromBlock: pivotBlock
    })

    return oldTokenWithdrawals.concat(recentTokenWithdrawals || [])
  }

  const getTokenWithdrawals = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const l2Provider = l2.signer.provider

    if (typeof l2Provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const address = await walletAddressCached()
    const t = new Date().getTime()

    const latestGraphBlockNumber = await getL2GatewayGraphLatestBlockNumber(
      l1NetworkID
    )
    const startBlock =
      (filter && filter.fromBlock && +filter.fromBlock.toString()) || 0
    const pivotBlock = Math.max(latestGraphBlockNumber, startBlock)

    const erc20Bridger = new Erc20Bridger(l2.network)

    const gatewayWithdrawalsResultsNested = await Promise.all(
      gatewayAddresses.map(gatewayAddress =>
        erc20Bridger.getL2WithdrawalEvents(
          l2Provider,
          gatewayAddress,
          { fromBlock: pivotBlock, toBlock: 'latest' },
          undefined,
          address
        )
      )
    )

    console.log(
      `*** got token gateway event data in ${
        (new Date().getTime() - t) / 1000
      } seconds *** `
    )

    const gatewayWithdrawalsResults = gatewayWithdrawalsResultsNested.flat()
    const symbols = await Promise.all(
      gatewayWithdrawalsResults.map(withdrawEventData =>
        getTokenSymbol(withdrawEventData.l1Token)
      )
    )
    const decimals = await Promise.all(
      gatewayWithdrawalsResults.map(withdrawEventData =>
        getTokenDecimals(withdrawEventData.l1Token)
      )
    )

    const l2Txns = await Promise.all(
      gatewayWithdrawalsResults.map(withdrawEventData =>
        l2Provider.getTransactionReceipt(withdrawEventData.txHash)
      )
    )

    const outgoingMessageStates = await Promise.all(
      l2Txns.map(txReceipt => {
        const l2TxReceipt = new L2TransactionReceipt(txReceipt)
        // TODO: length != 1
        const [{ batchNumber, indexInBatch }] = l2TxReceipt.getL2ToL1Events()
        return getOutgoingMessageState(batchNumber, indexInBatch)
      })
    )

    return gatewayWithdrawalsResults.map(
      (withdrawEventData: WithdrawalInitiated, i) => {
        const l2TxReceipt = new L2TransactionReceipt(l2Txns[i])
        // TODO: length != 1
        const [
          {
            caller,
            destination,
            uniqueId,
            batchNumber,
            indexInBatch,
            arbBlockNum,
            ethBlockNum,
            timestamp,
            callvalue,
            data
          }
        ] = l2TxReceipt.getL2ToL1Events()

        const eventDataPlus: L2ToL1EventResultPlus = {
          caller,
          destination,
          uniqueId,
          batchNumber,
          indexInBatch,
          arbBlockNum,
          ethBlockNum,
          timestamp,
          callvalue,
          data,
          type: AssetType.ERC20,
          value: withdrawEventData._amount,
          tokenAddress: withdrawEventData.l1Token,
          outgoingMessageState: outgoingMessageStates[i],
          symbol: symbols[i],
          decimals: decimals[i]
        }

        return eventDataPlus
      }
    )
  }

  // mutates provided array - assigns deadlineBlockNumbers to all asserted but unconfimred l2tol1 messages
  const addNodeDeadlineToUnconfirmedWithdrawals = async (
    l2ToL1Data: L2ToL1EventResultPlus[]
  ) => {
    if (l2ToL1Data.length === 0) return []
    if (l1NetworkID !== '1' && l1NetworkID !== '4')
      throw new Error(`Unrecognized network: ${l1NetworkID}`)
    // Transition from outbox v1 to v2 resets the batchnumber emitted in event logs back to zero; here we offset based on the v1 outbox's length:
    const oldOutboxOffset = l1NetworkID === '1' ? 30 : 326

    // ensure sorted in ascending order by timestamp (copy so provided array doesn't get mutated)
    const sortedL2ToL1Data = [...l2ToL1Data].sort((msgA, msgB) => {
      return +msgA.timestamp - +msgB.timestamp
    })
    // get smallest batch number in messages for lower bound on graph query
    const smallestBatchNumber = sortedL2ToL1Data[0].batchNumber.toNumber()
    const nodes = await getNodes(l1NetworkID, smallestBatchNumber)

    const unconfirmedWithdrawals = sortedL2ToL1Data.filter(
      l2ToL1Datum =>
        ![
          OutgoingMessageState.EXECUTED,
          OutgoingMessageState.CONFIRMED
        ].includes(l2ToL1Datum.outgoingMessageState)
    )

    let currentNodeIndex = 0
    let currentNode: NodeDataResult | undefined = nodes[currentNodeIndex]
    // get node ids for messages included in a node, preserving order of unconfirmedWithdrawals array
    const nodeIDs = unconfirmedWithdrawals
      .map((l1ToL2Datum: L2ToL1EventResultPlus) => {
        const batchNumberWithOffset =
          l1ToL2Datum.batchNumber.toNumber() + oldOutboxOffset

        // find first node with aftersendCount >= current messages batch number ('afterSendCount' is batchcount )
        while (
          currentNode &&
          +currentNode.afterSendCount < batchNumberWithOffset
        ) {
          currentNodeIndex++
          currentNode = nodes[currentNodeIndex]
        }
        // if we've reached the end of the node array, the message hasn't been included in a node, (so undefined)
        return currentNode ? BigNumber.from(currentNode.id) : null
      })
      .filter(notNull)

    const rollupAddress = l2.network.ethBridge.rollup
    if (!rollupAddress) throw new Error('Could not get rollup address')
    const rollupIface = Rollup__factory.createInterface()

    const nodeAddresses: string[] = (
      await bridge.l1Bridge.getMulticallAggregate(
        nodeIDs.map(nodeID => ({
          target: rollupAddress,
          funcFragment: rollupIface.functions['getNode(uint256)'],
          values: [nodeID]
        }))
      )
    ).map(res => res && res[0])

    const nodeIface = Node__factory.createInterface()

    const deadlineBlockNumbers: BigNumber[] = (
      await bridge.l1Bridge.getMulticallAggregate(
        nodeAddresses.map((nodeAddress: string) => ({
          target: nodeAddress,
          funcFragment: nodeIface.functions['deadlineBlock()']
        }))
      )
    ).map(res => res && res[0])

    // use alignment of elements and their indics in unconfirmedWithdrawals / deadlineBlockNumbers arrays to set deadlineBlockNumbers
    unconfirmedWithdrawals.forEach((withdrawalDatum, i) => {
      withdrawalDatum.nodeBlockDeadline =
        i < deadlineBlockNumbers.length
          ? deadlineBlockNumbers[i].toNumber()
          : 'NODE_NOT_CREATED'
    })

    return l2ToL1Data
  }

  const setInitialPendingWithdrawals = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const pendingWithdrawals: PendingWithdrawalsMap = {}
    const t = new Date().getTime()
    console.log('*** Getting initial pending withdrawal data ***')
    const l2ToL1Txns = (
      await Promise.all([
        getEthWithdrawalsV2(filter),
        getTokenWithdrawalsV2(gatewayAddresses, filter)
      ])
    ).flat()

    console.log(
      `*** done getting pending withdrawals, took ${
        Math.round(new Date().getTime() - t) / 1000
      } seconds`
    )

    await addNodeDeadlineToUnconfirmedWithdrawals(l2ToL1Txns)
    for (const l2ToL1Thing of l2ToL1Txns) {
      pendingWithdrawals[l2ToL1Thing.uniqueId.toString()] = l2ToL1Thing
    }
    setPendingWithdrawalMap(pendingWithdrawals)
    return
  }

  // call after we've confirmed the outbox entry has been created
  async function getOutgoingMessageStateV2(
    batchNumber: BigNumber,
    indexInBatch: BigNumber
  ) {
    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    if (
      executedMessagesCache[
        hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)
      ]
    ) {
      return OutgoingMessageState.EXECUTED
    }

    const proofData = await L2ToL1MessageReader.tryGetProof(
      l2.signer.provider,
      batchNumber,
      indexInBatch
    )

    // this should never occur
    if (!proofData) {
      return OutgoingMessageState.UNCONFIRMED
    }

    const { path } = proofData
    const res = await messageHasExecuted(path, batchNumber, l1NetworkID)

    if (res) {
      addToExecutedMessagesCache(batchNumber, indexInBatch)
      return OutgoingMessageState.EXECUTED
    } else {
      return OutgoingMessageState.CONFIRMED
    }
  }

  async function getOutgoingMessageState(
    batchNumber: BigNumber,
    indexInBatch: BigNumber
  ) {
    if (
      executedMessagesCache[
        hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)
      ]
    ) {
      return OutgoingMessageState.EXECUTED
    }

    if (typeof l1.signer.provider === 'undefined') {
      throw new Error(`No provider found for L1 signer`)
    }

    if (typeof l2.signer.provider === 'undefined') {
      throw new Error(`No provider found for L2 signer`)
    }

    const outboxAddress = getOutboxAddr(l2.network, batchNumber)
    const messageReader = new L2ToL1MessageReader(
      l1.signer.provider,
      outboxAddress,
      batchNumber,
      indexInBatch
    )

    const proofInfo = await messageReader.tryGetProof(l2.signer.provider)
    return await messageReader.status(proofInfo)
  }

  function addToExecutedMessagesCache(
    batchNumber: BigNumber,
    indexInBatch: BigNumber
  ) {
    const _executedMessagesCache = { ...executedMessagesCache }
    _executedMessagesCache[
      hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)
    ] = true
    setExecutedMessagesCache(_executedMessagesCache)
  }

  const hashOutgoingMessage = (
    batchNumber: BigNumber,
    indexInBatch: BigNumber,
    _l1NetworkID: string
  ) => {
    return `${batchNumber.toString()},${indexInBatch.toString()},${_l1NetworkID}`
  }

  return {
    walletAddress,
    bridgeTokens: bridgeTokens,
    balances: {
      eth: ethBalances,
      erc20: erc20Balances,
      erc721: erc721Balances
    },
    cache: {
      erc20: ERC20Cache,
      erc721: ERC721Cache,
      expire: expireCache
    },
    eth: {
      deposit: depositEth,
      withdraw: withdrawEth,
      triggerOutbox: triggerOutboxEth,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      addTokensFromList,
      removeTokensFromList,
      updateTokenData,
      approve: approveToken,
      deposit: depositToken,
      withdraw: withdrawToken,
      triggerOutbox: triggerOutboxToken,
      getL1TokenData,
      getL2TokenData,
      getL1ERC20Address,
      getL2ERC20Address
    },
    transactions: {
      transactions,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      addTransaction,
      addTransactions,
      updateL1ToL2MsgData
    },
    pendingWithdrawalsMap: pendingWithdrawalsMap,
    setInitialPendingWithdrawals: setInitialPendingWithdrawals
  }
}
