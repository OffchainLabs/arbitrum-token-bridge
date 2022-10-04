import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import {
  ERC20__factory,
  L1TokenData,
  L2TokenData,
  TokenBridgeParams
} from 'index'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
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

/**
 * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
 * @param erc20L1Address
 * @returns
 */
export async function getL1TokenData(
  erc20L1Address: string,
  params: TokenBridgeParams,
  throwOnInvalidERC20 = true
): Promise<L1TokenData> {
  type GetL1TokenDataOverrides = {
    params: { name?: true; symbol?: true }
    result: { name?: string; symbol?: string }
  }

  const { l1, l2, walletAddress } = params
  const erc20Bridger = new Erc20Bridger(l2.network)

  function getDefaultTokenName(address: string) {
    const lowercased = address.toLowerCase()
    return (
      lowercased.substring(0, 5) +
      '...' +
      lowercased.substring(lowercased.length - 3)
    )
  }

  function getDefaultTokenSymbol(address: string) {
    const lowercased = address.toLowerCase()
    return (
      lowercased.substring(0, 5) +
      '...' +
      lowercased.substring(lowercased.length - 3)
    )
  }

  function getOverrides(): GetL1TokenDataOverrides {
    const erc20L1AddressLowercased = erc20L1Address.toLowerCase()

    const overrides: {
      [erc20L1Address: string]: GetL1TokenDataOverrides
    } = {
      '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': {
        // Don't query for name & symbol
        params: {},
        result: { name: 'Maker', symbol: 'MKR' }
      }
    }

    if (typeof overrides[erc20L1AddressLowercased] !== 'undefined') {
      return overrides[erc20L1AddressLowercased]
    }

    return {
      // By default query for name & symbol
      params: { name: true, symbol: true },
      result: {}
    }
  }

  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1.provider
  )

  const overrides = getOverrides()
  const contract = ERC20__factory.connect(erc20L1Address, l1.provider)

  const multiCaller = await MultiCaller.fromProvider(l1.provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
    balanceOf: { account: walletAddress },
    allowance: { owner: walletAddress, spender: l1GatewayAddress },
    decimals: true,
    ...overrides.params
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
    ...overrides.result,
    contract
  }
}

/**
 * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
 * @param erc20L2Address
 * @returns
 */
export async function getL2TokenData(
  erc20L2Address: string,
  params: TokenBridgeParams
): Promise<L2TokenData> {
  const { l2, walletAddress } = params

  const contract = StandardArbERC20__factory.connect(
    erc20L2Address,
    l2.provider
  )

  const multiCaller = await MultiCaller.fromProvider(l2.provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L2Address], {
    balanceOf: { account: walletAddress }
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
