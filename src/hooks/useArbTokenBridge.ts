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

const MIN_APPROVAL = constants.MaxUint256

/* eslint-disable no-shadow */
export enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721'
}
/* eslint-enable no-shadow */

interface BridgedToken {
  type: TokenType
  name: string
  symbol: string
  allowed: boolean
  arb: ArbERC20 | ArbERC721
  eth: ERC20 | ERC721
}

interface ERC20BridgeToken extends BridgedToken {
  type: TokenType.ERC20
  arb: ArbERC20
  eth: ERC20
  decimals: number
}

interface ERC721BridgeToken extends BridgedToken {
  type: TokenType.ERC721
  arb: ArbERC721
  eth: ERC721
}

export type BridgeToken = ERC20BridgeToken | ERC721BridgeToken

export interface ContractStorage<T> {
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
// TODO more control & details about approvals
// TODO extract shared contract interaction logic?
export const useArbTokenBridge = (
  validatorUrl: string,
  ethProvider:
    | ethers.providers.JsonRpcProvider
    | Promise<ethers.providers.JsonRpcProvider>,
  walletIndex = 0,
  autoLoadCache = true
) => {
  const [bridgeTokens, setBridgeTokens] = useState<
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

  // use local storage for list of token addresses
  // TODO remove type assertion when hook dependency fix update is released
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

    const [
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
    ] = await Promise.all([
      ethWallet.getBalance(),
      arbProvider.getBalance(walletAddress),
      inboxManager.getEthBalance(walletAddress),
      inboxManager.getEthBalance(vmId)
    ])

    const update: typeof ethBalances = {
      balance,
      arbChainBalance,
      lockBoxBalance,
      totalArbBalance
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
    async (etherVal: string) => {
      if (!arbWallet || !walletAddress)
        throw new Error('depositEth no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      try {
        const tx = await arbWallet.depositETH(walletAddress, weiValue)
        const receipt = await tx.wait()
        updateEthBalances()
        return receipt
      } catch (e) {
        console.error('depositEth err: ' + e)
      }
    },
    [arbWallet, walletAddress, updateEthBalances]
  )

  const withdrawEth = useCallback(
    async (etherVal: string) => {
      if (!arbWallet) throw new Error('withdrawETH no arb wallet')

      const weiValue: utils.BigNumber = utils.parseEther(etherVal)
      try {
        const tx = await arbWallet.withdrawEthFromChain(weiValue)
        const receipt = await tx.wait()
        updateEthBalances()
        return receipt
      } catch (e) {
        console.error('withdrawEth err', e)
      }
    },
    [arbWallet, updateEthBalances]
  )

  const withdrawLockBoxETH = useCallback(async () => {
    if (!arbProvider) throw new Error('withdrawLockBoxETH no arbprovider')

    try {
      const inboxManager = (await arbProvider.globalInboxConn()).connect(
        arbProvider.provider.getSigner(walletIndex)
      )
      const tx = await inboxManager.withdrawEth()
      const receipt = await tx.wait()
      updateEthBalances()
      return receipt
    } catch (e) {
      console.error('withdrawLockBoxETH err', e)
    }
  }, [arbProvider, updateEthBalances])

  /* TOKEN METHODS */

  // TODO targeted token updates to prevent unneeded iteration
  const updateTokenBalances = useCallback(
    async (type?: TokenType): Promise<void> => {
      if (!arbProvider || !walletAddress)
        throw new Error('updateTokenBalances missing req')

      const inboxManager = await arbProvider.globalInboxConn()

      const filtered = Object.values(bridgeTokens).filter(c => {
        return !!c && (!type || c.type === type)
      }) as BridgeToken[]

      const erc20Updates: typeof erc20Balances = {}
      const erc721Updates: typeof erc721Balances = {}

      for (const contract of filtered) {
        switch (contract.type) {
          case TokenType.ERC20: {
            const [
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance
            ] = await Promise.all([
              contract.eth.balanceOf(walletAddress),
              contract.arb.balanceOf(walletAddress),
              inboxManager.getERC20Balance(contract.eth.address, walletAddress),
              inboxManager.getERC20Balance(contract.eth.address, vmId)
            ])

            const updated = {
              balance,
              arbChainBalance,
              lockBoxBalance,
              totalArbBalance,
              asset: contract.symbol
            }

            erc20Updates[contract.eth.address] = updated

            break
          }
          case TokenType.ERC721: {
            const [
              tokens,
              arbChainTokens,
              lockBoxTokens,
              totalArbTokens
            ] = await Promise.all([
              contract.eth.tokensOfOwner(walletAddress),
              contract.arb.tokensOfOwner(walletAddress),
              inboxManager.getERC721Tokens(contract.eth.address, walletAddress),
              inboxManager.getERC721Tokens(contract.eth.address, vmId)
            ])
            const updated = {
              tokens,
              arbChainTokens,
              totalArbTokens,
              lockBoxTokens
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
      bridgeTokens,
      vmId,
      walletAddress
    ]
  )
  const approveToken = useCallback(
    async (contractAddress: string): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('approve missing provider')

      const contract = bridgeTokens[contractAddress]
      if (!contract) {
        throw new Error(`Contract ${contractAddress} not present`)
      }

      const inboxManager = await arbProvider.globalInboxConn()

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await contract.eth.approve(inboxManager.address, MIN_APPROVAL)
          break
        case TokenType.ERC721:
          tx = await contract.eth.setApprovalForAll(inboxManager.address, true)
          break
        default:
          assertNever(contract, 'approveToken exhaustive check failed')
      }

      const receipt = await tx.wait()

      setBridgeTokens(contracts => {
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
    [arbProvider, bridgeTokens]
  )

  const depositToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!arbWallet || !walletAddress) throw new Error('deposit missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      // TODO fail fast if not approved

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
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

      const receipt = await tx.wait()
      updateTokenBalances(contract.type)
      return receipt
    },
    [arbWallet, walletAddress, bridgeTokens]
  )

  const withdrawToken = useCallback(
    async (
      contractAddress: string,
      amountOrTokenId: string
    ): Promise<ContractReceipt> => {
      if (!walletAddress) throw new Error('withdraw token no walletAddress')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          const amount = utils.parseUnits(amountOrTokenId, contract.decimals)
          tx = await contract.arb.withdraw(walletAddress, amount)
          break
        case TokenType.ERC721:
          tx = await contract.arb.withdraw(walletAddress, amountOrTokenId)
          break
        default:
          assertNever(contract, 'withdrawToken exhaustive check failed')
      }

      const receipt = await tx.wait()
      updateTokenBalances(contract.type)
      return receipt
    },
    [walletAddress, bridgeTokens]
  )

  const withdrawLockBoxToken = useCallback(
    async (
      contractAddress: string,
      tokenId?: string
    ): Promise<ContractReceipt> => {
      if (!arbProvider) throw new Error('withdrawLockBoxToken missing req')

      const contract = bridgeTokens[contractAddress]
      if (!contract) throw new Error('contract not present')

      const inboxManager = (await arbProvider.globalInboxConn()).connect(
        arbProvider.provider.getSigner(walletIndex)
      )

      // TODO error handle
      let tx: ContractTransaction
      switch (contract.type) {
        case TokenType.ERC20:
          tx = await inboxManager.withdrawERC20(contract.eth.address)
          break
        case TokenType.ERC721:
          if (!tokenId) {
            throw Error(
              'withdrawLockBox tokenId not present ' + contractAddress
            )
          }
          tx = await inboxManager.withdrawERC721(contract.eth.address, tokenId)
          break
        default:
          assertNever(contract, 'withdrawLockBoxToken exhaustive check failed')
      }

      const receipt = await tx.wait()
      updateTokenBalances(contract.type)
      return receipt
    },
    [arbProvider, bridgeTokens]
  )

  const addToken = useCallback(
    async (contractAddress: string, type: TokenType): Promise<string> => {
      if (!arbProvider || !walletAddress || !arbWallet)
        throw Error('addToken missing req')

      const isEthContract =
        (await arbProvider.provider.getCode(contractAddress)).length > 2
      if (!isEthContract) throw Error('contract is not deployed on eth')
      else if (bridgeTokens[contractAddress]) throw Error('token already added')

      const inboxManager = await arbProvider.globalInboxConn()

      // TODO error handle
      let newContract: BridgeToken
      switch (type) {
        case TokenType.ERC20: {
          const arbContractCode = await arbProvider.getCode(contractAddress)
          if (arbContractCode === '0x') {
            console.warn('contract does not exist')
            // TODO replace with non signature required handling
            await arbWallet.depositERC20(walletAddress, contractAddress, 0)
          }

          const arbERC20 = ArbERC20Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC20 = ERC20Factory.connect(
            contractAddress,
            arbProvider.provider.getSigner(walletIndex)
          )

          const [allowance, name, decimals, symbol] = await Promise.all([
            ethERC20.allowance(walletAddress, inboxManager.address),
            ethERC20.name(),
            ethERC20.decimals(),
            ethERC20.symbol()
          ])

          newContract = {
            arb: arbERC20,
            eth: ethERC20,
            type,
            allowed: allowance.gte(MIN_APPROVAL),
            name,
            decimals,
            symbol
          }

          if (!ERC20Cache?.includes(contractAddress)) {
            setERC20Cache([...ERC20Cache, contractAddress])
          }
          break
        }
        case TokenType.ERC721: {
          const arbERC721 = ArbERC721Factory.connect(
            contractAddress,
            arbProvider.getSigner(walletIndex)
          )
          const ethERC721 = ERC721Factory.connect(
            contractAddress,
            arbProvider.provider.getSigner(walletIndex)
          )

          const [allowed, name, symbol] = await Promise.all([
            ethERC721.isApprovedForAll(walletAddress, inboxManager.address),
            ethERC721.name(),
            ethERC721.symbol()
          ])

          newContract = {
            arb: arbERC721,
            eth: ethERC721,
            type,
            name,
            symbol,
            allowed
          }
          if (ERC721Cache && !ERC721Cache.includes(contractAddress)) {
            setERC721Cache([...ERC721Cache, contractAddress])
          }
          break
        }
        default:
          assertNever(type, 'addToken exhaustive check failed')
      }

      setBridgeTokens(contracts => {
        return {
          ...contracts,
          [contractAddress]: newContract
        }
      })

      // we await here to ensure initial balance entry is set
      await updateTokenBalances(type)
      return contractAddress
    },
    [arbProvider, walletAddress, bridgeTokens, updateTokenBalances]
  )

  const updateAllBalances = useCallback(
    () => Promise.all([updateEthBalances(), updateTokenBalances()]),
    [updateEthBalances, updateTokenBalances]
  )

  const expireCache = (): void => {
    clearERC20Cache()
    clearERC721Cache()
  }

  useEffect(() => {
    if (arbProvider) {
      arbProvider.arbRollupConn().then(rollup => {
        const {
          name: confirmedEvent
        } = rollup.interface.events.ConfirmedAssertion
        rollup.on(confirmedEvent, updateAllBalances)
      })

      return () => {
        arbProvider.arbRollupConn().then(rollup => {
          const {
            name: confirmedEvent
          } = rollup.interface.events.ConfirmedAssertion
          rollup.removeListener(confirmedEvent, updateAllBalances)
        })
      }
    }
  }, [arbProvider, updateAllBalances])

  // TODO replace IIFEs with Promise.allSettled once available
  useEffect(() => {
    if (arbProvider && walletAddress) {
      if (autoLoadCache) {
        if (ERC20Cache?.length) {
          Promise.all(
            ERC20Cache.map(address => {
              return addToken(address, TokenType.ERC20).catch(err => {
                console.warn(`invalid cache entry erc20 ${address}`)
              })
            })
          ).then(values => {
            setERC20Cache(values.filter((val): val is string => !!val))
          })
        }

        if (ERC721Cache?.length) {
          Promise.all(
            ERC721Cache.map(address => {
              return addToken(address, TokenType.ERC721).catch(err => {
                console.warn(`invalid cache entry erc721 ${address}`)
              })
            })
          ).then(values => {
            setERC721Cache(values.filter((val): val is string => !!val))
          })
        }
      }
    }
  }, [arbProvider, walletAddress])

  useEffect(() => {
    if (arbProvider && (!walletAddress || !vmId)) {
      // set both of these at the same time for cleaner external usage
      Promise.all([
        arbProvider.getSigner(walletIndex).getAddress(),
        arbProvider.getVmID()
      ]).then(([addr, vm]) => setConfig({ walletAddress: addr, vmId: vm }))
    }
  }, [arbProvider, vmId, walletAddress, walletIndex])

  /* update balances on render */
  // may be better to leave this to the user
  useEffect(() => {
    if (arbProvider && vmId) {
      updateAllBalances().catch(e =>
        console.error('updateAllBalances failed', e)
      )
    }
  })

  return {
    walletAddress,
    vmId,
    bridgeTokens,
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
      withdrawLockBox: withdrawLockBoxETH,
      updateBalances: updateEthBalances
    },
    token: {
      add: addToken,
      approve: approveToken,
      deposit: depositToken,
      withdraw: withdrawToken,
      withdrawLockBox: withdrawLockBoxToken,
      updateBalances: updateTokenBalances
    }
  }
}
