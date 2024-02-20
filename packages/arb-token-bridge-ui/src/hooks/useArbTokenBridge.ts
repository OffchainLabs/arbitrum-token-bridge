import { useCallback, useState, useMemo } from 'react'
import { Chain, useAccount } from 'wagmi'
import { BigNumber, utils } from 'ethers'
import { Signer } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import { MaxUint256 } from '@ethersproject/constants'
import { EthBridger, Erc20Bridger, L2ToL1Message } from '@arbitrum/sdk'
import { L1EthDepositTransaction } from '@arbitrum/sdk/dist/lib/message/L1Transaction'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys'
import dayjs from 'dayjs'

import useTransactions from './useTransactions'
import {
  ArbTokenBridge,
  AssetType,
  ContractStorage,
  ERC20BridgeToken,
  L2ToL1EventResultPlus,
  TokenType,
  L2ToL1EventResult,
  L1EthDepositTransactionLifecycle,
  L1ContractCallTransactionLifecycle,
  ArbTokenBridgeEth,
  ArbTokenBridgeToken
} from './arbTokenBridge.types'
import { useBalance } from './useBalance'
import {
  fetchErc20Data,
  getL1ERC20Address,
  fetchErc20L2GatewayAddress,
  getL2ERC20Address,
  l1TokenIsDisabled,
  isValidErc20
} from '../util/TokenUtils'
import { getL2NativeToken } from '../util/L2NativeUtils'
import { CommonAddress } from '../util/CommonAddressUtils'
import { isNetwork } from '../util/networks'
import { useUpdateUSDCBalances } from './CCTP/useUpdateUSDCBalances'
import { useNativeCurrency } from './useNativeCurrency'
import { useTransactionHistory } from './useTransactionHistory'
import { DepositStatus, WithdrawalStatus } from '../state/app/state'
import {
  addDepositToCache,
  getProvider
} from '../components/TransactionHistory/helpers'

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

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L76
function percentIncrease(num: BigNumber, increase: BigNumber): BigNumber {
  return num.add(num.mul(increase).div(100))
}

export interface TokenBridgeParams {
  l1: { provider: JsonRpcProvider; network: Chain }
  l2: { provider: JsonRpcProvider; network: Chain }
}

export const useArbTokenBridge = (
  params: TokenBridgeParams
): ArbTokenBridge => {
  const { l1, l2 } = params
  const { address: walletAddress } = useAccount()
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<ERC20BridgeToken> | undefined
  >(undefined)

  const { addPendingTransaction } = useTransactionHistory(walletAddress)

  const {
    eth: [, updateEthL1Balance],
    erc20: [, updateErc20L1Balance]
  } = useBalance({
    provider: l1.provider,
    walletAddress
  })
  const {
    eth: [, updateEthL2Balance],
    erc20: [, updateErc20L2Balance]
  } = useBalance({
    provider: l2.provider,
    walletAddress
  })

  interface ExecutedMessagesCache {
    [id: string]: boolean
  }

  const nativeCurrency = useNativeCurrency({ provider: l2.provider })

  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress
  })

  const [executedMessagesCache, setExecutedMessagesCache] =
    useLocalStorage<ExecutedMessagesCache>(
      'arbitrum:bridge:executed-messages',
      {}
    ) as [
      ExecutedMessagesCache,
      React.Dispatch<ExecutedMessagesCache>,
      React.Dispatch<void>
    ]

  const l1NetworkID = useMemo(() => String(l1.network.id), [l1.network.id])
  const l2NetworkID = useMemo(() => String(l2.network.id), [l2.network.id])

  const [transactions, { addTransaction, updateTransaction }] =
    useTransactions()

  const depositEth = async ({
    amount,
    l1Signer,
    txLifecycle
  }: {
    amount: BigNumber
    l1Signer: Signer
    txLifecycle?: L1EthDepositTransactionLifecycle
  }) => {
    if (!walletAddress) {
      return
    }

    const ethBridger = await EthBridger.fromProvider(l2.provider)
    const parentChainBlockTimestamp = (await l1.provider.getBlock('latest'))
      .timestamp

    const depositRequest = await ethBridger.getDepositRequest({
      amount,
      from: walletAddress
    })

    let tx: L1EthDepositTransaction

    try {
      const gasLimit = await l1.provider.estimateGas(depositRequest.txRequest)

      tx = await ethBridger.deposit({
        amount,
        l1Signer,
        overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
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

    addPendingTransaction({
      sender: walletAddress,
      destination: walletAddress,
      direction: 'deposit-l1',
      status: 'pending',
      createdAt: parentChainBlockTimestamp * 1_000,
      resolvedAt: null,
      txId: tx.hash,
      asset: nativeCurrency.symbol,
      assetType: AssetType.ETH,
      value: utils.formatUnits(amount, nativeCurrency.decimals),
      uniqueId: null,
      isWithdrawal: false,
      blockNum: null,
      tokenAddress: null,
      depositStatus: DepositStatus.L1_PENDING,
      parentChainId: Number(l1NetworkID),
      childChainId: Number(l2NetworkID),
      sourceChainId: Number(l1NetworkID),
      destinationChainId: Number(l2NetworkID)
    })

    addDepositToCache({
      sender: walletAddress,
      destination: walletAddress,
      status: 'pending',
      txID: tx.hash,
      assetName: nativeCurrency.symbol,
      assetType: AssetType.ETH,
      l1NetworkID,
      l2NetworkID,
      value: utils.formatUnits(amount, nativeCurrency.decimals),
      parentChainId: Number(l1NetworkID),
      childChainId: Number(l2NetworkID),
      direction: 'deposit',
      type: 'deposit-l1',
      source: 'local_storage_cache',
      timestampCreated: String(parentChainBlockTimestamp),
      nonce: tx.nonce
    })

    const receipt = await tx.wait()

    if (txLifecycle?.onTxConfirm) {
      txLifecycle.onTxConfirm(receipt)
    }

    updateEthBalances()

    if (nativeCurrency.isCustom) {
      updateErc20L1Balance([nativeCurrency.address])
    }
  }

  const withdrawEth: ArbTokenBridgeEth['withdraw'] = async ({
    amount,
    l2Signer,
    txLifecycle
  }) => {
    if (!walletAddress) {
      return
    }

    try {
      const ethBridger = await EthBridger.fromProvider(l2.provider)

      const withdrawalRequest = await ethBridger.getWithdrawalRequest({
        from: walletAddress,
        destinationAddress: walletAddress,
        amount
      })

      const gasLimit = await l2.provider.estimateGas(
        withdrawalRequest.txRequest
      )

      const tx = await ethBridger.withdraw({
        ...withdrawalRequest,
        l2Signer,
        overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(30)) }
      })

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx)
      }

      addPendingTransaction({
        sender: walletAddress,
        destination: walletAddress,
        direction: 'withdraw',
        status: WithdrawalStatus.UNCONFIRMED,
        createdAt: dayjs().valueOf(),
        resolvedAt: null,
        txId: tx.hash,
        asset: nativeCurrency.symbol,
        assetType: AssetType.ETH,
        value: utils.formatUnits(amount, nativeCurrency.decimals),
        uniqueId: null,
        isWithdrawal: true,
        blockNum: null,
        tokenAddress: null,
        parentChainId: Number(l1NetworkID),
        childChainId: Number(l2NetworkID),
        sourceChainId: Number(l2NetworkID),
        destinationChainId: Number(l1NetworkID)
      })

      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
      }

      updateEthBalances()

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
    if (!walletAddress) {
      return
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(l2.provider)

    const tx = await erc20Bridger.approveToken({
      erc20L1Address,
      l1Signer
    })

    const { symbol } = await fetchErc20Data({
      address: erc20L1Address,
      provider: l1.provider
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
    const gatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address,
      l2Provider: l2.provider
    })
    const contract = await ERC20__factory.connect(l2Address, l2Signer)
    const tx = await contract.functions.approve(gatewayAddress, MaxUint256)
    const { symbol } = await fetchErc20Data({
      address: erc20L1Address,
      provider: l1.provider
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
    if (!walletAddress) {
      return
    }
    const erc20Bridger = await Erc20Bridger.fromProvider(l2.provider)
    const parentChainBlockTimestamp = (await l1.provider.getBlock('latest'))
      .timestamp

    try {
      const { symbol, decimals } = await fetchErc20Data({
        address: erc20L1Address,
        provider: l1.provider
      })

      const depositRequest = await erc20Bridger.getDepositRequest({
        l1Provider: l1.provider,
        l2Provider: l2.provider,
        from: walletAddress,
        erc20L1Address,
        destinationAddress,
        amount,
        retryableGasOverrides: {
          // temp hardcoded value for v2.2.4
          gasLimit: { base: BigNumber.from(300_000) }
        }
      })

      const gasLimit = await l1.provider.estimateGas(depositRequest.txRequest)

      const tx = await erc20Bridger.deposit({
        ...depositRequest,
        l1Signer,
        overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
      })

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx)
      }

      addPendingTransaction({
        sender: walletAddress,
        destination: destinationAddress ?? walletAddress,
        direction: 'deposit-l1',
        status: 'pending',
        createdAt: parentChainBlockTimestamp * 1_000,
        resolvedAt: null,
        txId: tx.hash,
        asset: symbol,
        assetType: AssetType.ERC20,
        value: utils.formatUnits(amount, decimals),
        depositStatus: DepositStatus.L1_PENDING,
        uniqueId: null,
        isWithdrawal: false,
        blockNum: null,
        tokenAddress: erc20L1Address,
        parentChainId: Number(l1NetworkID),
        childChainId: Number(l2NetworkID),
        sourceChainId: Number(l1NetworkID),
        destinationChainId: Number(l2NetworkID)
      })

      addDepositToCache({
        sender: walletAddress,
        destination: destinationAddress ?? walletAddress,
        status: 'pending',
        txID: tx.hash,
        assetName: symbol,
        assetType: AssetType.ERC20,
        l1NetworkID,
        l2NetworkID,
        value: utils.formatUnits(amount, decimals),
        parentChainId: Number(l1NetworkID),
        childChainId: Number(l2NetworkID),
        direction: 'deposit',
        type: 'deposit-l1',
        source: 'local_storage_cache',
        timestampCreated: String(parentChainBlockTimestamp),
        nonce: tx.nonce
      })

      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
      }

      updateTokenData(erc20L1Address)
      updateEthBalances()

      if (nativeCurrency.isCustom) {
        updateErc20L1Balance([nativeCurrency.address])
      }

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
    destinationAddress
  }) => {
    if (!walletAddress) {
      return
    }

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
        const { symbol, decimals } = await fetchErc20Data({
          address: erc20L1Address,
          provider: l1.provider
        })

        addToken(erc20L1Address)
        return { symbol, decimals }
      })()

      const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
        from: walletAddress,
        erc20l1Address: erc20L1Address,
        destinationAddress: destinationAddress ?? walletAddress,
        amount
      })

      const gasLimit = await l2.provider.estimateGas(
        withdrawalRequest.txRequest
      )

      const tx = await erc20Bridger.withdraw({
        ...withdrawalRequest,
        l2Signer,
        overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(30)) }
      })

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx)
      }

      addPendingTransaction({
        sender: walletAddress,
        destination: destinationAddress ?? walletAddress,
        direction: 'withdraw',
        status: WithdrawalStatus.UNCONFIRMED,
        createdAt: dayjs().valueOf(),
        resolvedAt: null,
        txId: tx.hash,
        asset: symbol,
        assetType: AssetType.ERC20,
        value: utils.formatUnits(amount, decimals),
        uniqueId: null,
        isWithdrawal: true,
        blockNum: null,
        tokenAddress: erc20L1Address,
        parentChainId: Number(l1NetworkID),
        childChainId: Number(l2NetworkID),
        sourceChainId: Number(l2NetworkID),
        destinationChainId: Number(l1NetworkID)
      })

      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
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

      // USDC is not on any token list as it's unbridgeable
      // but we still want to detect its balance on user's wallet
      if (isNetwork(l2ChainID).isArbitrumOne) {
        l2Addresses.push(CommonAddress.ArbitrumOne.USDC)
      }
      if (isNetwork(l2ChainID).isArbitrumSepolia) {
        l2Addresses.push(CommonAddress.ArbitrumSepolia.USDC)
      }

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

    if (!walletAddress) {
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
    const erc20Params = { address: l1Address, provider: l1.provider }

    if (!(await isValidErc20(erc20Params))) {
      throw new Error(`${l1Address} is not a valid ERC-20 token`)
    }

    const { name, symbol, decimals } = await fetchErc20Data(erc20Params)

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
      updateUSDCBalances(l1Address)

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
    event,
    l1Signer
  }: {
    event: L2ToL1EventResultPlus
    l1Signer: Signer
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found')
    }

    if (!walletAddress) {
      return
    }

    const parentChainProvider = getProvider(event.parentChainId)
    const childChainProvider = getProvider(event.childChainId)

    const messageWriter = L2ToL1Message.fromEvent(
      l1Signer,
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
    event,
    l1Signer
  }: {
    event: L2ToL1EventResultPlus
    l1Signer: Signer
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found')
    }

    if (!walletAddress) {
      return
    }

    const parentChainProvider = getProvider(event.parentChainId)
    const childChainProvider = getProvider(event.childChainId)

    const messageWriter = L2ToL1Message.fromEvent(
      l1Signer,
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
      updateTransaction,
      addTransaction
    }
  }
}
