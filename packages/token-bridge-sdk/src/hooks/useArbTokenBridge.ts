import { useCallback, useState, useMemo, useEffect } from 'react'
import { BigNumber, utils } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
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
  L2TransactionReceipt
} from '@arbitrum/sdk'
import { L1EthDepositTransaction } from '@arbitrum/sdk/dist/lib/message/L1Transaction'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'

import useTransactions, { L1ToL2MessageData } from './useTransactions'
import {
  AddressToSymbol,
  AddressToDecimals,
  ArbTokenBridge,
  AssetType,
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
import { useBalance } from './useBalance'
import {
  fetchETHWithdrawalsFromEventLogs,
  fetchETHWithdrawalsFromSubgraph,
  fetchTokenWithdrawalsFromEventLogs,
  fetchTokenWithdrawalsFromSubgraph,
  FetchTokenWithdrawalsFromSubgraphResult
} from '../withdrawals'

import { isClassicL2ToL1TransactionEvent } from '../util'
import { getUniqueIdOrHashFromEvent } from '../util/migration'
import { fetchL2BlockNumberFromSubgraph } from '../util/subgraph'

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

function getExecutedMessagesCacheKey({
  event,
  l2ChainId
}: {
  event: L2ToL1EventResult
  l2ChainId: number
}) {
  return isClassicL2ToL1TransactionEvent(event)
    ? `l2ChainId: ${l2ChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
    : `l2ChainId: ${l2ChainId}, position: ${event.position.toString()}`
}

export interface TokenBridgeParams {
  walletAddress: string
  l1: { provider: JsonRpcProvider; network: L1Network }
  l2: { provider: JsonRpcProvider; network: L2Network }
}

export const useArbTokenBridge = (
  params: TokenBridgeParams
): ArbTokenBridge => {
  const { walletAddress, l1, l2 } = params
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken>
  >({})

  const { tokenL2Addresses, tokenL1Addresses } = useMemo(() => {
    const tokenL1Addresses = []
    const tokenL2Addresses = []
    for (const tokenAddress in bridgeTokens) {
      const { address } = bridgeTokens[tokenAddress]!
      const { l2Address } = bridgeTokens[tokenAddress]!
      if (address) {
        tokenL1Addresses.push(address.toLowerCase())
      }
      if (l2Address) {
        tokenL2Addresses.push(l2Address.toLowerCase())
      }
    }

    return {
      tokenL1Addresses,
      tokenL2Addresses
    }
  }, [bridgeTokens])

  const {
    eth: [, updateEthL1Balance]
  } = useBalance({
    provider: l1.provider,
    walletAddress,
    erc20Addresses: tokenL1Addresses
  })
  const {
    eth: [, updateEthL2Balance]
  } = useBalance({
    provider: l2.provider,
    walletAddress,
    erc20Addresses: tokenL2Addresses
  })

  const [erc721Balances] = useState<ContractStorage<ERC721Balance>>({})

  interface ExecutedMessagesCache {
    [id: string]: boolean
  }

  const [executedMessagesCache, setExecutedMessagesCache] =
    useLocalStorage<ExecutedMessagesCache>(
      'arbitrum:bridge:executed-messages',
      {}
    ) as [
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
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    }
  ] = useTransactions()

  const l1NetworkID = useMemo(() => String(l1.network.chainID), [l1.network])
  const l2NetworkID = useMemo(() => String(l2.network.chainID), [l2.network])

  const ethBridger = useMemo(() => new EthBridger(l2.network), [l2.network])
  const erc20Bridger = useMemo(() => new Erc20Bridger(l2.network), [l2.network])

  /**
   * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
   * @param erc20L1Address
   * @returns
   */
  async function getL1TokenData(
    erc20L1Address: string,
    throwOnInvalidERC20 = true
  ): Promise<L1TokenData> {
    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1.provider
    )

    const contract = ERC20__factory.connect(erc20L1Address, l1.provider)

    const multiCaller = await MultiCaller.fromProvider(l1.provider)
    const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
      balanceOf: { account: walletAddress },
      allowance: { owner: walletAddress, spender: l1GatewayAddress },
      decimals: true,
      name: true,
      symbol: true
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
      l2.provider
    )

    const multiCaller = await MultiCaller.fromProvider(l2.provider)
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
    return erc20Bridger.getL2GatewayAddress(erc20L1Address, l2.provider)
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
      return await erc20Bridger.getL1ERC20Address(erc20L2Address, l2.provider)
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
    return await erc20Bridger.getL2ERC20Address(erc20L1Address, l1.provider)
  }

  /**
   * Retrieves data about whether an ERC-20 token is disabled on the router.
   * @param erc20L1Address
   * @returns
   */
  async function l1TokenIsDisabled(erc20L1Address: string): Promise<boolean> {
    return erc20Bridger.l1TokenIsDisabled(erc20L1Address, l1.provider)
  }

  const depositEth = async ({
    amount,
    l1Signer,
    txLifecycle
  }: {
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1EthDepositTransactionLifecycle
  }) => {
    let tx: L1EthDepositTransaction

    try {
      tx = await ethBridger.deposit({
        amount,
        l1Signer
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

    const [ethDepositMessage] = await receipt.getEthDeposits(l2.provider)

    const l1ToL2MsgData: L1ToL2MessageData = {
      fetchingUpdate: false,
      status: L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
      l2TxID: undefined
    }

    updateTransaction(receipt, tx, l1ToL2MsgData)
    updateEthBalances()
  }

  async function depositEthEstimateGas({ amount }: { amount: BigNumber }) {
    const depositRequest = await ethBridger.getDepositRequest({
      amount,
      from: walletAddress
    })

    const estimatedL1Gas = await l1.provider.estimateGas(
      depositRequest.txRequest
    )

    const estimatedL2Gas = BigNumber.from(0)
    const estimatedL2SubmissionCost = BigNumber.from(0)
    return { estimatedL1Gas, estimatedL2Gas, estimatedL2SubmissionCost }
  }

  async function withdrawEth({
    amount,
    l2Signer,
    txLifecycle
  }: {
    amount: BigNumber
    l2Signer: Signer
    txLifecycle?: L2ContractCallTransactionLifecycle
  }) {
    const tx = await ethBridger.withdraw({
      amount,
      l2Signer,
      destinationAddress: walletAddress,
      from: walletAddress
    })

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

  async function withdrawEthEstimateGas({ amount }: { amount: BigNumber }) {
    const withdrawalRequest = await ethBridger.getWithdrawalRequest({
      amount,
      destinationAddress: walletAddress,
      from: walletAddress
    })

    // Can't do this atm. Hardcoded to 130_000.
    const estimatedL1Gas = BigNumber.from(130_000)

    const estimatedL2Gas = await l2.provider.estimateGas(
      withdrawalRequest.txRequest
    )

    return { estimatedL1Gas, estimatedL2Gas }
  }

  const approveToken = async ({
    erc20L1Address,
    l1Signer
  }: {
    erc20L1Address: string
    l1Signer: Signer
  }) => {
    const tx = await erc20Bridger.approveToken({
      erc20L1Address,
      l1Signer
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

  const approveTokenEstimateGas = async ({
    erc20L1Address
  }: {
    erc20L1Address: string
  }) => {
    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1.provider
    )

    const contract = ERC20__factory.connect(erc20L1Address, l1.provider)

    return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
      from: walletAddress
    })
  }

  const approveTokenL2 = async ({
    erc20L1Address,
    l2Signer
  }: {
    erc20L1Address: string
    l2Signer: Signer
  }) => {
    const bridgeToken = bridgeTokens[erc20L1Address]
    if (!bridgeToken) throw new Error('Bridge token not found')
    const { l2Address } = bridgeToken
    if (!l2Address) throw new Error('L2 address not found')
    const gatewayAddress = await getL2GatewayAddress(erc20L1Address)
    const contract = await ERC20__factory.connect(l2Address, l2Signer)
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

  async function depositToken({
    erc20L1Address,
    amount,
    l1Signer,
    txLifecycle
  }: {
    erc20L1Address: string
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1ContractCallTransactionLifecycle
  }) {
    const { symbol, decimals } = await getL1TokenData(erc20L1Address)

    const tx = await erc20Bridger.deposit({
      l1Signer,
      l2Provider: l2.provider,
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

    const [l1ToL2Msg] = await receipt.getL1ToL2Messages(l2.provider)

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

  async function depositTokenEstimateGas({
    erc20L1Address,
    amount
  }: {
    erc20L1Address: string
    amount: BigNumber
  }) {
    const erc20L1AddressLowercased = erc20L1Address.toLowerCase()
    const lptMainnetAddressLowercased =
      '0x58b6a8a3302369daec383334672404ee733ab239'.toLowerCase()

    if (
      // LPT: L1 gateway reverts on zero amount transfers
      //
      // https://github.com/livepeer/arbitrum-lpt-bridge/blob/170e937724c21ff9971a9b0198cb8fcc947a4ea1/contracts/L1/gateway/L1LPTGateway.sol#L97
      erc20L1AddressLowercased === lptMainnetAddressLowercased
    ) {
      const l1BaseFee = await l1.provider.getGasPrice()

      const inbox = Inbox__factory.connect(
        l2.network.ethBridge.inbox,
        l1.provider
      )

      const estimatedL2SubmissionCost =
        await inbox.calculateRetryableSubmissionFee(
          // Actual data length was 704 but we added some padding
          //
          // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
          BigNumber.from(1000),
          // We do the same percent increase in the SDK
          //
          // https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L132
          l1BaseFee.add(l1BaseFee.mul(BigNumber.from(3)))
        )

      return {
        // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
        estimatedL1Gas: BigNumber.from(200_000),
        // https://arbiscan.io/tx/0x483206b0ed4e8a23b14de070f6c552120d0b9bc6ed028f4feae33c4ca832f2bc
        estimatedL2Gas: BigNumber.from(100_000),
        estimatedL2SubmissionCost
      }
    }

    const depositRequest = await erc20Bridger.getDepositRequest({
      // Setting `amount` to zero so it doesn't fail on not enough allowance
      amount: BigNumber.from(0),
      from: walletAddress,
      erc20L1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

    const estimatedL1Gas = await l1.provider.estimateGas(
      depositRequest.txRequest
    )

    const estimatedL2Gas = depositRequest.retryableData.gasLimit
    const estimatedL2SubmissionCost =
      depositRequest.retryableData.maxSubmissionCost
    return { estimatedL1Gas, estimatedL2Gas, estimatedL2SubmissionCost }
  }

  async function withdrawToken({
    erc20L1Address,
    amount,
    l2Signer,
    txLifecycle
  }: {
    erc20L1Address: string
    amount: BigNumber
    l2Signer: Signer
    txLifecycle?: L2ContractCallTransactionLifecycle
  }) {
    const bridgeToken = bridgeTokens[erc20L1Address]

    const { symbol, decimals } = await (async () => {
      if (bridgeToken) {
        const { symbol, decimals } = bridgeToken
        return { symbol, decimals }
      }
      const { symbol, decimals } = await getL1TokenData(erc20L1Address)
      addToken(erc20L1Address)
      return { symbol, decimals }
    })()

    const tx = await erc20Bridger.withdraw({
      l2Signer,
      erc20l1Address: erc20L1Address,
      destinationAddress: walletAddress,
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
      sender: walletAddress,
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
          tokenAddress: erc20L1Address,
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
      updateTokenData(erc20L1Address)
      return receipt
    } catch (err) {
      console.warn('withdraw token err', err)
    }
  }

  async function withdrawTokenEstimateGas({
    amount,
    erc20L1Address
  }: {
    amount: BigNumber
    erc20L1Address: string
  }) {
    const estimatedL1Gas = BigNumber.from(160_000)

    const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
      amount,
      destinationAddress: walletAddress,
      erc20l1Address: erc20L1Address,
      from: walletAddress
    })

    const estimatedL2Gas = await l2.provider.estimateGas(
      withdrawalRequest.txRequest
    )

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
          l2Address: address.toLowerCase(),
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

    setBridgeTokens(oldBridgeTokens => ({
      ...oldBridgeTokens,
      ...bridgeTokensToAdd
    }))
  }

  async function addToken(erc20L1orL2Address: string) {
    let l1Address: string
    let l2Address: string | undefined

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
    const { name, symbol, decimals } = await getL1TokenData(l1Address)

    const isDisabled = await l1TokenIsDisabled(l1Address)

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled')
    }

    bridgeTokensToAdd[l1Address] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: l1Address,
      l2Address: l2Address.toLowerCase(),
      decimals
    }
    setBridgeTokens(oldBridgeTokens => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd }
    })
    return l1Address
  }

  const updateTokenData = useCallback(
    async (l1Address: string) => {
      const bridgeToken = bridgeTokens[l1Address]
      if (!bridgeToken) {
        return
      }
      const newBridgeTokens = { [l1Address]: bridgeToken }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...newBridgeTokens }
      })
    },
    [bridgeTokens, setBridgeTokens]
  )

  const updateEthBalances = async () => {
    Promise.all([updateEthL1Balance(), updateEthL2Balance()])
  }

  async function triggerOutboxToken({
    id,
    l1Signer
  }: {
    id: string
    l1Signer: Signer
  }) {
    const event = pendingWithdrawalsMap[id]

    if (!pendingWithdrawalsMap[id]) {
      throw new Error('Outbox message not found')
    }

    const { tokenAddress, value } = event

    const messageWriter = L2ToL1Message.fromEvent(l1Signer, event)

    const res = await messageWriter.execute(l2.provider)

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
        addToExecutedMessagesCache([event])
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

  async function triggerOutboxEth({
    id,
    l1Signer
  }: {
    id: string
    l1Signer: Signer
  }) {
    const event = pendingWithdrawalsMap[id]

    if (!event) {
      throw new Error('Outbox message not found')
    }

    const { value } = event

    const messageWriter = L2ToL1Message.fromEvent(l1Signer, event)

    const res = await messageWriter.execute(l2.provider)

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
        addToExecutedMessagesCache([event])
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

  async function mapETHWithdrawalToL2ToL1EventResult(
    // `l2TxHash` exists on result from subgraph
    // `transactionHash` exists on result from event logs
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

  async function mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(
    result: FetchTokenWithdrawalsFromSubgraphResult
  ): Promise<L2ToL1EventResultPlus> {
    const symbol = await getTokenSymbol(result.tokenAddress)
    const decimals = await getTokenDecimals(result.tokenAddress)
    const outgoingMessageState = await getOutgoingMessageState(result)

    return {
      ...result,
      value: result.amount,
      type: AssetType.ERC20,
      symbol,
      decimals,
      outgoingMessageState
    }
  }

  async function mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
    result: WithdrawalInitiated
  ): Promise<L2ToL1EventResultPlus> {
    const symbol = await getTokenSymbol(result.l1Token)
    const decimals = await getTokenDecimals(result.l1Token)

    const txReceipt = await l2.provider.getTransactionReceipt(result.txHash)
    const l2TxReceipt = new L2TransactionReceipt(txReceipt)

    // TODO: length != 1
    const [event] = l2TxReceipt.getL2ToL1Events()
    const outgoingMessageState = await getOutgoingMessageState(event)

    return {
      ...event,
      type: AssetType.ERC20,
      value: result._amount,
      tokenAddress: result.l1Token,
      outgoingMessageState,
      symbol,
      decimals,
      l2TxHash: l2TxReceipt.transactionHash
    }
  }

  async function attachNodeBlockDeadlineToEvent(event: L2ToL1EventResultPlus) {
    if (
      event.outgoingMessageState === OutgoingMessageState.EXECUTED ||
      event.outgoingMessageState === OutgoingMessageState.CONFIRMED
    ) {
      return event
    }

    const messageReader = L2ToL1MessageReader.fromEvent(l1.provider, event)

    try {
      const firstExecutableBlock = await messageReader.getFirstExecutableBlock(
        l2.provider
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

  async function tryFetchLatestSubgraphBlockNumber(): Promise<number> {
    try {
      return await fetchL2BlockNumberFromSubgraph(l2.network.chainID)
    } catch (error) {
      // In case the subgraph is not supported or down, fall back to fetching everything through event logs
      return 0
    }
  }

  const setInitialPendingWithdrawals = async (gatewayAddresses: string[]) => {
    const t = new Date().getTime()
    const pendingWithdrawals: PendingWithdrawalsMap = {}

    console.log('*** Getting initial pending withdrawal data ***')

    const latestSubgraphBlockNumber = await tryFetchLatestSubgraphBlockNumber()

    console.log(
      'Latest block number on L2 from subgraph:',
      latestSubgraphBlockNumber
    )

    const [
      ethWithdrawalsFromSubgraph,
      ethWithdrawalsFromEventLogs,
      tokenWithdrawalsFromSubgraph,
      tokenWithdrawalsFromEventLogs
    ] = await Promise.all([
      // ETH Withdrawals
      fetchETHWithdrawalsFromSubgraph({
        address: walletAddress,
        fromBlock: 0,
        toBlock: latestSubgraphBlockNumber,
        l2Provider: l2.provider
      }),
      fetchETHWithdrawalsFromEventLogs({
        address: walletAddress,
        fromBlock: latestSubgraphBlockNumber + 1,
        toBlock: 'latest',
        l2Provider: l2.provider
      }),
      // Token Withdrawals
      fetchTokenWithdrawalsFromSubgraph({
        address: walletAddress,
        fromBlock: 0,
        toBlock: latestSubgraphBlockNumber,
        l2Provider: l2.provider
      }),
      fetchTokenWithdrawalsFromEventLogs({
        address: walletAddress,
        fromBlock: latestSubgraphBlockNumber + 1,
        toBlock: 'latest',
        l2Provider: l2.provider,
        l2GatewayAddresses: gatewayAddresses
      })
    ])

    const l2ToL1Txns = (
      await Promise.all([
        ...ethWithdrawalsFromSubgraph.map(withdrawal =>
          mapETHWithdrawalToL2ToL1EventResult(withdrawal)
        ),
        ...ethWithdrawalsFromEventLogs.map(withdrawal =>
          mapETHWithdrawalToL2ToL1EventResult(withdrawal)
        ),
        ...tokenWithdrawalsFromSubgraph.map(withdrawal =>
          mapTokenWithdrawalFromSubgraphToL2ToL1EventResult(withdrawal)
        ),
        ...tokenWithdrawalsFromEventLogs.map(withdrawal =>
          mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(withdrawal)
        )
      ])
    ).sort((msgA, msgB) => +msgA.timestamp - +msgB.timestamp)

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

    const executedMessages = l2ToL1Txns.filter(
      tx => tx.outgoingMessageState === OutgoingMessageState.EXECUTED
    )

    addToExecutedMessagesCache(executedMessages)
    setPendingWithdrawalMap(pendingWithdrawals)
  }

  async function getOutgoingMessageState(event: L2ToL1EventResult) {
    const cacheKey = getExecutedMessagesCacheKey({
      event,
      l2ChainId: l2.network.chainID
    })

    if (executedMessagesCache[cacheKey]) {
      return OutgoingMessageState.EXECUTED
    }

    const messageReader = new L2ToL1MessageReader(l1.provider, event)

    try {
      return await messageReader.status(l2.provider)
    } catch (error) {
      return OutgoingMessageState.UNCONFIRMED
    }
  }

  function addToExecutedMessagesCache(events: L2ToL1EventResult[]) {
    const added: { [cacheKey: string]: boolean } = {}

    events.forEach((event: L2ToL1EventResult) => {
      const cacheKey = getExecutedMessagesCacheKey({
        event,
        l2ChainId: l2.network.chainID
      })

      added[cacheKey] = true
    })

    setExecutedMessagesCache({ ...executedMessagesCache, ...added })
  }

  useEffect(() => {
    console.log(bridgeTokens)
  }, [bridgeTokens])

  return {
    walletAddress,
    bridgeTokens,
    balances: {
      erc721: erc721Balances
    },
    eth: {
      deposit: depositEth,
      depositEstimateGas: depositEthEstimateGas,
      withdraw: withdrawEth,
      withdrawEstimateGas: withdrawEthEstimateGas,
      triggerOutbox: triggerOutboxEth
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
