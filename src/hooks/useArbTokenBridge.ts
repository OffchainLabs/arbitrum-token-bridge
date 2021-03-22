

import { useEffect, useState, useMemo, useCallback } from 'react'
import { ContractTransaction, constants, ethers, utils, Contract, ContractReceipt, BigNumber  } from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import { Bridge, L1TokenData, L2ToL1EventResult } from 'arb-ts'
import useTransactions from './useTransactions'
import { ERC20 } from 'arb-ts/dist/lib/abi/ERC20'


export interface L2ToL1EventResultPlus extends L2ToL1EventResult{
  type: AssetType,
  value: BigNumber,
  tokenAddress?: string
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
const  { Zero }  = constants
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


export const useArbTokenBridge = (
  bridge: Bridge,
  autoLoadCache = true
):any => {
  const [walletAddress, setWalletAddress] = useState("")

  const defaultBalance = {
    balance: constants.Zero,
    arbChainBalance: constants.Zero
  }

  const [ethBalances, setEthBalances] = useState<BridgeBalance>(defaultBalance)

  // inellegant, but works for now: using this state as source of truth (and calling updateBridgeTokens as needed) ensures react recognizes latest state
  const [bridgeTokens, setBridgeTokens ] = useState<ContractStorage<BridgeToken>>({})

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
    '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25', // ARBI
    '0xe41d965f6e7541139f8d9f331176867fb6972baf', // ARB
    // '0x57Ca11067892510E022D65b0483b31Cd49155389', // ATKN
    // '0xEe83ea3c089C36622EFc6Bf438114b62d5B4C162' // USDC
  ]
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


  const [ pendingWithdrawalsMap, setPendingWithdrawalMap ] = useState<PendingWithdrawalsMap>({})
  const [
    transactions,
    {
      addTransaction,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransactionStatus
    }
  ] = useTransactions()

  const depositEth =  async (etherVal: string) => {
    const weiValue:BigNumber = utils.parseEther(etherVal)
    const tx = await bridge.depositETH(weiValue)
    try {
      addTransaction({
        type: 'deposit',
        status: 'pending',
        value: etherVal,
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: await bridge.getWalletAddress()
      })
      const receipt = await tx.wait()
      updateTransactionStatus(receipt)
      return receipt
    } catch (e) {
      console.error('depositEth err: ' + e)
      setTransactionFailure(tx.hash)
    }
  }


  const withdrawEth =  useCallback(  async (etherVal: string) => {

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
        blockNumber: tx.blockNumber || 0 // TODO: ensure by fetching blocknumber?
      })
      const receipt = await tx.wait()

      updateTransactionStatus(receipt)

      const l2ToL2EventData = await bridge.getWithdrawalsInL2Transaction(receipt)

      if(l2ToL2EventData.length === 1){
        const l2ToL2EventDataResult = l2ToL2EventData[0]
        console.info('withdraw event data:',l2ToL2EventDataResult );

        const id = l2ToL2EventDataResult.uniqueId.toString()

        const l2ToL2EventDataResultPlus = {...l2ToL2EventDataResult, type: AssetType.ETH,  value: weiValue }
        // setPendingWithdrawalIdsCache([...pendingWithdrawalIdsCache, ...[id]])
        setPendingWithdrawalMap({...pendingWithdrawalsMap, [id]: l2ToL2EventDataResultPlus })
      }
      return receipt
    } catch (e) {
      console.error('withdrawEth err', e)
      setTransactionFailure(tx.hash)
    }
  }, [ pendingWithdrawalsMap])



  const approveToken =  async  (erc20L1Address: string) =>{
      const tx = await bridge.approveToken(erc20L1Address)
      const tokenData = (await bridge.getAndUpdateL1TokenData(erc20L1Address)).ERC20
      addTransaction({
        type: 'approve',
        status: 'pending',
        value: null,
        txID: tx.hash,
        assetName: tokenData && tokenData.symbol || "???",
        assetType: AssetType.ERC20,
        sender: await bridge.getWalletAddress()
      })

      const receipt = await tx.wait()
      updateTransactionStatus(receipt)
      updateBridgeTokens()
  }


  const depositToken = async (erc20Address: string, amount: string)=>{
    const _tokenData = (await bridge.getAndUpdateL1TokenData(erc20Address))
    if (!(_tokenData && _tokenData.ERC20) ){
      throw new Error("Token data not found")
    }
    const tokenData = _tokenData.ERC20
    const amountParsed = await utils.parseUnits(amount, tokenData.decimals)

    const tx = await bridge.depositAsERC20(erc20Address, amountParsed, BigNumber.from(100000000000), BigNumber.from(0) )

    addTransaction({
      type: 'deposit',
      status: 'pending',
      value: amount,
      txID: tx.hash,
      assetName: tokenData.symbol,
      assetType: AssetType.ERC20,
      sender: await bridge.getWalletAddress()
    })
    try {
      const receipt = await tx.wait()
      updateTransactionStatus(receipt)
      return receipt
    } catch (err) {
      setTransactionFailure(tx.hash)
    }
  }

  const withdrawToken = async (erc20l1Address: string, amount: string)=>{
    const tokenData = (await bridge.getAndUpdateL1TokenData(erc20l1Address)).ERC20
    if (!tokenData){
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
      blockNumber: tx.blockNumber || 0
    })
    try {
      const receipt = await tx.wait()
      updateTransactionStatus(receipt)


      const l2ToL2EventData = await bridge.getWithdrawalsInL2Transaction(receipt)
      if(l2ToL2EventData.length === 1){
        const l2ToL2EventDataResult = l2ToL2EventData[0]
        const id = l2ToL2EventDataResult.uniqueId.toString()

        const l2ToL2EventDataResultPlus = {...l2ToL2EventDataResult, type: AssetType.ERC20, tokenAddress: erc20l1Address,  value: amountParsed }
        setPendingWithdrawalMap({...pendingWithdrawalsMap, [id]: l2ToL2EventDataResultPlus})
      }

      return receipt
    } catch (err) {
      console.warn('err', err)

      setTransactionFailure(tx.hash)
    }
  }

  const addToken = async (erc20L1orL2Address: string, type: TokenType = TokenType.ERC20)=>{
    let l1Address = erc20L1orL2Address
    const l1Data = await bridge.getAndUpdateL1TokenData(erc20L1orL2Address)
    try {
      await bridge.getAndUpdateL2TokenData(erc20L1orL2Address)
    } catch (error) {
      console.info(`no L2 token for ${l1Address} (which is fine)`);

    }

    if (!(l1Data && l1Data.ERC20)){
      try {
        l1Address = await bridge.getERC20L1Address(erc20L1orL2Address) || ""
        if (!(l1Address)){
          throw new Error("")
        }
        await bridge.getAndUpdateL1TokenData(l1Address)
        await bridge.getAndUpdateL2TokenData(l1Address)
      } catch(err){
        console.warn('Address is not a token address ');

      }
    }
    updateAllBalances()
    updateBridgeTokens()
    return l1Address
  }

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  useEffect(() => {
      const tokensToAdd = [
        ...new Set(
          [...ERC20Cache, ...defaultTokenList].map(t => t.toLocaleLowerCase())
        )
      ]
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
    bridge.getWalletAddress().then((_address)=>{
      setWalletAddress(_address)
    })
  }, [])

  const updateEthBalances = async  ()=>{
    const l1Balance = await  bridge.getAndUpdateL1EthBalance()
    const l2Balance = await bridge.getAndUpdateL2EthBalance()
    setEthBalances({
      balance: l1Balance,
      arbChainBalance: l2Balance
    })
  }

  const updateTokenBalances = async ()=>{
    const { l1Tokens, l2Tokens } = await bridge.updateAllTokens()
    const erc20TokenBalances: ContractStorage<BridgeBalance> = {}
    for (let address of Object.keys(l1Tokens)) {
      const l1TokenData = l1Tokens[address] as L1TokenData
      const l2TokenData = l2Tokens[address]
      const balance =  l1TokenData.ERC20 ? l1TokenData.ERC20.balance : Zero
      const arbChainBalance = (l2TokenData && l2TokenData.ERC20) ? l2TokenData.ERC20.balance : Zero
             // @ts-ignore
      erc20TokenBalances[address] =  { balance, arbChainBalance }

    }
    setErc20Balances(erc20TokenBalances)
  }

  const updateAllBalances = ()=>{
    updateEthBalances()
    updateTokenBalances()
  }

  const triggerOutboxToken = useCallback (async (id: string)=>{
    if(!pendingWithdrawalsMap[id]) throw new Error("Outbox message not found")
    const { batchNumber, indexInBatch, tokenAddress, value  } = pendingWithdrawalsMap[id]
    const rec = await bridge.triggerL2ToL1Transaction(batchNumber, indexInBatch, true )
    const tokenData = tokenAddress && bridge.l1Tokens[tokenAddress]
    const symbol = tokenData && tokenData.ERC20 && tokenData.ERC20.symbol || "??"
    const decimals = tokenData && tokenData.ERC20 && tokenData.ERC20.decimals || 18
    if (!rec){
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
      txID: rec.transactionHash
    })

    if(rec.status === 1){
      setTransactionConfirmed(rec.transactionHash)
      const newPendingWithdrawalsMap = {...pendingWithdrawalsMap}
      delete newPendingWithdrawalsMap[id];
      setPendingWithdrawalMap(newPendingWithdrawalsMap)
    } else {
      setTransactionFailure(rec.transactionHash)
    }
    return rec



  }, [pendingWithdrawalsMap])

  const triggerOutboxEth = useCallback (async (id: string)=>{
    if(!pendingWithdrawalsMap[id]) throw new Error("Outbox message not found")
    const { batchNumber, indexInBatch, value  } = pendingWithdrawalsMap[id]
    const rec = await bridge.triggerL2ToL1Transaction(batchNumber, indexInBatch, true )

    if (!rec){
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
      txID: rec.transactionHash
    })

    if(rec.status === 1){
      setTransactionConfirmed(rec.transactionHash)
      const newPendingWithdrawalsMap = {...pendingWithdrawalsMap}
      delete newPendingWithdrawalsMap[id];
      setPendingWithdrawalMap(newPendingWithdrawalsMap)
    } else {
      setTransactionFailure(rec.transactionHash)
    }
    return rec

  }, [pendingWithdrawalsMap])


  const updateBridgeTokens = useCallback(async ()=>{
    let bridgeTokens:ContractStorage<BridgeToken> = {}

    const { l1Tokens, l2Tokens } = bridge
    for (let address of Object.keys(l1Tokens)) {
      const l1TokenData = await bridge.getAndUpdateL1TokenData(address)
      const l2TokenData = l2Tokens[address]
      const l2Address = l2TokenData && l2TokenData.ERC20 && l2TokenData.ERC20.contract.address
      if (l1TokenData.ERC20){
        const { symbol, allowed, decimals, name} = l1TokenData.ERC20
        const bridgeToken:ERC20BridgeToken = {
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

  const setInitialPendingWithdrawals = async ()=>{
    // Get all l2tol1 withdrawal triggers, figure out which is eth vs erc20 vs erc721, filter out the ones that have been outboxed, and
    // ...but tfw no outbox events :/
    const address  = await bridge.getWalletAddress()
    const withdrawalData = await bridge.getL2ToL1EventData(address)
    const pendingWithdrawals:PendingWithdrawalsMap = {};
    const tokenWithdrawalEventData = await bridge.getTokenWithdrawEventData(address)
    const tokenWithdrawalEventDataMap: any = tokenWithdrawalEventData.reduce((acc:any, data:any)=>{
      return {...acc, [data.id.toString()]: 'x'}
    }, {})
    for (let eventData of  withdrawalData ) {
        const { caller, destination, uniqueId, batchNumber, indexInBatch, arbBlockNum, ethBlockNum, timestamp, callvalue, data }  = eventData
        // is an eth withdrawal
        if(!data || data === "0x"){
          const eventDataPlus: L2ToL1EventResultPlus = {
            caller, destination, uniqueId, batchNumber, indexInBatch, arbBlockNum, ethBlockNum, timestamp, callvalue, data,
            type: AssetType.ETH,
            value: callvalue
          }
          pendingWithdrawals[uniqueId.toString()] = eventDataPlus;

        }  else if (tokenWithdrawalEventDataMap[uniqueId.toString()]){
          const withdrawData = tokenWithdrawalEventDataMap[uniqueId.toString()]
          const eventDataPlus: L2ToL1EventResultPlus = {
            caller, destination, uniqueId, batchNumber, indexInBatch, arbBlockNum, ethBlockNum, timestamp, callvalue, data,
            type: AssetType.ERC20,
            value: withdrawData.amount,
            tokenAddress:  withdrawData.l1Address,
          }
          pendingWithdrawals[uniqueId.toString()] = eventDataPlus;
        }

    }
    setPendingWithdrawalMap(pendingWithdrawals)

    return withdrawalData


  }

  useEffect(()=>{
    setInitialPendingWithdrawals()
  }, [])


  return {
    walletAddress,
    bridgeTokens: bridgeTokens,
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
