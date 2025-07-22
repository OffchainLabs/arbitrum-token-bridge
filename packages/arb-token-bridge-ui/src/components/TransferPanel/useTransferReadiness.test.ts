import { describe, expect, it } from 'vitest'
import { getAmountToPay } from './useTransferReadiness'
import { RouteContext } from './hooks/useRouteStore'
import { BigNumber } from 'ethers'
import { AmountWithToken } from '@/token-bridge-sdk/LifiTransferStarter'

const eth = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
}
const usdc = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
}

function getMock({
  gas,
  fee,
  fromAmount
}: {
  gas: AmountWithToken
  fee: AmountWithToken
  fromAmount: AmountWithToken
}): RouteContext {
  return {
    spenderAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
    gas,
    fee,
    fromAmount,
    toAmount: {
      amount: BigNumber.from('306496651855301'),
      amountUSD: '1.1437',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
      }
    },
    toolDetails: {
      key: 'gasZipBridge',
      name: 'GasZip',
      logoURI:
        'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/gaszip.svg'
    },
    durationMs: 4000,
    destinationTxId: null,
    step: {
      type: 'lifi',
      id: 'ef70a077-0322-4b80-b2c4-7117eaf544d4:0',
      tool: 'gasZipBridge',
      toolDetails: {
        key: 'gasZipBridge',
        name: 'GasZip',
        logoURI:
          'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/gaszip.svg'
      },
      action: {
        fromToken: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: 1,
          symbol: 'ETH',
          decimals: 18,
          name: 'ETH',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
          priceUSD: '3731.44'
        },
        fromAmount: '306838702657301',
        toToken: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: 42161,
          symbol: 'ETH',
          decimals: 18,
          name: 'ETH',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
          priceUSD: '3731.44'
        },
        fromChainId: 1,
        toChainId: 42161,
        slippage: 0.005,
        fromAddress: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
        toAddress: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'
      },
      estimate: {
        tool: 'gasZipBridge',
        approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
        toAmountMin: '306496651855301',
        toAmount: '306496651855301',
        fromAmount: '306838702657301',
        feeCosts: [],
        gasCosts: [
          {
            type: 'SEND',
            price: '2281913606',
            estimate: '70000',
            limit: '213000',
            amount: '159733952420000',
            amountUSD: '0.5960',
            token: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              symbol: 'ETH',
              decimals: 18,
              name: 'ETH',
              logoURI:
                'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
              priceUSD: '3731.44'
            }
          }
        ],
        executionDuration: 4,
        fromAmountUSD: '1.1450',
        toAmountUSD: '1.1437'
      },
      includedSteps: [
        {
          id: 'c920a56b-5a2c-40c6-bc0d-bbca557f1b3e',
          type: 'cross',
          action: {
            fromChainId: 1,
            fromAmount: '306838702657301',
            fromToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              symbol: 'ETH',
              decimals: 18,
              name: 'ETH',
              logoURI:
                'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
              priceUSD: '3731.44'
            },
            toChainId: 42161,
            toToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 42161,
              symbol: 'ETH',
              decimals: 18,
              name: 'ETH',
              logoURI:
                'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
              priceUSD: '3731.44'
            },
            slippage: 0.005,
            fromAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
            toAddress: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'
          },
          estimate: {
            tool: 'gasZipBridge',
            fromAmount: '306838702657301',
            toAmount: '306496651855301',
            toAmountMin: '306496651855301',
            gasCosts: [
              {
                type: 'SEND',
                price: '2281913606',
                estimate: '70000',
                limit: '91000',
                amount: '159733952420000',
                amountUSD: '0.5960',
                token: {
                  address: '0x0000000000000000000000000000000000000000',
                  chainId: 1,
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'ETH',
                  logoURI:
                    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
                  priceUSD: '3731.44'
                }
              }
            ],
            executionDuration: 4,
            approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
            feeCosts: []
          },
          tool: 'gasZipBridge',
          toolDetails: {
            key: 'gasZipBridge',
            name: 'GasZip',
            logoURI:
              'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/gaszip.svg'
          }
        }
      ],
      integrator: '_arbitrum'
    }
  }
}

describe('getAmountToPay', () => {
  it('should return the amount with token when token sent is the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: BigNumber.from('70000'),
          amountUSD: '0.596',
          token: eth
        },
        fee: {
          amount: BigNumber.from('35000'),
          amountUSD: '0.298',
          token: eth
        },
        fromAmount: {
          amount: BigNumber.from('306838702657301'),
          amountUSD: '1.1450',
          token: eth
        }
      })
    )
    expect(fromAmountUsd).toBe(2.039)
    expect(amounts).toStrictEqual({
      '0x0000000000000000000000000000000000000000': {
        amount: BigNumber.from('306838702657301').add('70000').add('35000'),
        amountUSD: '2.039',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
          symbol: 'ETH'
        }
      }
    })
  })

  it('should return the different amounts with tokens when token sent is not the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: BigNumber.from('70000'),
          amountUSD: '0.596',
          token: eth
        },
        fee: {
          amount: BigNumber.from('35000'),
          amountUSD: '0.298',
          token: eth
        },
        fromAmount: {
          amount: BigNumber.from('10000000'),
          amountUSD: '10',
          token: usdc
        }
      })
    )

    expect(fromAmountUsd).toBe(10.894)
    expect(amounts).toStrictEqual({
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        amount: BigNumber.from('10000000'),
        amountUSD: '10',
        token: usdc
      },
      '0x0000000000000000000000000000000000000000': {
        amount: BigNumber.from('70000').add('35000'),
        amountUSD: '0.894',
        token: eth
      }
    })
  })
})
