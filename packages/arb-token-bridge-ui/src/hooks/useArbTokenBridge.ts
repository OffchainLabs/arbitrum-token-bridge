import { useCallback, useState, useMemo } from 'react'
import { Chain, useAccount } from 'wagmi'
import { BigNumber } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import {
  EventArgs,
  ChildToParentMessage,
  ChildToParentTransactionEvent
} from '@arbitrum/sdk'
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys'

import useTransactions from './useTransactions'
import {
  ArbTokenBridge,
  ContractStorage,
  ERC20BridgeToken,
  ChildToParentEventResultPlus,
  TokenType,
  ChildToParentEventResult
} from './arbTokenBridge.types'
import { useBalance } from './useBalance'
import {
  fetchErc20Data,
  getL1ERC20Address,
  getL2ERC20Address,
  l1TokenIsDisabled,
  isValidErc20,
  getL3ERC20Address
} from '../util/TokenUtils'
import { getL2NativeToken } from '../util/L2NativeUtils'
import { CommonAddress } from '../util/CommonAddressUtils'
import { isNetwork } from '../util/networks'
import { useDestinationAddressStore } from '../components/TransferPanel/AdvancedSettings'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms))
}

function isClassicL2ToL1TransactionEvent(
  event: ChildToParentTransactionEvent
): event is EventArgs<ClassicL2ToL1TransactionEvent> {
  return typeof (event as any).batchNumber !== 'undefined'
}

export function getExecutedMessagesCacheKey({
  event,
  l2ChainId
}: {
  event: ChildToParentEventResult
  l2ChainId: number
}) {
  return isClassicL2ToL1TransactionEvent(event)
    ? `l2ChainId: ${l2ChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
    : `l2ChainId: ${l2ChainId}, position: ${event.position.toString()}`
}

export function getUniqueIdOrHashFromEvent(
  event: ChildToParentEventResult
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
  parent: { provider: JsonRpcProvider; network: Chain }
  child: { provider: JsonRpcProvider; network: Chain }
}

export const useArbTokenBridge = (
  params: TokenBridgeParams
): ArbTokenBridge => {
  const { parent, child } = params
  const { address: walletAddress } = useAccount()
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken> | undefined
  >(undefined)

  const { destinationAddress } = useDestinationAddressStore()

  const {
    erc20: [, updateErc20ParentBalance]
  } = useBalance({
    chainId: parent.network.id,
    walletAddress
  })
  const {
    erc20: [, updateErc20ChildBalance]
  } = useBalance({
    chainId: child.network.id,
    walletAddress
  })
  const {
    erc20: [, updateErc20ParentCustomDestinationBalance]
  } = useBalance({
    chainId: parent.network.id,
    walletAddress: destinationAddress
  })
  const {
    erc20: [, updateErc20ChildCustomDestinationBalance]
  } = useBalance({
    chainId: child.network.id,
    walletAddress: destinationAddress
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

  const parentNetworkID = useMemo(
    () => String(parent.network.id),
    [parent.network.id]
  )

  const [transactions, { addTransaction, updateTransaction }] =
    useTransactions()

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
    const parentChainID = parent.network.id
    const childChainID = child.network.id

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}

    const candidateUnbridgedTokensToAdd: ERC20BridgeToken[] = []

    for (const tokenData of arbTokenList.tokens) {
      const { address, name, symbol, extensions, decimals, logoURI, chainId } =
        tokenData

      if (![parentChainID, childChainID].includes(chainId)) {
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
        const parentAddress =
          bridgeInfo[parentNetworkID]?.tokenAddress.toLowerCase()

        if (!parentAddress) {
          return
        }

        bridgeTokensToAdd[parentAddress] = {
          name,
          type: TokenType.ERC20,
          symbol,
          address: parentAddress,
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

    // add parent chain tokens only if they aren't already bridged (i.e., if they haven't already been added as child arb-tokens to the list)
    const parentAddressesOfBridgedTokens = new Set(
      Object.keys(bridgeTokensToAdd).map(
        parentAddress =>
          parentAddress.toLowerCase() /* lists should have the checksummed case anyway, but just in case (pun unintended) */
      )
    )
    for (const parentTokenData of candidateUnbridgedTokensToAdd) {
      if (
        !parentAddressesOfBridgedTokens.has(
          parentTokenData.address.toLowerCase()
        )
      ) {
        bridgeTokensToAdd[parentTokenData.address] = parentTokenData
      }
    }

    // Callback is used here, so we can add listId to the set of listIds rather than creating a new set everytime
    setBridgeTokens(oldBridgeTokens => {
      const parentChainAddresses: string[] = []
      const childChainAddresses: string[] = []

      // USDC is not on any token list as it's unbridgeable
      // but we still want to detect its balance on user's wallet
      if (isNetwork(childChainID).isArbitrumOne) {
        childChainAddresses.push(CommonAddress.ArbitrumOne.USDC)
      }
      if (isNetwork(childChainID).isArbitrumSepolia) {
        childChainAddresses.push(CommonAddress.ArbitrumSepolia.USDC)
      }

      for (const tokenAddress in bridgeTokensToAdd) {
        const tokenToAdd = bridgeTokensToAdd[tokenAddress]
        if (!tokenToAdd) {
          return
        }
        const { address, l2Address } = tokenToAdd
        if (address) {
          parentChainAddresses.push(address)
        }
        if (l2Address) {
          childChainAddresses.push(l2Address)
        }

        // Add the new list id being imported (`listId`) to the existing list ids (from `oldBridgeTokens[address]`)
        // Set the result to token added to `bridgeTokens` : `tokenToAdd.listIds`
        const oldListIds =
          oldBridgeTokens?.[tokenToAdd.address]?.listIds || new Set()
        tokenToAdd.listIds = new Set([...oldListIds, listId])
      }

      updateErc20ParentBalance(parentChainAddresses)
      updateErc20ChildBalance(childChainAddresses)

      return {
        ...oldBridgeTokens,
        ...bridgeTokensToAdd
      }
    })
  }

  async function addToken(erc20ParentOrChildAddress: string) {
    let parentChainAddress: string
    let childChainAddress: string | undefined

    if (!walletAddress) {
      return
    }

    const lowercasedErc20ParentOrChildAddress =
      erc20ParentOrChildAddress.toLowerCase()
    const maybeParentAddress = await getL1ERC20Address({
      erc20L2Address: lowercasedErc20ParentOrChildAddress,
      l2Provider: child.provider
    })

    if (maybeParentAddress) {
      // child chain address provided
      parentChainAddress = maybeParentAddress
      childChainAddress = lowercasedErc20ParentOrChildAddress
    } else {
      // parent chain address provided
      parentChainAddress = lowercasedErc20ParentOrChildAddress

      // while deriving the child-chain address, it can be a teleport transfer too, in that case derive L3 address from L1 address
      // else, derive the L2 address from L1 address OR L3 address from L2 address
      if (
        isValidTeleportChainPair({
          sourceChainId: parent.network.id,
          destinationChainId: child.network.id
        })
      ) {
        // child chain address is actually the L3 address in this case
        childChainAddress = await getL3ERC20Address({
          erc20L1Address: parentChainAddress,
          l1Provider: parent.provider,
          l3Provider: child.provider
        })
      } else {
        childChainAddress = await getL2ERC20Address({
          erc20L1Address: parentChainAddress,
          l1Provider: parent.provider,
          l2Provider: child.provider
        })
      }
    }

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}
    const erc20Params = {
      address: parentChainAddress,
      provider: parent.provider
    }

    if (!(await isValidErc20(erc20Params))) {
      throw new Error(`${parentChainAddress} is not a valid ERC-20 token`)
    }

    const { name, symbol, decimals } = await fetchErc20Data(erc20Params)

    const isDisabled = await l1TokenIsDisabled({
      erc20L1Address: parentChainAddress,
      l1Provider: parent.provider,
      l2Provider: child.provider
    })

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled')
    }

    const parentAddressLowerCased = parentChainAddress.toLowerCase()
    bridgeTokensToAdd[parentAddressLowerCased] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: parentAddressLowerCased,
      l2Address: childChainAddress?.toLowerCase(),
      decimals,
      listIds: new Set()
    }

    setBridgeTokens(oldBridgeTokens => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd }
    })

    updateErc20ParentBalance([parentAddressLowerCased])
    if (childChainAddress) {
      updateErc20ChildBalance([childChainAddress])
    }
  }

  const updateTokenData = useCallback(
    async (parentAddress: string) => {
      if (typeof bridgeTokens === 'undefined') {
        return
      }
      const parentAddressLowerCased = parentAddress.toLowerCase()
      const bridgeToken = bridgeTokens[parentAddressLowerCased]

      if (!bridgeToken) {
        return
      }

      const newBridgeTokens = { [parentAddressLowerCased]: bridgeToken }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...newBridgeTokens }
      })
      const { l2Address } = bridgeToken
      updateErc20ParentBalance([parentAddressLowerCased])
      if (destinationAddress) {
        updateErc20ParentCustomDestinationBalance([parentAddressLowerCased])
      }
      if (l2Address) {
        updateErc20ChildBalance([l2Address])
        if (destinationAddress) {
          updateErc20ChildCustomDestinationBalance([l2Address])
        }
      }
    },
    [
      bridgeTokens,
      setBridgeTokens,
      updateErc20ParentBalance,
      updateErc20ChildBalance,
      updateErc20ParentCustomDestinationBalance,
      updateErc20ChildCustomDestinationBalance
    ]
  )

  async function triggerOutboxToken({
    event,
    parentSigner
  }: {
    event: ChildToParentEventResultPlus
    parentSigner: Signer
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found')
    }

    if (!walletAddress) {
      return
    }

    const parentChainProvider = getProviderForChainId(event.parentChainId)
    const childChainProvider = getProviderForChainId(event.childChainId)

    const messageWriter = ChildToParentMessage.fromEvent(
      parentSigner,
      event,
      parentChainProvider
    )
    const res = await messageWriter.execute(childChainProvider)

    const rec = await res.wait()

    if (rec.status === 1) {
      addToExecutedMessagesCache([event])
    }

    return rec
  }

  function addChildNativeToken(erc20ChildAddress: string) {
    const token = getL2NativeToken(erc20ChildAddress, child.network.id)

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
    event,
    parentSigner
  }: {
    event: ChildToParentEventResultPlus
    parentSigner: Signer
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found')
    }

    if (!walletAddress) {
      return
    }

    const parentChainProvider = getProviderForChainId(event.parentChainId)
    const childChainProvider = getProviderForChainId(event.childChainId)

    const messageWriter = ChildToParentMessage.fromEvent(
      parentSigner,
      event,
      parentChainProvider
    )

    const res = await messageWriter.execute(childChainProvider)

    const rec = await res.wait()

    if (rec.status === 1) {
      addToExecutedMessagesCache([event])
    }

    return rec
  }

  function addToExecutedMessagesCache(events: ChildToParentEventResult[]) {
    const added: { [cacheKey: string]: boolean } = {}

    events.forEach((event: ChildToParentEventResult) => {
      const cacheKey = getExecutedMessagesCacheKey({
        event,
        l2ChainId: child.network.id
      })

      added[cacheKey] = true
    })

    setExecutedMessagesCache({ ...executedMessagesCache, ...added })
  }

  return {
    bridgeTokens,
    eth: {
      triggerOutbox: triggerOutboxEth
    },
    token: {
      add: addToken,
      addChildNativeToken,
      addTokensFromList,
      removeTokensFromList,
      updateTokenData,
      triggerOutbox: triggerOutboxToken
    },
    transactions: {
      transactions,
      updateTransaction,
      addTransaction
    }
  }
}
