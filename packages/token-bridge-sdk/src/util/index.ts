import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ERC20__factory, L1TokenData, L2TokenData } from '../index'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { Erc20Bridger, MultiCaller, getL2Network } from '@arbitrum/sdk'
import { BigNumber } from 'ethers'

export function assertNever(x: never, message = 'Unexpected object'): never {
  console.error(message, x)
  throw new Error('see console ' + message)
}

export const validateTokenList = (tokenList: TokenList) => {
  const ajv = new Ajv()
  addFormats(ajv)
  const validate = ajv.compile(schema)

  return validate(tokenList)
}

export function getDefaultTokenName(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

export function getDefaultTokenSymbol(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

/**
 * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
 * @param erc20L1Address
 * @returns
 */
export async function getL1TokenData({
  account,
  erc20L1Address,
  l1Provider,
  l2Provider,
  throwOnInvalidERC20 = true
}: {
  account: string
  erc20L1Address: string
  l1Provider: JsonRpcProvider
  l2Provider: JsonRpcProvider
  throwOnInvalidERC20?: boolean
}): Promise<L1TokenData> {
  const l2Network = await getL2Network(l2Provider)
  const erc20Bridger = new Erc20Bridger(l2Network)

  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1Provider
  )

  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

  const multiCaller = await MultiCaller.fromProvider(l1Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
    balanceOf: { account },
    allowance: { owner: account, spender: l1GatewayAddress },
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
export async function getL2TokenData({
  account,
  erc20L2Address,
  l2Provider
}: {
  account: string
  erc20L2Address: string
  l2Provider: JsonRpcProvider
}): Promise<L2TokenData> {
  const contract = StandardArbERC20__factory.connect(erc20L2Address, l2Provider)

  const multiCaller = await MultiCaller.fromProvider(l2Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L2Address], {
    balanceOf: { account }
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
