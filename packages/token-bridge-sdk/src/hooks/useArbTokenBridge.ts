import { useCallback, useEffect, useState } from 'react'
import { BigNumber, constants, ethers, utils } from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import { TokenList } from '@uniswap/token-lists'
import {
  Bridge,
  L1TokenData,
  L2ToL1EventResult,
  OutgoingMessageState,
  WithdrawalInitiated,
  ERC20__factory,
} from 'arb-ts'
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
  TokenType
} from './arbTokenBridge.types'

import {
  getLatestOutboxEntryIndex,
  messageHasExecuted,
  getETHWithdrawals,
  getTokenWithdrawals as getTokenWithdrawalsGraph,
  getL2GatewayGraphLatestBlockNumber,
  getBuiltInsGraphLatestBlockNumber
} from '../util/graph'
export const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms))
}

const { Zero } = constants
/* eslint-disable no-shadow */

const slowInboxQueueTimeout = 1000 * 60 * 15

const addressToSymbol: AddressToSymbol = {}
const addressToDecimals: AddressToDecimals = {}



class TokenDisabledError extends Error {
  constructor(msg:string) {
    super(msg);
    this.name = "TokenDisabledError"; 
  }
}
export const useArbTokenBridge = (
  bridge: Bridge,
  autoLoadCache = true
): ArbTokenBridge => {
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
      addFailedTransaction
    }
  ] = useTransactions()

  const [l11NetworkID, setL1NetWorkID] = useState<string | null>(null)

  const l1NetworkIDCached = useCallback(async () => {
    if (l11NetworkID) return l11NetworkID
    const network = await bridge.l1Bridge.l1Provider.getNetwork()
    const networkID = await network.chainId.toString()
    setL1NetWorkID(networkID)
    return networkID
  }, [l11NetworkID, bridge])

  const walletAddressCached = useCallback(async () => {
    if (walletAddress) {
      return walletAddress
    } else {
      const address = await bridge.l1Bridge.getWalletAddress()
      setWalletAddress(address)
      return address
    }
  }, [walletAddress, bridge])

  const depositEth = async (weiValue: BigNumber) => {
    const etherVal = utils.formatUnits(weiValue, 18)
    const tx = await bridge.depositETH(weiValue)
    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: etherVal,
      txID: tx.hash,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: await walletAddressCached(),
      l1NetworkID: await l1NetworkIDCached()
    })
    const receipt = await tx.wait()
    const seqNums = await bridge.getInboxSeqNumFromContractTransaction(receipt)
    if (!seqNums) return
    const seqNum = seqNums[0]
    updateTransaction(receipt, tx, seqNum.toNumber())
    updateEthBalances()
  }

  const depositEthFromContract = async (weiValue: BigNumber) => {
    const etherVal = utils.formatUnits(weiValue, 18)

    const walletAddress = await walletAddressCached()
    const inbox =  await bridge.l1Bridge.getInbox()
    const maxSubmissionPrice = (
      await bridge.l2Bridge.getTxnSubmissionPrice(0)
    )[0].mul(4)
    const tx = await inbox.createRetryableTicketNoRefundAliasRewrite(
      walletAddress,
      0,
      maxSubmissionPrice,
      walletAddress,
      walletAddress,
      0,
      0,
      '',
      { value: weiValue }
    )
    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: etherVal,
      txID: tx.hash,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: walletAddress,
      l1NetworkID: await l1NetworkIDCached()
    })
    const receipt = await tx.wait()
    const seqNums = await bridge.getInboxSeqNumFromContractTransaction(receipt)
    if (!seqNums) return
    const seqNum = seqNums[0]
    updateTransaction(receipt, tx, seqNum.toNumber())
    updateEthBalances()
  }


  const withdrawEth = useCallback(
    async (weiValue: BigNumber) => {
      const etherVal = utils.formatUnits(weiValue, 18)
      const tx = await bridge.withdrawETH(weiValue)
      try {
        addTransaction({
          type: 'withdraw',
          status: 'pending',
          value: etherVal,
          txID: tx.hash,
          assetName: 'ETH',
          assetType: AssetType.ETH,
          sender: await walletAddressCached(),
          blockNumber: tx.blockNumber || 0, // TODO: ensure by fetching blocknumber?,
          l1NetworkID: await l1NetworkIDCached()
        })
        const receipt = await tx.wait()

        updateTransaction(receipt, tx)
        updateEthBalances()
        const l2ToL2EventData = await bridge.getWithdrawalsInL2Transaction(
          receipt
        )

        if (l2ToL2EventData.length === 1) {
          const l2ToL2EventDataResult = l2ToL2EventData[0]
          console.info('withdraw event data:', l2ToL2EventDataResult)

          const id = l2ToL2EventDataResult.uniqueId.toString()

          const outgoingMessageState = await getOutGoingMessageState(
            l2ToL2EventDataResult.batchNumber,
            l2ToL2EventDataResult.indexInBatch
          )
          const l2ToL2EventDataResultPlus = {
            ...l2ToL2EventDataResult,
            type: AssetType.ETH,
            value: weiValue,
            outgoingMessageState,
            symbol: 'ETH',
            decimals: 18
          }
          setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
            return {
              ...oldPendingWithdrawalsMap,
              [id]: l2ToL2EventDataResultPlus
            }
          })
        }
        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
      }
    },
    [pendingWithdrawalsMap]
  )

  const approveToken = async (erc20L1Address: string) => {
    const tx = await bridge.approveToken(erc20L1Address)
    const tokenData = await bridge.l1Bridge.getL1TokenData(erc20L1Address)
    addTransaction({
      type: 'approve',
      status: 'pending',
      value: null,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: await walletAddressCached(),
      l1NetworkID: await l1NetworkIDCached()
    })

    const receipt = await tx.wait()
    updateTransaction(receipt, tx)
    updateTokenData(erc20L1Address)
  }

  const depositToken = useCallback(
    async (erc20L1Address: string, amountRaw: BigNumber) => {
      const bridgeToken = bridgeTokens[erc20L1Address]
      const { symbol, decimals } = await (async () => {
        if (bridgeToken) {
          const { symbol, decimals } = bridgeToken
          return { symbol, decimals }
        }
        const { symbol, decimals } = await bridge.l1Bridge.getL1TokenData(
          erc20L1Address
        )
        addToken(erc20L1Address)
        return { symbol, decimals }
      })()
      const amountReadable = await utils.formatUnits(amountRaw, decimals)

      const tx = await bridge.deposit({
        erc20L1Address: erc20L1Address,
        amount: amountRaw
      })

      addTransaction({
        type: 'deposit-l1',
        status: 'pending',
        value: amountReadable,
        txID: tx.hash,
        assetName: symbol,
        assetType: AssetType.ERC20,
        sender: await walletAddressCached(),
        l1NetworkID: await l1NetworkIDCached()
      })
      try {
        const receipt = await tx.wait()
        const seqNums = await bridge.getInboxSeqNumFromContractTransaction(
          receipt
        )
        if (!seqNums) throw new Error('No sequence number detected')
        const seqNum = seqNums[0].toNumber()
        updateTransaction(receipt, tx, seqNum)
        updateTokenData(erc20L1Address)
        return receipt
      } catch (err) {
        console.warn('deposit token failure', err)
        throw err
      }
    },
    [bridge, bridgeTokens]
  )

  const withdrawToken = useCallback(
    async (erc20l1Address: string, amountRaw: BigNumber) => {
      const bridgeToken = bridgeTokens[erc20l1Address]
      const { symbol, decimals } = await (async () => {
        if (bridgeToken) {
          const { symbol, decimals } = bridgeToken
          return { symbol, decimals }
        }
        const { symbol, decimals } = await bridge.l1Bridge.getL1TokenData(
          erc20l1Address
        )
        addToken(erc20l1Address)
        return { symbol, decimals }
      })()
      const amountReadable = await utils.formatUnits(amountRaw, decimals)

      const tx = await bridge.withdrawERC20(erc20l1Address, amountRaw)
      addTransaction({
        type: 'withdraw',
        status: 'pending',
        value: amountReadable,
        txID: tx.hash,
        assetName: symbol,
        assetType: AssetType.ERC20,
        sender: await bridge.l2Bridge.getWalletAddress(),
        blockNumber: tx.blockNumber || 0,
        l1NetworkID: await l1NetworkIDCached()
      })
      try {
        const receipt = await tx.wait()
        updateTransaction(receipt, tx)

        const l2ToL2EventData = await bridge.getWithdrawalsInL2Transaction(
          receipt
        )
        if (l2ToL2EventData.length === 1) {
          const l2ToL2EventDataResult = l2ToL2EventData[0]
          const id = l2ToL2EventDataResult.uniqueId.toString()
          const outgoingMessageState = await getOutGoingMessageState(
            l2ToL2EventDataResult.batchNumber,
            l2ToL2EventDataResult.indexInBatch
          )
          const l2ToL2EventDataResultPlus = {
            ...l2ToL2EventDataResult,
            type: AssetType.ERC20,
            tokenAddress: erc20l1Address,
            value: amountRaw,
            outgoingMessageState,
            symbol: symbol,
            decimals: decimals
          }

          setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
            return {
              ...oldPendingWithdrawalsMap,
              [id]: l2ToL2EventDataResultPlus
            }
          })
        }
        updateTokenData(erc20l1Address)
        return receipt
      } catch (err) {
        console.warn('withdraw token err', err)
      }
    },
    [bridge, bridgeTokens]
  )

  const removeTokensFromList =  (listID: number)=>{
    setBridgeTokens((prevBridgeTokens)=>{
      const newBridgeTokens = {...prevBridgeTokens}
      for ( let address in bridgeTokens) {
        const token = bridgeTokens[address]
        if(!token) continue
        if(token.listID === listID){
          delete newBridgeTokens[address]
        }
    }
     return newBridgeTokens
    })
  }
  
  const addTokensFromList = async (arbTokenList: TokenList, listID?: number) => {
    const { l1Bridge: { network: { chainID: l1ChainIStr } }, l2Bridge: { network: { chainID: l2ChainIDStr } }  } = bridge

    const l1ChainID = + l1ChainIStr
    const l2ChainID = + l2ChainIDStr


    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}
    for (const tokenData of arbTokenList.tokens) {
      const {
        address,
        name,
        symbol,
        extensions,
        decimals,
        logoURI,
        chainId
      } = tokenData

      if(![l1ChainID, l2ChainID].includes(chainId)){
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
        if (!isExtensions(extensions)){
          return null
        } else {
          return extensions.bridgeInfo
        }
      })()

      if(bridgeInfo){
        const l1Address = bridgeInfo[await l1NetworkIDCached()].tokenAddress

        bridgeTokensToAdd[l1Address] = {
          name,
          type: TokenType.ERC20,
          symbol,
          allowed: false,
          address: l1Address,
          l2Address: address,
          decimals,
          logoURI,
          listID
        }
      }
      // unbridged L1 token:
      // stopgap: giant lists (i.e., CMC list) currently severaly hurts page performace, so for now we only add the bridged tokens
      else if (arbTokenList.tokens.length < 1000) {
      
        const l1Address = address
        bridgeTokensToAdd[l1Address] = {
          name,
          type: TokenType.ERC20,
          symbol,
          allowed: false,
          address: l1Address,
          decimals,
          logoURI,
          listID
        }
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

  const addToken = useCallback(
    async (erc20L1orL2Address: string) => {
      let l1Address: string
      let l2Address: string | undefined
      let l1TokenBalance: BigNumber | null  = null
      let l2TokenBalance: BigNumber | null = null

      const maybeL1Address = await bridge.getERC20L1Address(erc20L1orL2Address)
      if (maybeL1Address) {
        // looks like l2 address was provided
        l1Address = maybeL1Address
        l2Address = erc20L1orL2Address
      } else {
        // looks like l1 address was provided
        l1Address = erc20L1orL2Address
        l2Address = await bridge.getERC20L2Address(l1Address)
      }
      const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {}

      const l1Data = await bridge.l1Bridge.getL1TokenData(l1Address)
      const { symbol, allowed, contract, balance } = l1Data
      l1TokenBalance = balance
      const name = await contract.name()
      const decimals = await contract.decimals()
      try {
        // check if token is deployed at l2 address; if not this will throw
        console.warn('L2 address', l2Address);
        
        const { balance } = await bridge.l2Bridge.getL2TokenData(l2Address)
        l2TokenBalance = balance
      } catch (error) {
        console.info(`no L2 token for ${l1Address} (which is fine)`)

        l2Address = undefined
      }

      const isDisabled = await bridge.l1Bridge.tokenIsDisabled(l1Address)
      if(isDisabled){
         throw new TokenDisabledError("Token currently disabled")
      }

      bridgeTokensToAdd[l1Address] = {
        name,
        type: TokenType.ERC20,
        symbol,
        allowed,
        address: l1Address,
        l2Address,
        decimals
      }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...bridgeTokensToAdd }
      })
      setErc20Balances(oldBridgeBalances => {
        const newBal = {
          [l1Address]:{
            balance: l1TokenBalance,
            arbChainBalance: l2TokenBalance
          }
        }
        return { ...oldBridgeBalances, ...newBal }
      })
      return l1Address
    },
    [ERC20Cache, setERC20Cache, bridgeTokens]
  )

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
    bridge.l1Bridge.getWalletAddress().then(_address => {
      setWalletAddress(_address)
    })
  }, [])

  const updateEthBalances = async () => {
    const l1Balance = await bridge.getL1EthBalance()
    const l2Balance = await bridge.getL2EthBalance()
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
      const l1Data = await bridge.l1Bridge.getL1TokenData(l1Address)
      const l2Data =
        (l2Address && (await bridge.l2Bridge.getL2TokenData(l2Address))) ||
        undefined
      const erc20TokenBalance: BridgeBalance = {
        balance: l1Data.balance,
        arbChainBalance: l2Data?.balance || Zero
      }

      setErc20Balances(oldErc20Balances => ({
        ...oldErc20Balances,
        [l1Address]: erc20TokenBalance
      }))
      bridgeToken.allowed = l1Data.allowed
      const newBridgeTokens = { [l1Address]: bridgeToken }
      setBridgeTokens(oldBridgeTokens => {
        return { ...oldBridgeTokens, ...newBridgeTokens }
      })
    },
    [setErc20Balances, bridgeTokens, setBridgeTokens]
  )


  const updateTokenBalances = async (bridgeTokens:ContractStorage<BridgeToken>)=>{
    
    const walletAddress = await walletAddressCached()

    const l1Addresses  = Object.keys(bridgeTokens)
    
    const l2Addresses = l1Addresses.map((l1Address)=>{
      return (bridgeTokens[l1Address] as ERC20BridgeToken).l2Address
    }).filter((val): val is string => !!val)

    const l1Balances = await bridge.getTokenBalanceBatch(walletAddress, l1Addresses, 'L1')
    const l2Balances = await bridge.getTokenBalanceBatch(walletAddress, l2Addresses, 'L2')

    const l2AddressToBalanceMap: {
      [l2Address: string]: BigNumber | undefined
    } = l2Balances.reduce((acc, l1Address)=>{
        const { tokenAddr, balance } = l1Address
        return {...acc, [tokenAddr]: balance}
    },{})

    setErc20Balances((oldERC20Balances)=>{
      const newERC20Balances: ContractStorage<BridgeBalance> = l1Balances.reduce((acc, {tokenAddr: l1TokenAddress, balance: l1Balance})=>{
      const l2Address = (bridgeTokens[l1TokenAddress] as ERC20BridgeToken).l2Address

        return {...acc, [l1TokenAddress]:{
          balance: l1Balance,
          arbChainBalance: l2Address ?  l2AddressToBalanceMap[l2Address]: undefined
        } }
      }, {})

      return {...oldERC20Balances, ...newERC20Balances}
    })
  }

  const triggerOutboxToken = useCallback(
    async (id: string) => {
      if (!pendingWithdrawalsMap[id])
        throw new Error('Outbox message not found')
      const { batchNumber, indexInBatch, tokenAddress, value } =
        pendingWithdrawalsMap[id]
      const res = await bridge.triggerL2ToL1Transaction(
        batchNumber,
        indexInBatch,
        true
      )

      const tokenData = await bridge.l1Bridge.getL1TokenData(
        tokenAddress as string
      )
      const symbol = tokenData.symbol
      const decimals = tokenData.decimals

      addTransaction({
        status: 'pending',
        type: 'outbox',
        value: ethers.utils.formatUnits(value, decimals),
        assetName: symbol,
        assetType: AssetType.ERC20,
        sender: await walletAddressCached(),
        txID: res.hash,
        l1NetworkID: await l1NetworkIDCached()
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
    },
    [pendingWithdrawalsMap]
  )

  const triggerOutboxEth = useCallback(
    async (id: string) => {
      if (!pendingWithdrawalsMap[id])
        throw new Error('Outbox message not found')
      const { batchNumber, indexInBatch, value } = pendingWithdrawalsMap[id]
      const res = await bridge.triggerL2ToL1Transaction(
        batchNumber,
        indexInBatch,
        true
      )

      addTransaction({
        status: 'pending',
        type: 'outbox',
        value: ethers.utils.formatEther(value),
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await walletAddressCached(),
        txID: res.hash,
        l1NetworkID: await l1NetworkIDCached()
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
    },
    [pendingWithdrawalsMap]
  )

  const getTokenSymbol = async (_l1Address: string) => {
    const l1Address = _l1Address.toLocaleLowerCase()
    if (addressToSymbol[l1Address]) {
      return addressToSymbol[l1Address]
    }
    try {
      const token = ERC20__factory.connect(l1Address, bridge.l1Provider)
      const symbol = await token.symbol()
      addressToSymbol[l1Address] = symbol
      return symbol
    } catch (err) {
      console.warn('could not get token symbol', err)
      return '???'
    }
  }
  const getTokenDecimals = async (_l1Address: string) => {
    const l1Address = _l1Address.toLocaleLowerCase()
    const dec = addressToDecimals[l1Address]
    if (dec) {
      return dec
    }
    try {
      const token = ERC20__factory.connect(l1Address, bridge.l1Provider)
      const decimals = await token.decimals()
      addressToDecimals[l1Address] = decimals
      return decimals
    } catch (err) {
      console.warn('could not get token decimals', err)
      return 18
    }
  }

  const getEthWithdrawalsV2 = async (filter?: ethers.providers.Filter) => {
    const networkID = await l1NetworkIDCached()
    const address = await walletAddressCached()
    const startBlock =
      (filter && filter.fromBlock && +filter.fromBlock.toString()) || 0

    const latestGraphBlockNumber = await getBuiltInsGraphLatestBlockNumber(
      networkID
    )
    const pivotBlock = Math.max(latestGraphBlockNumber, startBlock)

    console.log(
      `*** L2 gateway graph block number: ${latestGraphBlockNumber} ***`
    )

    const oldEthWithdrawalEventData = await getETHWithdrawals(
      address,
      startBlock,
      pivotBlock,
      networkID
    )
    const recentETHWithdrawalData = await bridge.getL2ToL1EventData(address, {
      fromBlock: pivotBlock
    })
    const ethWithdrawalEventData = oldEthWithdrawalEventData.concat(
      recentETHWithdrawalData
    )
    const lastOutboxEntryIndexDec = await getLatestOutboxEntryIndex(networkID)

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
          : await getOutGoingMessageStateV2(batchNumber, indexInBatch)

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
    filter?: ethers.providers.Filter
  ) => {
    const address = await walletAddressCached()
    const l1NetworkID = await l1NetworkIDCached()

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
        return getOutGoingMessageState(batchNumber, indexInBatch)
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

    const t = new Date().getTime()

    return oldTokenWithdrawals.concat(recentTokenWithdrawals)
  }

  const getTokenWithdrawals = async (
    gatewayAddresses: string[],
    filter?: ethers.providers.Filter
  ) => {
    const address = await walletAddressCached()
    const t = new Date().getTime()

    const gateWayWithdrawalsResultsNested = await Promise.all(
      gatewayAddresses.map(gatewayAddress =>
        bridge.getGatewayWithdrawEventData(gatewayAddress, address, filter)
      )
    )
    console.log(
      `*** got token gateway event data in ${
        (new Date().getTime() - t) / 1000
      } seconds *** `
    )

    const gateWayWithdrawalsResults = gateWayWithdrawalsResultsNested.flat()
    const symbols = await Promise.all(
      gateWayWithdrawalsResults.map(withdrawEventData =>
        getTokenSymbol(withdrawEventData.l1Token)
      )
    )
    const decimals = await Promise.all(
      gateWayWithdrawalsResults.map(withdrawEventData =>
        getTokenDecimals(withdrawEventData.l1Token)
      )
    )

    const l2Txns = await Promise.all(
      gateWayWithdrawalsResults.map(withdrawEventData =>
        bridge.getL2Transaction(withdrawEventData.txHash)
      )
    )

    const outgoingMessageStates = await Promise.all(
      gateWayWithdrawalsResults.map((withdrawEventData, i) => {
        const eventDataArr = bridge.getWithdrawalsInL2Transaction(l2Txns[i])
        // TODO: length != 1
        const { batchNumber, indexInBatch } = eventDataArr[0]
        return getOutGoingMessageState(batchNumber, indexInBatch)
      })
    )
    return gateWayWithdrawalsResults.map(
      (withdrawEventData: WithdrawalInitiated, i) => {
        // TODO: length != 1
        const eventDataArr = bridge.getWithdrawalsInL2Transaction(l2Txns[i])
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
        } = eventDataArr[0]

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

  const setInitialPendingWithdrawals = async (
    gatewayAddresses: string[],
    filter?: ethers.providers.Filter
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

    for (const l2ToL1Thing of l2ToL1Txns) {
      pendingWithdrawals[l2ToL1Thing.uniqueId.toString()] = l2ToL1Thing
    }
    setPendingWithdrawalMap(pendingWithdrawals)
    return
  }

  // call after we've confirmed the outbox entry has been created
  const getOutGoingMessageStateV2 = useCallback(
    async (batchNumber: BigNumber, indexInBatch: BigNumber) => {
      const l1NetworkID = await l1NetworkIDCached()
      if (
        executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)]
      ) {
        return OutgoingMessageState.EXECUTED
      } else {
        const proofData = await bridge.tryGetProofOnce(
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
    },
    [executedMessagesCache]
  )

  const getOutGoingMessageState = useCallback(
    async (batchNumber: BigNumber, indexInBatch: BigNumber) => {
      const l1NetworkID = await l1NetworkIDCached()
      if (
        executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)]
      ) {
        return OutgoingMessageState.EXECUTED
      } else {
        return bridge.getOutGoingMessageState(batchNumber, indexInBatch)
      }
    },
    [executedMessagesCache]
  )

  const addToExecutedMessagesCache = useCallback(
    (batchNumber: BigNumber, indexInBatch: BigNumber) => {
      const _executedMessagesCache = { ...executedMessagesCache }
      l1NetworkIDCached().then((l1NetworkID: string)=>{
        _executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch, l1NetworkID)] = true
        setExecutedMessagesCache(_executedMessagesCache)
      })
    },
    [executedMessagesCache]
  )

  const hashOutgoingMessage = (
    batchNumber: BigNumber,
    indexInBatch: BigNumber,
    l1NetworkID: string
  ) => {
    return `${batchNumber.toString()},${indexInBatch.toString()},${l1NetworkID}`
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
      depositFromContract: depositEthFromContract,
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
      triggerOutbox: triggerOutboxToken
    },
    arbSigner: bridge.l2Bridge.l2Signer,
    transactions: {
      transactions,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      addTransaction,
      addTransactions
    },
    pendingWithdrawalsMap: pendingWithdrawalsMap,
    setInitialPendingWithdrawals: setInitialPendingWithdrawals
  }
}
