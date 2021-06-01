import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ContractTransaction,
  constants,
  ethers,
  utils,
  Contract,
  ContractReceipt,
  BigNumber
} from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import {
  Bridge,
  L1TokenData,
  L2ToL1EventResult,
  OutgoingMessageState
} from 'arb-ts'
import useTransactions from './useTransactions'

export interface L2ToL1EventResultPlus extends L2ToL1EventResult {
  type: AssetType
  value: BigNumber
  tokenAddress?: string
  outgoingMessageState: OutgoingMessageState
}
export interface PendingWithdrawalsMap {
  [id: string]: L2ToL1EventResultPlus
}
export interface BridgeToken {
  type: TokenType
  name: string
  symbol: string
  allowed: boolean
  address: string
  l2Address?: string
}

export interface ERC20BridgeToken extends BridgeToken {
  type: TokenType.ERC20
  decimals: number
}
const { Zero } = constants
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

export interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}
export interface BridgeBalance {
  balance: BigNumber

  arbChainBalance: BigNumber
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
  ethBalance: BigNumber
  arbBalance: BigNumber

  tokens: BigNumber[]
  /**
   *  User's NFTs on Arbitrum
   */
  arbChainTokens: BigNumber[]
  /**
   * All NFTs on Arbitrum
   */
  totalArbTokens: BigNumber[]
  /**
   * All of user's NFTs available in lockbox (ready to transfer out.)
   */
  lockBoxTokens: BigNumber[]
}

const slowInboxQueueTimeout = 1000 * 60 * 10

export const useArbTokenBridge = (
  bridge: Bridge,
  autoLoadCache = true
): any => {
  const [walletAddress, setWalletAddress] = useState('')

  const defaultBalance = {
    balance: constants.Zero,
    arbChainBalance: constants.Zero
  }

  const [ethBalances, setEthBalances] = useState<BridgeBalance>(defaultBalance)

  // inellegant, but works for now: using this state as source of truth (and calling updateBridgeTokens as needed) ensures react recognizes latest state
  const [bridgeTokens, setBridgeTokens] = useState<
    ContractStorage<BridgeToken>
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

  const defaultTokenList: string[] = [
    // kovan addresses:
    // '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25', // ARBI
    // '0xe41d965f6e7541139f8d9f331176867fb6972baf' // ARB
    // '0x57Ca11067892510E022D65b0483b31Cd49155389', // ATKN
    // '0xEe83ea3c089C36622EFc6Bf438114b62d5B4C162' // USDC
  ]

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

  const [pendingWithdrawalsMap, setPendingWithdrawalMap] = useState<
    PendingWithdrawalsMap
  >({})
  const [
    transactions,
    {
      addTransaction,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransactionStatus,
      removeTransaction,
      addFailedTransaction
    }
  ] = useTransactions()

  const [l11NetworkID, setL1NetWorkID] = useState<string | null>(null)

  const l1NetworkIDCached = useCallback(async ()=>{
    if (l11NetworkID)return l11NetworkID
      const network = await bridge.l1Bridge.l1Provider.getNetwork()
      const networkID = await network.chainId.toString()
      setL1NetWorkID(networkID)
      return networkID

  }, [l11NetworkID, bridge])

  const _depositEthPatch = async (value: BigNumber) => {
    const maxSubmissionPrice = (await bridge.getTxnSubmissionPrice(0))[0]
    const inboxAddress = await bridge.ethERC20Bridge.inbox()

    const inbox = await bridge.l1Bridge.getInbox()
    const to = await bridge.l1Bridge.l1Signer.getAddress()

    return inbox.createRetryableTicket(
      to,
      0,
      maxSubmissionPrice,
      to,
      to,
      0,
      0,
      '0x',
      {
        value: value
      }
    )
  }

  const depositEth = async (etherVal: string, usePatch = false) => {
    const weiValue: BigNumber = utils.parseEther(etherVal)
    // const tx = await _depositEthPatch(weiValue)
    const tx = usePatch
      ? await _depositEthPatch(weiValue)
      : await bridge.depositETH(weiValue)
    try {
      addTransaction({
        type: 'deposit-l1',
        status: 'pending',
        value: etherVal,
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await bridge.getWalletAddress(),
        l1NetworkID: await l1NetworkIDCached()
      })
      const receipt = await tx.wait()
      updateTransactionStatus(receipt)

      const seqNum = await bridge.getInboxSeqNumFromContractTransaction(receipt)
      if (!seqNum) return

      const l2TxHash = await bridge.calculateL2TransactionHash(seqNum[0])

      addTransaction({
        type: 'deposit-l2',
        status: 'pending',
        value: etherVal,
        txID: l2TxHash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await bridge.getWalletAddress(),
        l1NetworkID: await l1NetworkIDCached()
      })
      const l2TxnRec = await bridge.l2Provider.waitForTransaction(
        l2TxHash,
        undefined,
        slowInboxQueueTimeout
      )
      updateTransactionStatus(l2TxnRec)

      // let l2TxnRec
      // try {
      //   l2TxnRec = await bridge.l2Provider.waitForTransaction(
      //     l2TxHash,
      //     undefined,
      //     slowInboxQueueTimeout
      //   )
      //   if(l2TxnRec.status === 0){
      //     console.warn('l2TxnRec failed', l2TxnRec)
      //     updateTransactionStatus(l2TxnRec)
      //     return
      //   }
      // } catch (err){
      //   console.warn('l2TxHash timed out', err)
      //   removeTransaction(l2TxHash)
      //   addFailedTransaction(
      //     {
      //       type: 'deposit-l2-auto-redeem',
      //       status: 'failure',
      //       value: etherVal,
      //       txID: l2TxHash,
      //       assetName: 'ETH',
      //       assetType: AssetType.ETH,
      //       sender: await bridge.getWalletAddress()
      //     })
      //     return
      // }

      // const retryableRec = await bridge.l2Provider.waitForTransaction(
      //   l2TxHash,
      //   undefined,
      //   slowInboxQueueTimeout
      // )
      // // if it times out... it just errors? that's fine?
      // updateTransactionStatus(retryableRec)

      return receipt
    } catch (e) {
      console.error('depositEth err: ' + e)
      setTransactionFailure(tx.hash)
    }
  }

  const withdrawEth = useCallback(
    async (etherVal: string) => {
      const weiValue: BigNumber = utils.parseEther(etherVal)
      const tx = await bridge.withdrawETH(weiValue)
      try {
        addTransaction({
          type: 'withdraw',
          status: 'pending',
          value: etherVal,
          txID: tx.hash,
          assetName: 'ETH',
          assetType: AssetType.ETH,
          sender: await bridge.getWalletAddress(),
          blockNumber: tx.blockNumber || 0, // TODO: ensure by fetching blocknumber?,
          l1NetworkID: await l1NetworkIDCached()
        })
        const receipt = await tx.wait()

        updateTransactionStatus(receipt)

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
            outgoingMessageState
          }
          setPendingWithdrawalMap({
            ...pendingWithdrawalsMap,
            [id]: l2ToL2EventDataResultPlus
          })
        }
        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
        setTransactionFailure(tx.hash)
      }
    },
    [pendingWithdrawalsMap]
  )

  const approveToken = async (erc20L1Address: string) => {
    const tx = await bridge.approveToken(erc20L1Address)
    const tokenData = (await bridge.getAndUpdateL1TokenData(erc20L1Address))
      .ERC20
    addTransaction({
      type: 'approve',
      status: 'pending',
      value: null,
      txID: tx.hash,
      assetName: (tokenData && tokenData.symbol) || '???',
      assetType: AssetType.ERC20,
      sender: await bridge.getWalletAddress(),
      l1NetworkID: await l1NetworkIDCached()
    })

    const receipt = await tx.wait()
    updateTransactionStatus(receipt)
    updateBridgeTokens()
  }

  const depositToken = async (erc20Address: string, amount: string) => {
    const _tokenData = await bridge.getAndUpdateL1TokenData(erc20Address)
    if (!(_tokenData && _tokenData.ERC20)) {
      throw new Error('Token data not found')
    }
    const tokenData = _tokenData.ERC20
    const amountParsed = await utils.parseUnits(amount, tokenData.decimals)

    const tx = await bridge.deposit(erc20Address, amountParsed)

    addTransaction({
      type: 'deposit-l1',
      status: 'pending',
      value: amount,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: await bridge.getWalletAddress(),
      l1NetworkID: await l1NetworkIDCached()
    })
    try {
      const receipt = await tx.wait()

      updateTransactionStatus(receipt)

      const tokenDepositData = (
        await bridge.getDepositTokenEventData(receipt)
      )[0]

      const seqNum = tokenDepositData.seqNum

      const l2RetryableHash = await bridge.calculateL2RetryableTransactionHash(
        seqNum
      )
      const autoRedeemHash = await bridge.calculateRetryableAutoReedemTxnHash(
        seqNum
      )

      addTransaction({
        type: 'deposit-l2',
        status: 'pending',
        value: amount,
        txID: l2RetryableHash,
        assetName: tokenData.symbol,
        assetType: AssetType.ERC20,
        sender: await bridge.getWalletAddress(),
        l1NetworkID: await l1NetworkIDCached()
      })

      let autoRedeemHashRec
      try {
        autoRedeemHashRec = await bridge.l2Provider.waitForTransaction(
          autoRedeemHash,
          undefined,
          slowInboxQueueTimeout
        )
        console.warn('auto redeem failed')
        if (autoRedeemHashRec.status === 0) {
          removeTransaction(l2RetryableHash)
          addFailedTransaction({
            type: 'deposit-l2-auto-redeem',
            status: 'failure',
            value: amount,
            txID: autoRedeemHash,
            assetName: tokenData.symbol,
            assetType: AssetType.ERC20,
            sender: await bridge.getWalletAddress(),
            l1NetworkID: await l1NetworkIDCached()
          })
          return
        }
      } catch (err) {
        console.warn('auto redeem timed out')

        removeTransaction(l2RetryableHash)
        addFailedTransaction({
          type: 'deposit-l2-auto-redeem',
          status: 'failure',
          value: amount,
          txID: autoRedeemHash,
          assetName: tokenData.symbol,
          assetType: AssetType.ERC20,
          sender: await bridge.getWalletAddress(),
          l1NetworkID: await l1NetworkIDCached()
        })
        return
      }

      const retryableRec = await bridge.l2Provider.waitForTransaction(
        l2RetryableHash,
        undefined,
        slowInboxQueueTimeout
      )

      updateTransactionStatus(retryableRec)

      return receipt
    } catch (err) {
      setTransactionFailure(tx.hash)
    }
  }

  const withdrawToken = async (erc20l1Address: string, amount: string) => {
    const tokenData = (await bridge.getAndUpdateL1TokenData(erc20l1Address))
      .ERC20
    if (!tokenData) {
      throw new Error("Can't withdraw; token not found")
    }
    const amountParsed = utils.parseUnits(amount, tokenData.decimals)
    const tx = await bridge.withdrawERC20(erc20l1Address, amountParsed)
    addTransaction({
      type: 'withdraw',
      status: 'pending',
      value: amount,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: await bridge.getWalletAddress(),
      blockNumber: tx.blockNumber || 0,
      l1NetworkID: await l1NetworkIDCached()
    })
    try {
      const receipt = await tx.wait()
      updateTransactionStatus(receipt)

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
          value: amountParsed,
          outgoingMessageState
        }
        setPendingWithdrawalMap({
          ...pendingWithdrawalsMap,
          [id]: l2ToL2EventDataResultPlus
        })
      }

      return receipt
    } catch (err) {
      console.warn('err', err)

      setTransactionFailure(tx.hash)
    }
  }

  const addToken = useCallback(
    async (erc20L1orL2Address: string, type: TokenType = TokenType.ERC20) => {
      let l1Address = erc20L1orL2Address
      const lCaseToken = l1Address.toLocaleLowerCase()
      if (tokenBlackList.includes(lCaseToken)) {
        // todo: error report to UI
        return ''
      }
      const l1Data = await bridge.getAndUpdateL1TokenData(erc20L1orL2Address)
      try {
        await bridge.getAndUpdateL2TokenData(erc20L1orL2Address)
      } catch (error) {
        console.info(`no L2 token for ${l1Address} (which is fine)`)
      }

      if (!(l1Data && l1Data.ERC20)) {
        try {
          l1Address = (await bridge.getERC20L1Address(erc20L1orL2Address)) || ''
          if (!l1Address) {
            throw new Error('')
          }
          await bridge.getAndUpdateL1TokenData(l1Address)
          await bridge.getAndUpdateL2TokenData(l1Address)
        } catch (err) {
          console.warn('Address is not a token address ')
        }
      }
      updateAllBalances()
      updateBridgeTokens()
      if (!ERC20Cache.includes(lCaseToken)) {
        setERC20Cache([...ERC20Cache, lCaseToken])
      }
      return l1Address
    },
    [ERC20Cache, setERC20Cache]
  )

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  useEffect(() => {
    const tokensToAdd = [
      ...new Set(
        [...ERC20Cache, ...defaultTokenList].map(t => t.toLocaleLowerCase())
      )
    ].filter(tokenAddress => !tokenBlackList.includes(tokenAddress))
    if (autoLoadCache) {
      Promise.all(
        tokensToAdd.map(address => {
          return addToken(address, TokenType.ERC20).catch(err => {
            console.warn(`invalid cache entry erc20 ${address}`)
            console.warn(err)
          })
        })
      ).then(values => {
        setERC20Cache(values.filter((val): val is string => !!val))
      })
    }
    bridge.getWalletAddress().then(_address => {
      setWalletAddress(_address)
    })
  }, [])

  const updateEthBalances = async () => {
    const l1Balance = await bridge.getAndUpdateL1EthBalance()
    const l2Balance = await bridge.getAndUpdateL2EthBalance()
    setEthBalances({
      balance: l1Balance,
      arbChainBalance: l2Balance
    })
  }

  const updateTokenBalances = async () => {
    const { l1Tokens, l2Tokens } = await bridge.updateAllTokens()
    const erc20TokenBalances: ContractStorage<BridgeBalance> = {}
    for (const address of Object.keys(l1Tokens)) {
      const l1TokenData = l1Tokens[address] as L1TokenData
      const l2TokenData = l2Tokens[address]
      const balance = l1TokenData.ERC20 ? l1TokenData.ERC20.balance : Zero
      const arbChainBalance =
        l2TokenData && l2TokenData.ERC20 ? l2TokenData.ERC20.balance : Zero
      erc20TokenBalances[address] = { balance, arbChainBalance }
    }
    setErc20Balances(erc20TokenBalances)
  }

  const updateAllBalances = () => {
    updateEthBalances()
    updateTokenBalances()
  }

  const triggerOutboxToken = useCallback(
    async (id: string) => {
      if (!pendingWithdrawalsMap[id])
        throw new Error('Outbox message not found')
      const {
        batchNumber,
        indexInBatch,
        tokenAddress,
        value
      } = pendingWithdrawalsMap[id]
      const rec = await bridge.triggerL2ToL1Transaction(
        batchNumber,
        indexInBatch,
        true
      )
      const tokenData = tokenAddress && bridge.l1Tokens[tokenAddress]
      const symbol =
        (tokenData && tokenData.ERC20 && tokenData.ERC20.symbol) || '??'
      const decimals =
        (tokenData && tokenData.ERC20 && tokenData.ERC20.decimals) || 18
      if (!rec) {
        return
      }
      // TODO: add tx response transaction earlier (while actually still pending). will require callbacks or something
      addTransaction({
        status: 'pending',
        type: 'outbox',
        value: ethers.utils.formatUnits(value, decimals),
        assetName: symbol,
        assetType: AssetType.ERC20,
        sender: await bridge.getWalletAddress(),
        txID: rec.transactionHash,
        l1NetworkID: await l1NetworkIDCached()
      })

      if (rec.status === 1) {
        setTransactionConfirmed(rec.transactionHash)
        const newPendingWithdrawalsMap = { ...pendingWithdrawalsMap }
        delete newPendingWithdrawalsMap[id]
        setPendingWithdrawalMap(newPendingWithdrawalsMap)
        addToExecutedMessagesCache(batchNumber, indexInBatch)
      } else {
        setTransactionFailure(rec.transactionHash)
      }
      return rec
    },
    [pendingWithdrawalsMap]
  )

  const triggerOutboxEth = useCallback(
    async (id: string) => {
      if (!pendingWithdrawalsMap[id])
        throw new Error('Outbox message not found')
      const { batchNumber, indexInBatch, value } = pendingWithdrawalsMap[id]
      const rec = await bridge.triggerL2ToL1Transaction(
        batchNumber,
        indexInBatch,
        true
      )

      if (!rec) {
        return
      }
      // TODO: add tx response transaction earlier (while actually still pending). will require callbacks or something
      addTransaction({
        status: 'pending',
        type: 'outbox',
        value: ethers.utils.formatEther(value),
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await bridge.getWalletAddress(),
        txID: rec.transactionHash,
        l1NetworkID: await l1NetworkIDCached()
      })

      if (rec.status === 1) {
        setTransactionConfirmed(rec.transactionHash)
        const newPendingWithdrawalsMap = { ...pendingWithdrawalsMap }
        delete newPendingWithdrawalsMap[id]
        setPendingWithdrawalMap(newPendingWithdrawalsMap)
        addToExecutedMessagesCache(batchNumber, indexInBatch)
      } else {
        setTransactionFailure(rec.transactionHash)
      }
      return rec
    },
    [pendingWithdrawalsMap]
  )

  const updateBridgeTokens = useCallback(async () => {
    const bridgeTokens: ContractStorage<BridgeToken> = {}

    const { l1Tokens, l2Tokens } = bridge
    for (const address of Object.keys(l1Tokens)) {
      const l1TokenData = await bridge.getAndUpdateL1TokenData(address)
      const l2TokenData = l2Tokens[address]
      const l2Address =
        l2TokenData && l2TokenData.ERC20 && l2TokenData.ERC20.contract.address
      if (l1TokenData.ERC20) {
        const { symbol, allowed, decimals, name } = l1TokenData.ERC20
        const bridgeToken: ERC20BridgeToken = {
          type: TokenType.ERC20,
          name: name,
          symbol,
          allowed,
          decimals,
          address,
          l2Address
        }
        bridgeTokens[address] = bridgeToken
      }
    }
    setBridgeTokens(bridgeTokens)
    return bridgeTokens
  }, [bridge])

  const setInitialPendingWithdrawals = async () => {
    // Get all l2tol1 withdrawal triggers, figure out which is eth vs erc20 vs erc721, filter out the ones that have been outboxed, and
    // ...but tfw no outbox events :/
    const address = await bridge.getWalletAddress()
    const withdrawalData = await bridge.getL2ToL1EventData(address)
    const pendingWithdrawals: PendingWithdrawalsMap = {}
    const tokenWithdrawalEventData = await bridge.getTokenWithdrawEventData(
      address
    )

    for (const eventData of withdrawalData) {
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
      } = eventData
      // is an eth withdrawal
      if (!data || data === '0x') {
        const outgoingMessageState = await getOutGoingMessageState(
          batchNumber,
          indexInBatch
        )
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
          type: AssetType.ETH,
          value: callvalue,
          outgoingMessageState
        }
        pendingWithdrawals[uniqueId.toString()] = eventDataPlus
      }
    }

    for (const withdrawEventData of tokenWithdrawalEventData) {
      const rec = await bridge.getL2Transaction(withdrawEventData.txHash)
      const eventDataArr = await bridge.getWithdrawalsInL2Transaction(rec)
      if (eventDataArr.length === 1) {
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
        const outgoingMessageState = await getOutGoingMessageState(
          batchNumber,
          indexInBatch
        )
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
          value: withdrawEventData.amount,
          tokenAddress: withdrawEventData.l1Address,
          outgoingMessageState
        }
        pendingWithdrawals[uniqueId.toString()] = eventDataPlus
      } else {
        console.warn('L2toL1Data not found...')
      }
    }
    setPendingWithdrawalMap(pendingWithdrawals)

    return withdrawalData
  }

  useEffect(() => {
    setInitialPendingWithdrawals()
  }, [])

  const getOutGoingMessageState = useCallback(
    async (batchNumber: BigNumber, indexInBatch: BigNumber) => {
      if (
        executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch)]
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
      _executedMessagesCache[
        hashOutgoingMessage(batchNumber, indexInBatch)
      ] = true
      setExecutedMessagesCache(_executedMessagesCache)
    },
    [executedMessagesCache]
  )

  const hashOutgoingMessage = (
    batchNumber: BigNumber,
    indexInBatch: BigNumber
  ) => {
    return batchNumber.toString() + ',' + indexInBatch.toString()
  }

  return {
    walletAddress,
    bridgeTokens: bridgeTokens,
    getLatestArbBlock: bridge.getLatestBlock.bind(bridge),
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
      triggerOutbox: triggerOutboxEth,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      approve: approveToken,
      deposit: depositToken,
      withdraw: withdrawToken,
      triggerOutbox: triggerOutboxToken,
      updateBalances: updateTokenBalances
    },
    arbSigner: bridge.l2Signer,
    transactions: {
      transactions,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransactionStatus,
      addTransaction
    },
    pendingWithdrawalsMap: pendingWithdrawalsMap
  }
}
