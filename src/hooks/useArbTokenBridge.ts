import { useCallback, useEffect, useState } from 'react'
import { ContractTransaction, constants, ethers, utils } from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import { ArbERC20 } from 'arb-provider-ethers/dist/lib/abi/ArbERC20'
import { ArbERC721 } from 'arb-provider-ethers/dist/lib/abi/ArbERC721'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { ArbERC721Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC721Factory'
import { ContractReceipt } from 'ethers/contract'
import {
  ERC20,
  ERC721,
  ERC20Factory,
  ERC721Factory,
  assertNever
} from '../util'
import { useArbProvider } from './useArbProvider'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEquals = require('lodash.isequal')

/* eslint-disable no-shadow */
enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721'
}
/* eslint-enable no-shadow */

interface BridgedToken {
  type: TokenType
  arb: ArbERC20 | ArbERC721
  eth: ERC20 | ERC721
  symbol: string
  allowed: boolean
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: ArbERC20
  eth: ERC20
  units: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: ArbERC721
  eth: ERC721
}

type BridgeToken = ERC20BridgeToken | ERC721BridgeToken

interface ContractStorage<T> {
  [contractAddress: string]: T | undefined
}

export interface BridgeBalance {
  balance: utils.BigNumber
  arbChainBalance: utils.BigNumber
  totalArbBalance: utils.BigNumber
  lockBoxBalance: utils.BigNumber
}

// removing 'tokens' / 'balance' could result in one interface
export interface ERC721Balance {
  tokens: utils.BigNumber[]
  arbChainTokens: utils.BigNumber[]
  totalArbTokens: utils.BigNumber[]
  lockBoxTokens: utils.BigNumber[]
}

interface BridgeConfig {
  vmId: string
  walletAddress: string
}

// interface ArbTokenBridge { }

// may be worthwhile to separate state from token bridge fn
// should there be a 'ready' property? this would make checks simpler int + ext
// store inbox mgr in state?
// TODO error handling promises with try catch
// TODO update balance after certain queries
// TODO more control & details about approvals
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex = 0
) => {
  const [tokenContracts, setTokenContracts] = useState<
    ContractStorage<BridgeToken>
  >({})

  const [ethBalances, setEthBalances] = useState<BridgeBalance>({
    balance: constants.Zero,
    arbChainBalance: constants.Zero,
    totalArbBalance: constants.Zero,
    lockBoxBalance: constants.Zero
  })
  const [erc20Balances, setErc20Balances] = useState<
    ContractStorage<BridgeBalance>
  >({})
  const [erc721Balances, setErc721Balances] = useState<
    ContractStorage<ERC721Balance>
  >({})

  // TODO load all contracts - in useEffect or on select?
  // use local storage for list of token addresses
  const [ERC20Cache, setERC20Cache] = useLocalStorage<string[]>(
    'ERC20Cache',
    []
  )
  const [ERC721Cache, setERC721Cache] = useLocalStorage<string[]>(
    'ERC721Cache',
    []
  )

  const [{ walletAddress, vmId }, setConfig] = useState<BridgeConfig>({
    walletAddress: '',
    vmId: ''
  })

  const arbProvider = useArbProvider(validatorUrl, ethProvider)
  const arbWallet = arbProvider?.getSigner(walletIndex)

  /*
  ETH METHODS:
  */
  const updateEthBalances = useCallback(async () => {
    if (!arbProvider || !vmId || !walletAddress)
      throw new Error('updateEthBalances no arb provider')

    const inboxManager = await arbProvider.globalInboxConn()
    const ethWallet = arbProvider.provider.getSigner(walletIndex)

    const ethBalanceWei = await ethWallet.getBalance()
    const arbChainEthBalanceWei = await inboxManager.getEthBalance(vmId)
    const lockBoxBalanceWei = await inboxManager.getEthBalance(walletAddress)
    const arbEthBalanceWei = await arbProvider.getBalance(walletAddress)

    const update: typeof ethBalances = {
      balance: ethBalanceWei,
      arbChainBalance: arbEthBalanceWei,
      lockBoxBalance: lockBoxBalanceWei,
      totalArbBalance: arbChainEthBalanceWei
    }

    let different = true
    for (const key in ethBalances) {
      const k = key as keyof typeof ethBalances
      different = ethBalances[k] !== update[k]
    }

    if (!deepEquals(ethBalances, update)) {
      // if (different) {
      setEthBalances(update)
    }
  }, [arbProvider, ethBalances, vmId, walletAddress, walletIndex])

  const depositEth = useCallback(
    async (ethValue: string) => {
      if (!arbWallet || !walletAddress)
        throw new Error('depositEth no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(ethValue)
      try {
        const tx = await arbWallet.depositETH(walletAddress, weiValue)
        await tx.wait()
        await updateEthBalances()
      } catch (e) {
        console.error('depositEth err: ' + e)
      }
    },
    [arbWallet, walletAddress, updateEthBalances]
  )

  const withdrawEth = useCallback(
    async (ethValue: string) => {
      if (!arbWallet) throw new Error('withdrawETH no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(ethValue)
      try {
        const tx = await arbWallet.withdrawEthFromChain(weiValue)
        await tx.wait()
        await updateEthBalances()
      } catch (e) {
        console.error('withdrawEth err', e)
      }
    },
    [arbWallet, updateEthBalances]
  )

  const withdrawLockboxETH = useCallback(async () => {
    if (!arbProvider) throw new Error('withdrawLockboxETH no arb wallet')

    try {
      const inboxManager = await arbProvider.globalInboxConn()
      const tx = await inboxManager.withdrawEth()
      await tx.wait()
      await updateEthBalances()
    } catch (e) {
      console.error('withdrawLockboxETH err', e)
    }
  }, [arbProvider, updateEthBalances])

  /* TOKEN METHODS */

  // TODO targeted token updates to prevent unneeded iteration
  const updateTokenBalances = useCallback(
    async (type?: TokenType): Promise<void> => {
      if (!arbProvider || !walletAddress)
        throw new Error('updateTokenBalances missing req')

      const inboxManager = await arbProvider.globalInboxConn()

      const filtered = Object.values(tokenContracts).filter(c => {
        return !!c && (!type || c.type === type)
      }) as BridgeToken[]

      const erc20Updates: typeof erc20Balances = {}
      const erc721Updates: typeof erc721Balances = {}
      let update20 = false,
        update721 = false

      for (const contract of filtered) {
        switch (contract.type) {
          case TokenType.ERC20: {
            update20 = true

            const updated = {
              balance: await contract.eth.balanceOf(walletAddress),
              arbChainBalance: await contract.arb.balanceOf(walletAddress),
              lockBoxBalance: await inboxManager.getERC20Balance(
                contract.eth.address,
                walletAddress
              ),
              totalArbBalance: await inboxManager.getERC20Balance(
                contract.eth.address,
                vmId
              ),
              asset: contract.symbol
            }

            erc20Updates[contract.eth.address] = updated

            break
          }
          case TokenType.ERC721: {
            update721 = true
            const updated = {
              tokens: await contract.eth.tokensOfOwner(walletAddress),
              arbChainTokens: await contract.arb.tokensOfOwner(walletAddress),
              totalArbTokens: await inboxManager.getERC721Tokens(
                contract.eth.address,
                vmId
              ),
              lockBoxTokens: await inboxManager.getERC721Tokens(
                contract.eth.address,
                walletAddress
              )
            }

            erc721Updates[contract.eth.address] = updated
            break
          }
          default:
            assertNever(contract, 'updateTokenBalances exhaustive check failed')
        }
      }

      if (!deepEquals(erc20Balances, erc20Updates)) {
        setErc20Balances(balances => ({ ...balances, ...erc20Updates }))
      }
      if (!deepEquals(erc721Balances, erc721Updates)) {
        setErc721Balances(balances => ({ ...balances, ...erc721Updates }))
      }
    },
    [
      arbProvider,
      erc20Balances,
      erc721Balances,
      tokenContracts,
      vmId,
      walletAddress
    ]
  )

  const approveToken = useCallback(
    async (contractAddress: string): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('approve missing provider')

      const contract = tokenContracts[contractAddress]
      if (!contract) {
        throw new Error(`Contract ${contractAddress} not present`)
      }

      const inboxManager = await arbProvider.globalInboxConn()

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await contract.eth.approve(
            inboxManager.address,
            constants.MaxUint256
          )
          break
        case TokenType.ERC721:
          tx = await contract.eth.setApprovalForAll(inboxManager.address, true)
          break
        default:
          assertNever(contract, 'approveToken exhaustive check failed')
      }

      const receipt = await tx.wait()

      setTokenContracts(contracts => {
        const target = contracts[contractAddress]
        if (!target) throw Error('approved contract missing ' + contractAddress)

        const updated = {
          ...target,
          allowed: true
        }

        return {
          ...contracts,
          [contractAddress]: updated
        }
      })

      return receipt
    },
    [arbProvider, tokenContracts]
  )

  const depositToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!arbWallet || !walletAddress) throw new Error('deposit missing req')

      const contract = tokenContracts[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO trigger balance updates
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          const amount = utils.parseUnits(amountOrTokenId, contract.units)
          tx = await arbWallet.depositERC20(
            walletAddress,
            contract.eth.address,
            amount
          )
          break
        case TokenType.ERC721:
          tx = await arbWallet.depositERC721(
            walletAddress,
            contract.eth.address,
            amountOrTokenId
          )
          break
        default:
          assertNever(contract, 'depositToken exhaustive check failed')
      }

      return await tx.wait()
    },
    [arbWallet, walletAddress, tokenContracts]
  )

  const withdrawToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!walletAddress) throw new Error('withdraw token no walletAddress')

      const contract = tokenContracts[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO trigger balance updates
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
          break
        case TokenType.ERC721:
          tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
          break
        default:
          assertNever(contract, 'withdrawToken exhaustive check failed')
      }

      return await tx.wait()
    },
    [walletAddress, tokenContracts]
  )

  const withdrawLockboxToken = useCallback(
    async (
      contractAddress: string,
      tokenId?: string
    ): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('withdrawLockboxToken missing req')

      const contract = tokenContracts[contractAddress]
      if (!contract) throw new Error('contract not present')

      const inboxManager = await arbProvider.globalInboxConn()

      // TODO error handle
      // TODO trigger balance updates
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await inboxManager.withdrawERC20(contract.eth.address)
          break
        case TokenType.ERC721:
          if (!tokenId) {
            throw Error(
              'withdrawLockbox tokenId not present ' + contractAddress
            )
          }
          tx = await inboxManager.withdrawERC721(contract.eth.address, tokenId)
          break
        default:
          assertNever(contract, 'withdrawLockboxToken exhaustive check failed')
      }

      return await tx.wait()
    },
    [arbProvider, tokenContracts]
  )

  const addToken = useCallback(
    async (contractAddress: string, type: TokenType) => {
      if (!arbProvider || !walletAddress) throw Error('addToken missing req')

      // TODO is this the best test? is it needed - can we rely on connect err?
      const isContract =
        (await arbProvider.provider.getCode(contractAddress)).length > 2
      if (!isContract) throw Error('address is not a contract')
      else if (tokenContracts[contractAddress])
        throw Error('contract is present')

      const inboxManager = await arbProvider.globalInboxConn()

      // TODO error handle
      // TODO trigger balance updates
      let newContract: BridgeToken
      switch (type) {
        case TokenType.ERC20:
          const arbERC20 = ArbERC20Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC20 = ERC20Factory.connect(
            contractAddress,
            arbProvider.provider.getSigner(walletIndex)
          )

          // TODO should be checking against another number for `allowed` presumably
          const allowance = await ethERC20.allowance(
            walletAddress,
            inboxManager.address
          )

          newContract = {
            arb: arbERC20,
            eth: ethERC20,
            type,
            allowed: allowance.gt(utils.bigNumberify(0)),
            units: await ethERC20.decimals(),
            symbol: await ethERC20.symbol()
          }

          if (ERC20Cache && !ERC20Cache.includes(contractAddress)) {
            setERC20Cache([...ERC20Cache, contractAddress])
          }
          break
        case TokenType.ERC721:
          const arbERC721 = ArbERC721Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC721 = ERC721Factory.connect(
            contractAddress,
            arbProvider.provider.getSigner(walletIndex)
          )

          newContract = {
            arb: arbERC721,
            eth: ethERC721,
            type,
            symbol: await ethERC721.symbol(),
            allowed: await ethERC721.isApprovedForAll(
              walletAddress,
              inboxManager.address
            )
          }
          if (ERC721Cache && !ERC721Cache.includes(contractAddress)) {
            setERC721Cache([...ERC721Cache, contractAddress])
          }
          break
        default:
          assertNever(type, 'addToken exhaustive check failed')
      }

      setTokenContracts(contracts => {
        return {
          ...contracts,
          [contractAddress]: newContract
        }
      })

      await updateTokenBalances(type)
    },
    [arbProvider, walletAddress, tokenContracts, updateTokenBalances]
  )

  const updateAllBalances = useCallback(
    () => Promise.all([updateEthBalances(), updateTokenBalances()]),
    [updateEthBalances, updateTokenBalances]
  )

  const expireCache = (): void => {
    setERC20Cache([])
    setERC721Cache([])
  }

  useEffect(() => {
    if (arbProvider) {
      if (!walletAddress || !vmId) {
        // set both of these at the same time for cleaner external usage
        Promise.all([
          arbProvider.getSigner(walletIndex).getAddress(),
          arbProvider.getVmID()
        ]).then(([addr, vm]) => setConfig({ walletAddress: addr, vmId: vm }))
      } else {
        // may be better to leave this to the user
        /* update balances on render */
        updateAllBalances().catch(e =>
          console.error('updateAllBalances failed', e)
        )
      }

      // is it worth registering the listener in state so the below isn't called?
      arbProvider.arbRollupConn().then(rollup => {
        const {
          name: confirmedEvent
        } = rollup.interface.events.ConfirmedAssertion
        if (rollup.listeners(confirmedEvent).indexOf(updateAllBalances) < 0) {
          rollup.on(confirmedEvent, updateAllBalances)
        }
      })
    }
  }, [arbProvider, updateAllBalances, vmId, walletAddress, walletIndex])

  return {
    walletAddress,
    vmId,
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
      withdrawLockbox: withdrawLockboxETH,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      approve: approveToken,
      deposit: depositToken,
      withdraw: withdrawToken,
      withdrawLockbox: withdrawLockboxToken,
      updateBalances: updateTokenBalances
    }
  }
}
