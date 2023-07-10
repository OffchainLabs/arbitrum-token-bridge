import { useCallback, useState, useMemo, useEffect } from 'react'
import { Chain, useAccount } from 'wagmi'
import { BigNumber, utils } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import { MaxUint256 } from '@ethersproject/constants'
import {
  EthBridger,
  Erc20Bridger,
  L1ToL2MessageStatus,
  L2ToL1Message
} from '@arbitrum/sdk'
import { L1EthDepositTransaction } from '@arbitrum/sdk/dist/lib/message/L1Transaction'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys'

import useTransactions, { L1ToL2MessageData } from './useTransactions'
import {
  ArbTokenBridge,
  AssetType,
  ContractStorage,
  ERC20BridgeToken,
  L2ToL1EventResultPlus,
  PendingWithdrawalsMap,
  TokenType,
  OutgoingMessageState,
  L2ToL1EventResult,
  L1EthDepositTransactionLifecycle,
  L1ContractCallTransactionLifecycle,
  L2ContractCallTransactionLifecycle,
  NodeBlockDeadlineStatusTypes,
  ArbTokenBridgeEth,
  ArbTokenBridgeToken
} from './arbTokenBridge.types'
import { useBalance } from './useBalance'
import {
  getL1TokenData,
  getL1ERC20Address,
  getL2GatewayAddress,
  getL2ERC20Address,
  l1TokenIsDisabled
} from '../util/TokenUtils'
import { getL2NativeToken } from '../util/L2NativeUtils'

export const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms))
}

function isClassicL2ToL1TransactionEvent(
  event: L2ToL1TransactionEvent
): event is EventArgs<ClassicL2ToL1TransactionEvent> {
  return typeof (event as any).batchNumber !== 'undefined'
}

export function getExecutedMessagesCacheKey({
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

export function getUniqueIdOrHashFromEvent(
  event: L2ToL1EventResult
): BigNumber {
  const anyEvent = event as any

  // Nitro
  if (anyEvent.hash) {
    return anyEvent.hash as BigNumber
  }

  // Classic
  return anyEvent.uniqueId as BigNumber
}

class TokenDisabledError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'TokenDisabledError'
  }
}

export interface TokenBridgeParams {
  l1: { provider: JsonRpcProvider; network: Chain }
  l2: { provider: JsonRpcProvider; network: Chain }
}

export const useArbTokenBridge = (
  params: TokenBridgeParams
): ArbTokenBridge => {
  const { l1, l2 } = params
  const { address, connector } = useAccount()
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken> | undefined
  >(undefined)

  const {
    eth: [, updateEthL1Balance],
    erc20: [, updateErc20L1Balance]
  } = useBalance({
    provider: l1.provider,
    walletAddress: address
  })
  const {
    eth: [, updateEthL2Balance],
    erc20: [, updateErc20L2Balance]
  } = useBalance({
    provider: l2.provider,
    walletAddress: address
  })

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

  // once the l1/l2/account changes, we need to revalidate the withdrawal list in the store
  // this prevents previous account/chains' transactions to show up in the current account
  // also makes sure the state of app doesn't get incrementally bloated with all accounts' txns loaded up till date
  useEffect(() => {
    if (!connector) {
      return
    }

    const resetPendingWithdrawalMap = () => {
      setPendingWithdrawalMap({})
    }

    connector.on('change', resetPendingWithdrawalMap)

    return () => {
      connector.off('change', resetPendingWithdrawalMap)
    }
  }, [connector])

  const [
    transactions,
    {
      addTransaction,
      addTransactions,
      setDepositsInStore,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      setTransactionSuccess,
      updateTransaction,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateL1ToL2MsgClassicStatus,
      fetchAndUpdateEthDepositMessageStatus
    }
  ] = useTransactions()
  const l1NetworkID = useMemo(() => String(l1.network.id), [l1.network])
  const l2NetworkID = useMemo(() => String(l2.network.id), [l2.network])

  const depositEth = async ({
    amount,
    l1Signer,
    txLifecycle
  }: {
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1EthDepositTransactionLifecycle
  }) => {
    const ethBridger = await EthBridger.fromProvider(l2.provider)

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
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      return error.message
    }

    const walletAddress = await l1Signer.getAddress()
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

  const withdrawEth: ArbTokenBridgeEth['withdraw'] = async ({
    amount,
    l2Signer,
    txLifecycle,
    walletAddress
  }) => {
    try {
      const ethBridger = await EthBridger.fromProvider(l2.provider)
      const tx = await ethBridger.withdraw({
        amount,
        l2Signer,
        destinationAddress: walletAddress,
        from: walletAddress
      })

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx)
      }
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
          nodeBlockDeadline: NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED,
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
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      console.error('withdrawEth err', error)
    }
  }

  const approveToken = async ({
    erc20L1Address,
    l1Signer
  }: {
    erc20L1Address: string
    l1Signer: Signer
  }) => {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2.provider)

    const tx = await erc20Bridger.approveToken({
      erc20L1Address,
      l1Signer
    })
    const walletAddress = await l1Signer.getAddress()
    const { symbol } = await getL1TokenData({
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
      assetName: symbol,
      assetType: AssetType.ERC20,
      sender: walletAddress,
      l1NetworkID
    })

    const receipt = await tx.wait()

    updateTransaction(receipt, tx)
    updateTokenData(erc20L1Address)
  }

  const approveTokenL2 = async ({
    erc20L1Address,
    l2Signer
  }: {
    erc20L1Address: string
    l2Signer: Signer
  }) => {
    if (typeof bridgeTokens === 'undefined' || !walletAddress) {
      return
    }
    const bridgeToken = bridgeTokens[erc20L1Address]
    if (!bridgeToken) throw new Error('Bridge token not found')
    const { l2Address } = bridgeToken
    if (!l2Address) throw new Error('L2 address not found')
    const gatewayAddress = await getL2GatewayAddress({
      erc20L1Address,
      l2Provider: l2.provider
    })
    const contract = await ERC20__factory.connect(l2Address, l2Signer)
    const tx = await contract.functions.approve(gatewayAddress, MaxUint256)
    const { symbol } = await getL1TokenData({
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
      assetName: symbol,
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
    txLifecycle,
    destinationAddress
  }: {
    erc20L1Address: string
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1ContractCallTransactionLifecycle
    destinationAddress?: string
  }) {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2.provider)
    const walletAddress = await l1Signer.getAddress()

    try {
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
        destinationAddress,
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
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
    }
  }

  const withdrawToken: ArbTokenBridgeToken['withdraw'] = async ({
    erc20L1Address,
    amount,
    l2Signer,
    txLifecycle,
    destinationAddress,
    walletAddress
  }) => {
    try {
      const erc20Bridger = await Erc20Bridger.fromProvider(l2.provider)
      const provider = l2Signer.provider
      const isSmartContractAddress =
        provider && (await provider.getCode(String(erc20L1Address))).length < 2
      if (isSmartContractAddress && !destinationAddress) {
        throw new Error(`Missing destination address`)
      }

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
        destinationAddress: destinationAddress ?? walletAddress,
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
          nodeBlockDeadline: NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED,
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
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      console.warn('withdraw token err', error)
    }
  }

  const removeTokensFromList = (listID: number) => {
    setBridgeTokens(prevBridgeTokens => {
      const newBridgeTokens = { ...prevBridgeTokens }
      for (const address in bridgeTokens) {
        const token = bridgeTokens[address]
        if (!token) continue

        token.listIds.delete(listID)

        if (token.listIds.size === 0) {
          delete newBridgeTokens[address]
        }
      }
      return newBridgeTokens
    })
  }

  const addTokensFromList = async (arbTokenList: TokenList, listId: number) => {
    const l1ChainID = l1.network.id
    const l2ChainID = l2.network.id

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
          l2Address: address.toLowerCase(),
          decimals,
          logoURI,
          listIds: new Set([listId])
        }
      }
      // save potentially unbridged L1 tokens:
      // stopgap: giant lists (i.e., CMC list) currently severaly hurts page performace, so for now we only add the bridged tokens
      else if (arbTokenList.tokens.length < 1000) {
        candidateUnbridgedTokensToAdd.push({
          name,
          type: TokenType.ERC20,
          symbol,
          address: address.toLowerCase(),
          decimals,
          logoURI,
          listIds: new Set([listId])
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
    for (const l1TokenData of candidateUnbridgedTokensToAdd) {
      if (!l1AddressesOfBridgedTokens.has(l1TokenData.address.toLowerCase())) {
        bridgeTokensToAdd[l1TokenData.address] = l1TokenData
      }
    }

    // Callback is used here, so we can add listId to the set of listIds rather than creating a new set everytime
    setBridgeTokens(oldBridgeTokens => {
      const l1Addresses: string[] = []
      const l2Addresses: string[] = []

      for (const tokenAddress in bridgeTokensToAdd) {
        const tokenToAdd = bridgeTokensToAdd[tokenAddress]
        if (!tokenToAdd) {
          return
        }
        const { address, l2Address } = tokenToAdd
        if (address) {
          l1Addresses.push(address)
        }
        if (l2Address) {
          l2Addresses.push(l2Address)
        }

        // Add the new list id being imported (`listId`) to the existing list ids (from `oldBridgeTokens[address]`)
        // Set the result to token added to `bridgeTokens` : `tokenToAdd.listIds`
        const oldListIds =
          oldBridgeTokens?.[tokenToAdd.address]?.listIds || new Set()
        tokenToAdd.listIds = new Set([...oldListIds, listId])
      }

      updateErc20L1Balance(l1Addresses)
      updateErc20L2Balance(l2Addresses)

      return {
        ...oldBridgeTokens,
        ...bridgeTokensToAdd
      }
    })
  }

  async function addToken(erc20L1orL2Address: string) {
    let l1Address: string
    let l2Address: string | undefined

    if (!address) {
      return
    }

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
      l2Address = await getL2ERC20Address({
        erc20L1Address: l1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider
      })
    }

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}

    const { name, symbol, decimals } = await getL1TokenData({
      account: address,
      erc20L1Address: l1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

    const isDisabled = await l1TokenIsDisabled({
      erc20L1Address: l1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled')
    }

    const l1AddressLowerCased = l1Address.toLowerCase()
    bridgeTokensToAdd[l1AddressLowerCased] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: l1AddressLowerCased,
      l2Address: l2Address?.toLowerCase(),
      decimals,
      listIds: new Set()
    }

    setBridgeTokens(oldBridgeTokens => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd }
    })

    updateErc20L1Balance([l1AddressLowerCased])
    if (l2Address) {
      updateErc20L2Balance([l2Address])
    }
  }

  const updateTokenData = useCallback(
    async (l1Address: string) => {
      if (typeof bridgeTokens === 'undefined') {
        return
      }
      const l1AddressLowerCased = l1Address.toLowerCase()
      const bridgeToken = bridgeTokens[l1AddressLowerCased]

      if (!bridgeToken) {
        return
      }

      const newBridgeTokens = { [l1AddressLowerCased]: bridgeToken }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...newBridgeTokens }
      })
      const { l2Address } = bridgeToken
      updateErc20L1Balance([l1AddressLowerCased])
      if (l2Address) {
        updateErc20L2Balance([l2Address])
      }
    },
    [bridgeTokens, setBridgeTokens, updateErc20L1Balance, updateErc20L2Balance]
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

    if (!event) {
      throw new Error('Outbox message not found')
    }

    const { tokenAddress, value } = event

    const messageWriter = L2ToL1Message.fromEvent(l1Signer, event, l1.provider)

    const res = await messageWriter.execute(l2.provider)

    const walletAddress = await l1Signer.getAddress()
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

    const rec = await res.wait()

    if (rec.status === 1) {
      setTransactionSuccess(rec.transactionHash)
      addToExecutedMessagesCache([event])
      setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
        const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
        const pendingWithdrawal = newPendingWithdrawalsMap[id]
        if (pendingWithdrawal) {
          pendingWithdrawal.outgoingMessageState = OutgoingMessageState.EXECUTED
        }

        return newPendingWithdrawalsMap
      })
    } else {
      setTransactionFailure(rec.transactionHash)
    }

    return rec
  }

  function addL2NativeToken(erc20L2Address: string) {
    const token = getL2NativeToken(erc20L2Address, l2.network.id)

    setBridgeTokens(oldBridgeTokens => {
      return {
        ...oldBridgeTokens,
        [`L2-NATIVE:${token.address}`]: {
          name: token.name,
          type: TokenType.ERC20,
          symbol: token.symbol,
          address: token.address,
          l2Address: token.address,
          decimals: token.decimals,
          logoURI: token.logoURI,
          listIds: new Set(),
          isL2Native: true
        }
      }
    })
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

    const messageWriter = L2ToL1Message.fromEvent(l1Signer, event, l1.provider)

    const res = await messageWriter.execute(l2.provider)

    const walletAddress = await l1Signer.getAddress()

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

    const rec = await res.wait()

    if (rec.status === 1) {
      setTransactionSuccess(rec.transactionHash)
      addToExecutedMessagesCache([event])
      setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
        const newPendingWithdrawalsMap = { ...oldPendingWithdrawalsMap }
        const pendingWithdrawal = newPendingWithdrawalsMap[id]
        if (pendingWithdrawal) {
          pendingWithdrawal.outgoingMessageState = OutgoingMessageState.EXECUTED
        }

        return newPendingWithdrawalsMap
      })
    } else {
      setTransactionFailure(rec.transactionHash)
    }

    return rec
  }

  function addToExecutedMessagesCache(events: L2ToL1EventResult[]) {
    const added: { [cacheKey: string]: boolean } = {}

    events.forEach((event: L2ToL1EventResult) => {
      const cacheKey = getExecutedMessagesCacheKey({
        event,
        l2ChainId: l2.network.id
      })

      added[cacheKey] = true
    })

    setExecutedMessagesCache({ ...executedMessagesCache, ...added })
  }

  const setWithdrawalsInStore = (withdrawalTxns: L2ToL1EventResultPlus[]) => {
    const pwMap = {} as PendingWithdrawalsMap
    withdrawalTxns.forEach(tx => {
      const id = getUniqueIdOrHashFromEvent(tx).toString()
      pwMap[id] = tx
    })
    setPendingWithdrawalMap(previousPendingWithdrawalsMap => ({
      ...previousPendingWithdrawalsMap,
      ...pwMap
    }))
  }

  return {
    bridgeTokens,
    eth: {
      deposit: depositEth,
      withdraw: withdrawEth,
      triggerOutbox: triggerOutboxEth
    },
    token: {
      add: addToken,
      addL2NativeToken,
      addTokensFromList,
      removeTokensFromList,
      updateTokenData,
      approve: approveToken,
      approveL2: approveTokenL2,
      deposit: depositToken,
      withdraw: withdrawToken,
      triggerOutbox: triggerOutboxToken
    },
    transactions: {
      transactions,
      setDepositsInStore,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      addTransaction,
      addTransactions,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateL1ToL2MsgClassicStatus,
      fetchAndUpdateEthDepositMessageStatus
    },
    pendingWithdrawalsMap: pendingWithdrawalsMap,
    setWithdrawalsInStore
  }
}
