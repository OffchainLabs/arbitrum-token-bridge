import { useCallback, useEffect, useState, useMemo } from 'react'
import { BigNumber, constants, utils, providers } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider } from '@ethersproject/abstract-provider'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import { MaxUint256 } from '@ethersproject/constants'
import {
  L1Network,
  L2Network,
  EthBridger,
  Erc20Bridger,
  MultiCaller,
  L1ToL2MessageStatus,
  L2ToL1Message,
  L2ToL1MessageReader,
  L2TransactionReceipt,
  isNitroL2
} from '@arbitrum/sdk'
import { L1EthDepositTransaction } from '@arbitrum/sdk/dist/lib/message/L1Transaction'
import {
  DepositWithdrawEstimator,
  getOutboxAddr as getClassicOutboxAddress
} from '@arbitrum/sdk/dist/lib/utils/migration_types'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { getL2Network as getClassicL2Network } from '@arbitrum/sdk-classic/dist/lib/dataEntities/networks'

import useTransactions, { L1ToL2MessageData } from './useTransactions'
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
  WithdrawalInitiated,
  L2ToL1EventResult,
  NodeBlockDeadlineStatus,
  L1EthDepositTransactionLifecycle,
  L1ContractCallTransactionLifecycle,
  L2ContractCallTransactionLifecycle
} from './arbTokenBridge.types'

import {
  getLatestOutboxEntryIndex,
  getETHWithdrawals,
  getTokenWithdrawals as getTokenWithdrawalsGraph,
  getL2GatewayGraphLatestBlockNumber,
  getBuiltInsGraphLatestBlockNumber
} from '../util/graph'

import { getUniqueIdOrHashFromEvent } from '../util/migration'

const { Zero } = constants

export const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms))
}

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

type SignerWithProvider = Signer & { provider: Provider }

type L1Params = { signer: Signer } & { network: L1Network }
type L2Params = { signer: Signer } & { network: L2Network }

export interface TokenBridgeParams {
  walletAddress: string
  l1: L1Params
  l2: L2Params
}

interface TokenBridgeParamsWithProviders extends TokenBridgeParams {
  l1: L1Params & { signer: SignerWithProvider }
  l2: L2Params & { signer: SignerWithProvider }
}

function assertSignersHaveProviders(
  params: TokenBridgeParams
): asserts params is TokenBridgeParamsWithProviders {
  if (typeof params.l1.signer === 'undefined') {
    throw new Error(`No Provider found for L1 Signer`)
  }

  if (typeof params.l2.signer === 'undefined') {
    throw new Error(`No Provider found for L2 Signer`)
  }
}

function isClassicEvent(event: L2ToL1EventResult) {
  return typeof (event as any).indexInBatch !== 'undefined'
}

export const useArbTokenBridge = (
  params: TokenBridgeParams,
  autoLoadCache = true
): ArbTokenBridge => {
  assertSignersHaveProviders(params)

  const { walletAddress, l1, l2 } = params

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
      setTransactionSuccess,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    }
  ] = useTransactions()

  const isRinkeby = l1.network.chainID === 4

  const l1NetworkID = useMemo(() => String(l1.network.chainID), [l1.network])
  const l2NetworkID = useMemo(() => String(l2.network.chainID), [l2.network])

  const ethBridger = useMemo(() => new EthBridger(l2.network), [l2.network])
  const erc20Bridger = useMemo(() => new Erc20Bridger(l2.network), [l2.network])

  const gasEstimator = useMemo(
    () => new DepositWithdrawEstimator(l2.network),
    [l2.network]
  )

  /**
   * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
   * @param erc20L1Address
   * @returns
   */
  async function getL1TokenData(
    erc20L1Address: string,
    throwOnInvalidERC20 = true
  ): Promise<L1TokenData> {
    type GetL1TokenDataOverrides = {
      params: { name?: true; symbol?: true }
      result: { name?: string; symbol?: string }
    }

    function getOverrides(): GetL1TokenDataOverrides {
      const erc20L1AddressLowercased = erc20L1Address.toLowerCase()

      const overrides: {
        [erc20L1Address: string]: GetL1TokenDataOverrides
      } = {
        '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': {
          // Don't query for name & symbol
          params: {},
          result: { name: 'Maker', symbol: 'MKR' }
        }
      }

      if (typeof overrides[erc20L1AddressLowercased] !== 'undefined') {
        return overrides[erc20L1AddressLowercased]
      }

      return {
        // By default query for name & symbol
        params: { name: true, symbol: true },
        result: {}
      }
    }

    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1.signer.provider
    )

    const overrides = getOverrides()
    const contract = ERC20__factory.connect(erc20L1Address, l1.signer)

    const multiCaller = await MultiCaller.fromProvider(l1.signer.provider)
    const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
      balanceOf: { account: walletAddress },
      allowance: { owner: walletAddress, spender: l1GatewayAddress },
      decimals: true,
      ...overrides.params
    })

    if (typeof tokenData.balance === 'undefined') {
      if (throwOnInvalidERC20)
        throw new Error(
          `getL1TokenData: No balance method available for ${erc20L1Address}`
        )
    }

    if (typeof tokenData.allowance === 'undefined') {
      if (throwOnInvalidERC20)
        throw new Error(
          `getL1TokenData: No allowance method available for ${erc20L1Address}`
        )
    }

    return {
      name: tokenData.name || getDefaultTokenName(erc20L1Address),
      symbol: tokenData.symbol || getDefaultTokenSymbol(erc20L1Address),
      balance: tokenData.balance || BigNumber.from(0),
      allowance: tokenData.allowance || BigNumber.from(0),
      decimals: tokenData.decimals || 0,
      ...overrides.result,
      contract
    }
  }

  /**
   * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
   * @param erc20L2Address
   * @returns
   */
  async function getL2TokenData(erc20L2Address: string): Promise<L2TokenData> {
    const contract = StandardArbERC20__factory.connect(
      erc20L2Address,
      l2.signer
    )

    const multiCaller = await MultiCaller.fromProvider(l2.signer.provider)
    const [tokenData] = await multiCaller.getTokenData([erc20L2Address], {
      balanceOf: { account: walletAddress }
    })

    if (typeof tokenData.balance === 'undefined') {
      throw new Error(
        `getL2TokenData: No balance method available for ${erc20L2Address}`
      )
    }

    return {
      balance: tokenData.balance,
      contract
    }
  }

  async function getL2GatewayAddress(erc20L1Address: string): Promise<string> {
    return erc20Bridger.getL2GatewayAddress(erc20L1Address, l2.signer.provider)
  }

  /**
   * Retrieves the L1 address of an ERC-20 token using its L2 address.
   * @param erc20L2Address
   * @returns
   */
  async function getL1ERC20Address(
    erc20L2Address: string
  ): Promise<string | null> {
    try {
      return await erc20Bridger.getL1ERC20Address(
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
    return await erc20Bridger.getL2ERC20Address(
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
    return erc20Bridger.l1TokenIsDisabled(erc20L1Address, l1.signer.provider)
  }

  const depositEth = async (
    amount: BigNumber,
    txLifecycle?: L1EthDepositTransactionLifecycle
  ) => {
    let tx: L1EthDepositTransaction

    try {
      tx = await ethBridger.deposit({
        l1Signer: l1.signer,
        l2Provider: l2.signer.provider,
        amount
      })

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx)
      }
    } catch (error: any) {
      return alert(error.message)
    }

    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: utils.formatEther(amount),
      txID: tx.hash,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: walletAddress,
      l1NetworkID,
      l2NetworkID
    })

    const receipt = await tx.wait()

    if (txLifecycle?.onTxConfirm) {
      txLifecycle.onTxConfirm(receipt)
    }

    const [ethDepositMessage] = await receipt.getEthDepositMessages(l2.signer)

    const l1ToL2MsgData: L1ToL2MessageData = {
      fetchingUpdate: false,
      status: L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
      l2TxID: undefined
    }

    updateTransaction(receipt, tx, l1ToL2MsgData)
    updateEthBalances()
  }

  async function depositEthEstimateGas(amount: BigNumber) {
    const estimatedL1Gas = await gasEstimator.ethDepositL1Gas({
      l1Signer: l1.signer,
      l2Provider: l2.signer.provider,
      amount
    })

    const {
      maxGas: estimatedL2Gas,
      maxSubmissionCost: estimatedL2SubmissionCost
    } = await gasEstimator.ethDepositL2Gas(l2.signer.provider)

    return { estimatedL1Gas, estimatedL2Gas, estimatedL2SubmissionCost }
  }

  async function withdrawEth(
    amount: BigNumber,
    txLifecycle?: L2ContractCallTransactionLifecycle
  ) {
    const tx = await ethBridger.withdraw({ l2Signer: l2.signer, amount })

    if (txLifecycle?.onTxSubmit) {
      txLifecycle.onTxSubmit(tx)
    }

    try {
      addTransaction({
        type: 'withdraw',
        status: 'pending',
        value: utils.formatEther(amount),
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: walletAddress,
        blockNumber: tx.blockNumber,
        l1NetworkID,
        l2NetworkID
      })

      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
      }

      updateTransaction(receipt, tx)
      updateEthBalances()

      const l2ToL1Events = receipt.getL2ToL1Events()

      if (l2ToL1Events.length === 1) {
        const l2ToL1EventResult = l2ToL1Events[0]
        console.info('withdraw event data:', l2ToL1EventResult)

        const id = getUniqueIdOrHashFromEvent(l2ToL1EventResult).toString()

        const outgoingMessageState = OutgoingMessageState.UNCONFIRMED
        const l2ToL1EventResultPlus: L2ToL1EventResultPlus = {
          ...l2ToL1EventResult,
          type: AssetType.ETH,
          value: amount,
          outgoingMessageState,
          symbol: 'ETH',
          decimals: 18,
          nodeBlockDeadline: 'NODE_NOT_CREATED',
          l2TxHash: tx.hash
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

  async function withdrawEthEstimateGas(amount: BigNumber) {
    const estimatedL1Gas = await gasEstimator.ethWithdrawalL1Gas(
      l2.signer.provider
    )
    const estimatedL2Gas = await gasEstimator.ethWithdrawalL2Gas({
      l2Signer: l2.signer,
      amount
    })

    return { estimatedL1Gas, estimatedL2Gas }
  }

  const approveToken = async (erc20L1Address: string) => {
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
      sender: walletAddress,
      l1NetworkID
    })

    const receipt = await tx.wait()

    updateTransaction(receipt, tx)
    updateTokenData(erc20L1Address)
  }

  const approveTokenEstimateGas = async (erc20L1Address: string) => {
    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1.signer.provider
    )

    const contract = ERC20__factory.connect(erc20L1Address, l1.signer.provider)

    return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
      from: walletAddress
    })
  }

  const approveTokenL2 = async (erc20L1Address: string) => {
    const bridgeToken = bridgeTokens[erc20L1Address]
    if (!bridgeToken) throw new Error('Bridge token not found')
    const { l2Address } = bridgeToken
    if (!l2Address) throw new Error('L2 address not found')
    const gatewayAddress = await getL2GatewayAddress(erc20L1Address)
    const contract = await ERC20__factory.connect(l2Address, l2.signer)
    const tx = await contract.functions.approve(gatewayAddress, MaxUint256)
    const tokenData = await getL1TokenData(erc20L1Address)

    addTransaction({
      type: 'approve-l2',
      status: 'pending',
      value: null,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: walletAddress,
      blockNumber: tx.blockNumber,
      l1NetworkID,
      l2NetworkID
    })

    const receipt = await tx.wait()
    updateTransaction(receipt, tx)
    updateTokenData(erc20L1Address)
  }

  async function depositToken(
    erc20L1Address: string,
    amount: BigNumber,
    txLifecycle?: L1ContractCallTransactionLifecycle
  ) {
    const { symbol, decimals } = await getL1TokenData(erc20L1Address)

    const tx = await erc20Bridger.deposit({
      l1Signer: l1.signer,
      l2Provider: l2.signer.provider,
      erc20L1Address,
      amount
    })

    if (txLifecycle?.onTxSubmit) {
      txLifecycle.onTxSubmit(tx)
    }

    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: utils.formatUnits(amount, decimals),
      txID: tx.hash,
      assetName: symbol,
      assetType: AssetType.ERC20,
      tokenAddress: erc20L1Address,
      sender: walletAddress,
      l1NetworkID,
      l2NetworkID
    })

    const receipt = await tx.wait()

    if (txLifecycle?.onTxConfirm) {
      txLifecycle.onTxConfirm(receipt)
    }

    const l1ToL2Msg = await receipt.getL1ToL2Message(l2.signer)

    const l1ToL2MsgData: L1ToL2MessageData = {
      fetchingUpdate: false,
      status: L1ToL2MessageStatus.NOT_YET_CREATED, //** we know its not yet created, we just initiated it */
      retryableCreationTxID: l1ToL2Msg.retryableCreationId,
      l2TxID: undefined
    }

    updateTransaction(receipt, tx, l1ToL2MsgData)
    updateTokenData(erc20L1Address)

    return receipt
  }

  async function depositTokenEstimateGas(
    erc20L1Address: string,
    amount: BigNumber
  ) {
    // We're hardcoding the L1 gas cost for a token deposit, as the estimation might fail due to no allowance.
    const estimatedL1Gas = BigNumber.from(240000)
    const {
      maxGas: estimatedL2Gas,
      maxSubmissionCost: estimatedL2SubmissionCost
    } = await gasEstimator.erc20DepositL2Gas({
      l1Signer: l1.signer,
      l2Provider: l2.signer.provider,
      erc20L1Address,
      amount
    })

    return { estimatedL1Gas, estimatedL2Gas, estimatedL2SubmissionCost }
  }

  async function withdrawToken(
    erc20l1Address: string,
    amount: BigNumber,
    txLifecycle?: L2ContractCallTransactionLifecycle
  ) {
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

    const tx = await erc20Bridger.withdraw({
      l2Signer: l2.signer,
      erc20l1Address,
      amount
    })

    if (txLifecycle?.onTxSubmit) {
      txLifecycle.onTxSubmit(tx)
    }

    addTransaction({
      type: 'withdraw',
      status: 'pending',
      value: utils.formatUnits(amount, decimals),
      txID: tx.hash,
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: await l2.signer.getAddress(),
      blockNumber: tx.blockNumber,
      l1NetworkID,
      l2NetworkID
    })

    try {
      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
      }

      updateTransaction(receipt, tx)

      const l2ToL1Events = receipt.getL2ToL1Events()

      if (l2ToL1Events.length === 1) {
        const l2ToL1EventDataResult = l2ToL1Events[0]
        const id = getUniqueIdOrHashFromEvent(l2ToL1EventDataResult).toString()
        const outgoingMessageState = OutgoingMessageState.UNCONFIRMED
        const l2ToL1EventDataResultPlus: L2ToL1EventResultPlus = {
          ...l2ToL1EventDataResult,
          type: AssetType.ERC20,
          tokenAddress: erc20l1Address,
          value: amount,
          outgoingMessageState,
          symbol: symbol,
          decimals: decimals,
          nodeBlockDeadline: 'NODE_NOT_CREATED',
          l2TxHash: tx.hash
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

  async function withdrawTokenEstimateGas(
    erc20l1Address: string,
    amount: BigNumber
  ) {
    const estimatedL1Gas = await gasEstimator.erc20WithdrawalL1Gas(
      l2.signer.provider
    )
    const estimatedL2Gas = await gasEstimator.erc20WithdrawalL2Gas({
      l2Signer: l2.signer,
      erc20l1Address,
      amount
    })

    return { estimatedL1Gas, estimatedL2Gas }
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
    const l1ChainID = l1.network.chainID
    const l2ChainID = l2.network.chainID

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
    const event = pendingWithdrawalsMap[id]

    if (!pendingWithdrawalsMap[id]) {
      throw new Error('Outbox message not found')
    }

    const { tokenAddress, value } = event

    const messageWriter = L2ToL1Message.fromEvent(
      l1.signer,
      event,
      await getOutboxAddress(event)
    )

    const res = await messageWriter.execute(l2.signer.provider)

    const { symbol, decimals } = await getL1TokenData(tokenAddress as string)

    addTransaction({
      status: 'pending',
      type: 'outbox',
      value: utils.formatUnits(value, decimals),
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: walletAddress,
      txID: res.hash,
      l1NetworkID,
      l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
    })

    try {
      const rec = await res.wait()

      if (rec.status === 1) {
        setTransactionSuccess(rec.transactionHash)
        addToExecutedMessagesCache(event)
        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
          delete newPendingWithdrawalsMap[id]
          return newPendingWithdrawalsMap
        })
      } else {
        setTransactionFailure(rec.transactionHash)
      }

      return rec
    } catch (err) {
      console.warn('WARNING: token outbox execute failed:', err)
    }
  }

  async function triggerOutboxEth(id: string) {
    const event = pendingWithdrawalsMap[id]

    if (!event) {
      throw new Error('Outbox message not found')
    }

    const { value } = event

    const messageWriter = L2ToL1Message.fromEvent(
      l1.signer,
      event,
      await getOutboxAddress(event)
    )

    const res = await messageWriter.execute(l2.signer.provider)

    addTransaction({
      status: 'pending',
      type: 'outbox',
      value: utils.formatEther(value),
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: walletAddress,
      txID: res.hash,
      l1NetworkID,
      l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
    })

    try {
      const rec = await res.wait()

      if (rec.status === 1) {
        setTransactionSuccess(rec.transactionHash)
        addToExecutedMessagesCache(event)
        setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
          const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
          delete newPendingWithdrawalsMap[id]
          return newPendingWithdrawalsMap
        })
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
      const { symbol } = await getL1TokenData(l1Address, false)
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
      const { decimals } = await getL1TokenData(l1Address, false)
      addressToDecimals[l1Address] = decimals
      return decimals
    } catch (err) {
      console.warn('could not get token decimals', err)
      return 18
    }
  }

  const getEthWithdrawalsV2 = async (filter?: providers.Filter) => {
    const startBlock = 0
    let pivotBlock: number

    // Special logic for Rinkeby migration to Nitro
    if (isRinkeby) {
      pivotBlock = getRinkebyPivotBlock()
    } else {
      pivotBlock = await getBuiltInsGraphLatestBlockNumber(l1NetworkID)
      console.log(`*** L2 gateway graph block number: ${pivotBlock} ***`)
    }

    const oldEthWithdrawals = await getETHWithdrawals(
      walletAddress,
      startBlock,
      pivotBlock,
      l1NetworkID
    )

    const recentEthWithdrawals = await L2ToL1MessageReader.getEventLogs(
      l2.signer.provider,
      {
        fromBlock: pivotBlock,
        toBlock: 'latest'
      },
      undefined,
      walletAddress
    )

    const ethWithdrawals = [...oldEthWithdrawals, ...recentEthWithdrawals]

    const lastOutboxEntryIndexDec = isRinkeby
      ? 6152
      : await getLatestOutboxEntryIndex(l1NetworkID)

    console.log(
      `*** Last Outbox Entry Batch Number: ${lastOutboxEntryIndexDec} ***`
    )

    async function toEventResultPlus(
      // `l2TxHash` exists on results from subgraph
      // `transactionHash` exists on results from logs
      event: L2ToL1EventResult & { l2TxHash?: string; transactionHash?: string }
    ): Promise<L2ToL1EventResultPlus> {
      const { callvalue } = event
      let outgoingMessageState: OutgoingMessageState

      if (isClassicEvent(event)) {
        const batchNumber = (event as any).batchNumber as BigNumber

        outgoingMessageState =
          batchNumber.toNumber() > lastOutboxEntryIndexDec
            ? OutgoingMessageState.UNCONFIRMED
            : await getOutgoingMessageState(event)
      } else {
        outgoingMessageState = await getOutgoingMessageState(event)
      }

      return {
        ...event,
        type: AssetType.ETH,
        value: callvalue,
        symbol: 'ETH',
        outgoingMessageState,
        decimals: 18,
        l2TxHash: event.l2TxHash || event.transactionHash
      }
    }

    return await Promise.all(ethWithdrawals.map(toEventResultPlus))
  }

  async function getEthWithdrawalsNitro() {
    const ethWithdrawals = await L2ToL1MessageReader.getEventLogs(
      l2.signer.provider,
      {
        fromBlock: 0,
        toBlock: 'latest'
      },
      undefined,
      walletAddress
    )

    async function toEventResultPlus(
      // `l2TxHash` exists on results from subgraph
      // `transactionHash` exists on results from logs
      event: L2ToL1EventResult & { l2TxHash?: string; transactionHash?: string }
    ): Promise<L2ToL1EventResultPlus> {
      const { callvalue } = event
      const outgoingMessageState = await getOutgoingMessageState(event)

      return {
        ...event,
        type: AssetType.ETH,
        value: callvalue,
        symbol: 'ETH',
        outgoingMessageState,
        decimals: 18,
        l2TxHash: event.l2TxHash || event.transactionHash
      }
    }

    return await Promise.all(ethWithdrawals.map(toEventResultPlus))
  }

  const getTokenWithdrawalsV2 = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const startBlock = 0
    let pivotBlock: number

    // Special logic for Rinkeby migration to Nitro
    if (isRinkeby) {
      pivotBlock = getRinkebyPivotBlock()
    } else {
      pivotBlock = await getL2GatewayGraphLatestBlockNumber(l1NetworkID)
      console.log(`*** L2 gateway graph block number: ${pivotBlock} ***`)
    }

    const results = await getTokenWithdrawalsGraph(
      walletAddress,
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
      results.map(withdrawEventData =>
        getOutgoingMessageState(withdrawEventData.l2ToL1Event)
      )
    )

    const oldTokenWithdrawals: L2ToL1EventResultPlus[] = results.map(
      (resultsData, i) => ({
        ...resultsData.l2ToL1Event,
        ...resultsData.otherData,
        outgoingMessageState: outgoingMessageStates[i],
        symbol: symbols[i],
        decimals: decimals[i]
      })
    )

    const recentTokenWithdrawals = await getTokenWithdrawals(gatewayAddresses, {
      fromBlock: pivotBlock
    })

    return [...oldTokenWithdrawals, ...recentTokenWithdrawals]
  }

  const getTokenWithdrawals = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const t = new Date().getTime()

    const latestGraphBlockNumber = await getL2GatewayGraphLatestBlockNumber(
      l1NetworkID
    )
    const startBlock =
      (filter && filter.fromBlock && +filter.fromBlock.toString()) || 0
    const pivotBlock = Math.max(latestGraphBlockNumber, startBlock)

    const gatewayWithdrawalsResultsNested = await Promise.all(
      gatewayAddresses.map(gatewayAddress =>
        erc20Bridger.getL2WithdrawalEvents(
          l2.signer.provider,
          gatewayAddress,
          { fromBlock: pivotBlock, toBlock: 'latest' },
          undefined,
          walletAddress
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
        l2.signer.provider.getTransactionReceipt(withdrawEventData.txHash)
      )
    )

    const outgoingMessageStates = await Promise.all(
      l2Txns.map(txReceipt => {
        const l2TxReceipt = new L2TransactionReceipt(txReceipt)
        // TODO: length != 1
        const [event] = l2TxReceipt.getL2ToL1Events()
        return getOutgoingMessageState(event)
      })
    )

    return gatewayWithdrawalsResults.map(
      (withdrawEventData: WithdrawalInitiated, i) => {
        const l2TxReceipt = new L2TransactionReceipt(l2Txns[i])
        // TODO: length != 1
        const [event] = l2TxReceipt.getL2ToL1Events()

        const eventDataPlus: L2ToL1EventResultPlus = {
          ...event,
          type: AssetType.ERC20,
          value: withdrawEventData._amount,
          tokenAddress: withdrawEventData.l1Token,
          outgoingMessageState: outgoingMessageStates[i],
          symbol: symbols[i],
          decimals: decimals[i],
          l2TxHash: l2TxReceipt.transactionHash
        }

        return eventDataPlus
      }
    )
  }

  async function getTokenWithdrawalsNitro(gatewayAddresses: string[]) {
    const gatewayWithdrawalsResultsNested = await Promise.all(
      gatewayAddresses.map(gatewayAddress =>
        erc20Bridger.getL2WithdrawalEvents(
          l2.signer.provider,
          gatewayAddress,
          { fromBlock: 0, toBlock: 'latest' },
          undefined,
          walletAddress
        )
      )
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
        l2.signer.provider.getTransactionReceipt(withdrawEventData.txHash)
      )
    )

    const outgoingMessageStates = await Promise.all(
      l2Txns.map(txReceipt => {
        const l2TxReceipt = new L2TransactionReceipt(txReceipt)
        // TODO: length != 1
        const [event] = l2TxReceipt.getL2ToL1Events()
        return getOutgoingMessageState(event)
      })
    )

    return gatewayWithdrawalsResults.map(
      (withdrawEventData: WithdrawalInitiated, i) => {
        const l2TxReceipt = new L2TransactionReceipt(l2Txns[i])
        // TODO: length != 1
        const [event] = l2TxReceipt.getL2ToL1Events()

        const eventDataPlus: L2ToL1EventResultPlus = {
          ...event,
          type: AssetType.ERC20,
          value: withdrawEventData._amount,
          tokenAddress: withdrawEventData.l1Token,
          outgoingMessageState: outgoingMessageStates[i],
          symbol: symbols[i],
          decimals: decimals[i],
          l2TxHash: l2TxReceipt.transactionHash
        }

        return eventDataPlus
      }
    )
  }

  async function attachNodeBlockDeadlineToEvent(event: L2ToL1EventResultPlus) {
    if (
      event.outgoingMessageState === OutgoingMessageState.EXECUTED ||
      event.outgoingMessageState === OutgoingMessageState.CONFIRMED
    ) {
      return event
    }

    const messageReader = L2ToL1MessageReader.fromEvent(
      l1.signer,
      event,
      await getOutboxAddress(event)
    )

    try {
      const firstExecutableBlock = await messageReader.getFirstExecutableBlock(
        l2.signer.provider
      )

      return { ...event, nodeBlockDeadline: firstExecutableBlock?.toNumber() }
    } catch (e) {
      const expectedError = "batch doesn't exist"
      const expectedError2 = 'CALL_EXCEPTION'
      const err = e as Error & { error: Error }
      const actualError =
        err && (err.message || (err.error && err.error.message))
      if (actualError.includes(expectedError)) {
        const nodeBlockDeadline: NodeBlockDeadlineStatus = 'NODE_NOT_CREATED'
        return {
          ...event,
          nodeBlockDeadline
        }
      } else if (actualError.includes(expectedError2)) {
        // in classic we simulate `executeTransaction` in `hasExecuted`
        // which might revert if the L2 to L1 call fail
        const nodeBlockDeadline: NodeBlockDeadlineStatus =
          'EXECUTE_CALL_EXCEPTION'
        return {
          ...event,
          nodeBlockDeadline
        }
      } else {
        throw e
      }
    }
  }

  function getRinkebyPivotBlock() {
    return 13919178
  }

  const setInitialPendingWithdrawals = async (
    gatewayAddresses: string[],
    filter?: providers.Filter
  ) => {
    const t = new Date().getTime()
    const pendingWithdrawals: PendingWithdrawalsMap = {}
    const isNitroL2Network = await isNitroL2(l2.signer.provider)

    console.log('*** Getting initial pending withdrawal data ***')

    const l2ToL1Txns = (
      await Promise.all(
        isNitroL2Network && !isRinkeby
          ? [
              getEthWithdrawalsNitro(),
              getTokenWithdrawalsNitro(gatewayAddresses)
            ]
          : [
              getEthWithdrawalsV2(filter),
              getTokenWithdrawalsV2(gatewayAddresses, filter)
            ]
      )
    )
      .flat()
      .sort((msgA, msgB) => +msgA.timestamp - +msgB.timestamp)

    console.log(
      `*** done getting pending withdrawals, took ${
        Math.round(new Date().getTime() - t) / 1000
      } seconds`
    )

    const l2ToL1TxnsWithDeadlines = await Promise.all(
      l2ToL1Txns.map(attachNodeBlockDeadlineToEvent)
    )

    for (const event of l2ToL1TxnsWithDeadlines) {
      pendingWithdrawals[getUniqueIdOrHashFromEvent(event).toString()] = event
    }

    setPendingWithdrawalMap(pendingWithdrawals)
  }

  async function getOutboxAddress(event: L2ToL1EventResult) {
    if (isClassicEvent(event)) {
      const batchNumber = (event as any).batchNumber as BigNumber
      const classicL2Network = await getClassicL2Network(l2.signer.provider)

      return getClassicOutboxAddress(classicL2Network, batchNumber.toNumber())
    }

    return l2.network.ethBridge.outbox
  }

  async function getOutgoingMessageState(event: L2ToL1EventResult) {
    if (executedMessagesCache[getExecutedMessagesCacheKey(event)]) {
      return OutgoingMessageState.EXECUTED
    }

    const messageReader = new L2ToL1MessageReader(
      l1.signer.provider,
      event,
      await getOutboxAddress(event)
    )

    try {
      const status = await messageReader.status(l2.signer.provider)

      if (status === OutgoingMessageState.EXECUTED) {
        addToExecutedMessagesCache(event)
      }

      return status
    } catch (error) {
      return OutgoingMessageState.UNCONFIRMED
    }
  }

  function getExecutedMessagesCacheKey(event: L2ToL1EventResult) {
    const anyEvent = event as any

    // Nitro
    if (anyEvent.position) {
      const position = anyEvent.position as BigNumber

      return `${position.toString()},${l2NetworkID}`
    }

    // Classic
    const batchNumber = anyEvent.batchNumber as BigNumber
    const indexInBatch = anyEvent.indexInBatch as BigNumber

    return `${batchNumber.toString()},${indexInBatch.toString()},${l1NetworkID}`
  }

  function addToExecutedMessagesCache(event: L2ToL1EventResult) {
    const cacheKey = getExecutedMessagesCacheKey(event)
    setExecutedMessagesCache({ ...executedMessagesCache, [cacheKey]: true })
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
      depositEstimateGas: depositEthEstimateGas,
      withdraw: withdrawEth,
      withdrawEstimateGas: withdrawEthEstimateGas,
      triggerOutbox: triggerOutboxEth,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      addTokensFromList,
      removeTokensFromList,
      updateTokenData,
      approve: approveToken,
      approveEstimateGas: approveTokenEstimateGas,
      approveL2: approveTokenL2,
      deposit: depositToken,
      depositEstimateGas: depositTokenEstimateGas,
      withdraw: withdrawToken,
      withdrawEstimateGas: withdrawTokenEstimateGas,
      triggerOutbox: triggerOutboxToken,
      getL1TokenData,
      getL2TokenData,
      getL1ERC20Address,
      getL2ERC20Address,
      getL2GatewayAddress
    },
    transactions: {
      transactions,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      addTransaction,
      addTransactions,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    },
    pendingWithdrawalsMap: pendingWithdrawalsMap,
    setInitialPendingWithdrawals: setInitialPendingWithdrawals
  }
}
