import { useCallback, useEffect, useState, useMemo } from 'react'
import { BigNumber, constants, utils } from 'ethers'
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

import { getL1ERC20Address } from '../util/getL1ERC20Address'
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

import { getUniqueIdOrHashFromEvent } from '../util/migration'
import {
  getL1TokenData,
  getL2TokenData,
  isClassicL2ToL1TransactionEvent
} from '../util'
import { fetchL2BlockNumberFromSubgraph } from '../util/subgraph'

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
  params: TokenBridgeParams,
  autoLoadCache = true
): ArbTokenBridge => {
  const { walletAddress, l1, l2 } = params
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken> | undefined
  >(undefined)

  const {
    eth: [, updateEthL1Balance]
  } = useBalance({
    provider: l1.provider,
    walletAddress
  })
  const {
    eth: [, updateEthL2Balance]
  } = useBalance({
    provider: l2.provider,
    walletAddress
  })

  const [erc20Balances, setErc20Balances] = useState<
    ContractStorage<BridgeBalance>
  >({})

  const [erc721Balances] = useState<ContractStorage<ERC721Balance>>({})

  const defaultTokenList: string[] = []

  const tokenBlackList: string[] = []
  const [ERC20Cache, setERC20Cache, clearERC20Cache] = useLocalStorage<
    string[]
  >('ERC20Cache', []) as [
    string[],
    React.Dispatch<string[]>,
    React.Dispatch<void>
  ]

  const [ERC721Cache, , clearERC721Cache] = useLocalStorage<string[]>(
    'ERC721Cache',
    []
  ) as [string[], React.Dispatch<string[]>, React.Dispatch<void>]

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

  async function getL2GatewayAddress(erc20L1Address: string): Promise<string> {
    return erc20Bridger.getL2GatewayAddress(erc20L1Address, l2.provider)
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

    if (!ethDepositMessage) {
      return
    }

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

        if (!l2ToL1EventResult) {
          return
        }

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

    const tokenData = await getL1TokenData({
      account: walletAddress,
      erc20L1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

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
    if (typeof bridgeTokens === 'undefined') {
      return
    }
    const bridgeToken = bridgeTokens[erc20L1Address]
    if (!bridgeToken) throw new Error('Bridge token not found')
    const { l2Address } = bridgeToken
    if (!l2Address) throw new Error('L2 address not found')
    const gatewayAddress = await getL2GatewayAddress(erc20L1Address)
    const contract = await ERC20__factory.connect(l2Address, l2Signer)
    const tx = await contract.functions.approve(gatewayAddress, MaxUint256)
    const tokenData = await getL1TokenData({
      account: walletAddress,
      erc20L1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

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
    const { symbol, decimals } = await getL1TokenData({
      account: walletAddress,
      erc20L1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

    const depositRequest = await erc20Bridger.getDepositRequest({
      l1Provider: l1.provider,
      l2Provider: l2.provider,
      from: walletAddress,
      erc20L1Address,
      amount
    })

    const tx = await erc20Bridger.deposit({
      ...depositRequest,
      l1Signer
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
    if (!l1ToL2Msg) {
      return
    }

    const l1ToL2MsgData: L1ToL2MessageData = {
      fetchingUpdate: false,
      status: L1ToL2MessageStatus.NOT_YET_CREATED, // we know its not yet created, we just initiated it
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
    const l1BaseFee = await l1.provider.getGasPrice()

    const inbox = Inbox__factory.connect(
      l2.network.ethBridge.inbox,
      l1.provider
    )

    const estimatedL2SubmissionCost =
      await inbox.calculateRetryableSubmissionFee(
        // Values set by looking at a couple of L1 gateways
        //
        // L1 LPT Gateway: 324
        // L1 DAI Gateway: 324
        // L1 Standard Gateway (APE): 740
        // L1 Custom Gateway (USDT): 324
        // L1 WETH Gateway: 324
        BigNumber.from(1_000),
        // We do the same percent increase in the SDK
        //
        // https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L132
        l1BaseFee.add(l1BaseFee.mul(BigNumber.from(3)))
      )

    return {
      // Values set by looking at a couple of different ERC-20 deposits
      //
      // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
      // https://etherscan.io/tx/0x0049a5a171b891c5826ba47e77871fa6bae6eb57fcaf474a97d62ab07a815a2c
      // https://etherscan.io/tx/0xb11bffdfbe4bc6fb4328c390d4cdf73bc863dbaaef057afb59cd83dfd6dc210c
      // https://etherscan.io/tx/0x194ab69d3d2b5730b37e8bad1473f8bc54ded7a2ad3708d131ef13c09168d67e
      // https://etherscan.io/tx/0xc4789d3f13e0efb011dfa88eef89b4b715d8c32366977eae2d3b85f13b3aa6c5
      estimatedL1Gas: BigNumber.from(240_000),
      // Values set by looking at a couple of different ERC-20 deposits
      //
      // https://arbiscan.io/tx/0x483206b0ed4e8a23b14de070f6c552120d0b9bc6ed028f4feae33c4ca832f2bc
      // https://arbiscan.io/tx/0xd2ba11ebc51f546abc2ddda715507948d097e5707fd1dc37c239cc4cf28cc6ed
      // https://arbiscan.io/tx/0xb341745b6f4a34ee539c628dcf177fc98b658e494c7f8d21da872e69d5173596
      // https://arbiscan.io/tx/0x731d31834bc01d33a1de33b5562b29c1ae6f75d20f6da83a5d74c3c91bd2dab9
      // https://arbiscan.io/tx/0x6b13bfe9f22640ac25f77a677a3c36e748913d5e07766b3d6394de09a1398020
      estimatedL2Gas: BigNumber.from(100_000),
      estimatedL2SubmissionCost
    }
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
    if (typeof bridgeTokens === 'undefined') {
      return
    }
    const bridgeToken = bridgeTokens[erc20L1Address]

    const { symbol, decimals } = await (async () => {
      if (bridgeToken) {
        const { symbol, decimals } = bridgeToken
        return { symbol, decimals }
      }
      const { symbol, decimals } = await getL1TokenData({
        account: walletAddress,
        erc20L1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider
      })
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

        if (!l2ToL1EventDataResult) {
          return
        }

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
        const l1Address = bridgeInfo[l1NetworkID]?.tokenAddress.toLowerCase()

        if (!l1Address) {
          return
        }

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
        const l1Address = address.toLowerCase()
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

    const lowercasedErc20L1orL2Address = erc20L1orL2Address.toLowerCase()
    const maybeL1Address = await getL1ERC20Address({
      erc20L2Address: lowercasedErc20L1orL2Address,
      l2Provider: l2.provider
    })

    if (maybeL1Address) {
      // looks like l2 address was provided
      l1Address = maybeL1Address
      l2Address = lowercasedErc20L1orL2Address
    } else {
      // looks like l1 address was provided
      l1Address = lowercasedErc20L1orL2Address
      l2Address = await getL2ERC20Address(l1Address)
    }

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}
    const { name, symbol, balance, decimals } = await getL1TokenData({
      account: walletAddress,
      erc20L1Address: l1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

    l1TokenBalance = balance

    try {
      // check if token is deployed at l2 address; if not this will throw
      const { balance } = await getL2TokenData({
        account: walletAddress,
        erc20L2Address: l2Address,
        l2Provider: l2.provider
      })
      l2TokenBalance = balance
    } catch (error) {
      console.info(`no L2 token for ${l1Address} (which is fine)`)

      l2Address = undefined
    }

    const isDisabled = await l1TokenIsDisabled(l1Address)

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled')
    }

    bridgeTokensToAdd[l1Address.toLowerCase()] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: l1Address.toLowerCase(),
      l2Address,
      decimals
    }

    setBridgeTokens(oldBridgeTokens => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd }
    })
    setErc20Balances(oldBridgeBalances => {
      const newBal = {
        [l1Address.toLowerCase()]: {
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

  const updateTokenData = useCallback(
    async (l1Address: string) => {
      if (typeof bridgeTokens === 'undefined') {
        return
      }
      const bridgeToken = bridgeTokens[l1Address]
      if (!bridgeToken) {
        return
      }
      const { l2Address } = bridgeToken
      const l1Data = await getL1TokenData({
        account: walletAddress,
        erc20L1Address: l1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider
      })
      const l2Data =
        (l2Address &&
          (await getL2TokenData({
            account: walletAddress,
            erc20L2Address: l2Address,
            l2Provider: l2.provider
          }))) ||
        undefined
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

  const updateEthBalances = async () => {
    Promise.all([updateEthL1Balance(), updateEthL2Balance()])
  }

  const updateTokenBalances = async (
    bridgeTokens: ContractStorage<BridgeToken>
  ) => {
    const l1MultiCaller = await MultiCaller.fromProvider(l1.provider)
    const l2MultiCaller = await MultiCaller.fromProvider(l2.provider)

    const l1Addresses = Object.keys(bridgeTokens)
    const l1AddressesBalances = await l1MultiCaller.getTokenData(l1Addresses, {
      balanceOf: { account: walletAddress }
    })
    const l1Balances = l1Addresses.map((address: string, index: number) => ({
      tokenAddr: address,
      balance: l1AddressesBalances[index]?.balance ?? constants.Zero
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
      balance: l2AddressesBalances[index]?.balance ?? constants.Zero
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

  async function triggerOutboxToken({
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

    const { tokenAddress, value } = event

    const messageWriter = L2ToL1Message.fromEvent(l1Signer, event)

    const res = await messageWriter.execute(l2.provider)

    const { symbol, decimals } = await getL1TokenData({
      account: walletAddress,
      erc20L1Address: tokenAddress as string,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

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
          const pendingWithdrawal = newPendingWithdrawalsMap[id]
          if (pendingWithdrawal) {
            pendingWithdrawal.outgoingMessageState =
              OutgoingMessageState.EXECUTED
          }

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
          const pendingWithdrawal = newPendingWithdrawalsMap[id]
          if (pendingWithdrawal) {
            pendingWithdrawal.outgoingMessageState =
              OutgoingMessageState.EXECUTED
          }

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

    const l1Symbol = addressToSymbol[l1Address]
    if (l1Symbol) {
      return l1Symbol
    }

    try {
      const { symbol } = await getL1TokenData({
        account: walletAddress,
        erc20L1Address: l1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider,
        throwOnInvalidERC20: false
      })
      addressToSymbol[l1Address] = symbol
      return symbol
    } catch (err) {
      console.warn('could not get token symbol', err)
      return '???'
    }
  }

  const getTokenDecimals = async (_l1Address: string) => {
    const l1Address = _l1Address.toLocaleLowerCase()

    const l1Decimals = addressToDecimals[l1Address]
    if (l1Decimals) {
      return l1Decimals
    }

    try {
      const { decimals } = await getL1TokenData({
        account: walletAddress,
        erc20L1Address: l1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider,
        throwOnInvalidERC20: false
      })
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
  ): Promise<L2ToL1EventResultPlus | undefined> {
    const symbol = await getTokenSymbol(result.l1Token)
    const decimals = await getTokenDecimals(result.l1Token)

    const txReceipt = await l2.provider.getTransactionReceipt(result.txHash)
    const l2TxReceipt = new L2TransactionReceipt(txReceipt)

    // TODO: length != 1
    const [event] = l2TxReceipt.getL2ToL1Events()

    if (!event) {
      return undefined
    }

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
    )
      .filter((msg): msg is L2ToL1EventResultPlus => typeof msg !== 'undefined')
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

  return {
    walletAddress,
    bridgeTokens: bridgeTokens,
    balances: {
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
