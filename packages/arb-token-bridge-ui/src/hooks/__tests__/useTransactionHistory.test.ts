import { renderHook, waitFor, act } from '@testing-library/react'
import { Address } from 'viem'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTransactionHistory } from '../useTransactionHistory'
import { useArbQueryParams } from '../useArbQueryParams'

const wallets = {
  WALLET_MULTIPLE_TX: '0x1798440327d78ebb19db0c8999e2368eaed8f413',
  WALLET_SINGLE_TX: '0xf4331491Ea0feF4082174344a0d4bb53DF766B5D',
  WALLET_EMPTY: '0xa5801D65537dF15e90D284E5E917AE84e3F3201c'
} as const

/**
 * Creates a test case configuration for transaction history testing.
 * @param config - Test case configuration
 * @param config.key - The wallet key from the wallets object to use for testing
 * @param config.enabled - Whether the transaction history feature is enabled
 * @param config.expectedPagesTxCounts - Array of expected transaction counts for each paginated batch
 * @returns Test case object with the provided configuration
 */
const createTestCase = ({
  key,
  enabled,
  expectedPagesTxCounts
}: {
  key: keyof typeof wallets
  enabled: boolean
  expectedPagesTxCounts: number[]
}) => ({ key, enabled, expectedPagesTxCounts })

vi.mock('wagmi', async importActual => ({
  ...(await importActual()),
  useAccount: () => ({
    isConnected: true,
    chain: { id: 11155111 },
    connector: null
  })
}))

vi.mock('../useArbQueryParams', async importActual => ({
  ...(await importActual()),
  useArbQueryParams: vi.fn().mockReturnValue([{}, vi.fn()])
}))

const renderHookAsyncUseTransactionHistory = async (address: Address) => {
  const hook = renderHook(() =>
    useTransactionHistory(address, { runFetcher: true })
  )

  return { result: hook.result }
}

describe.sequential('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    createTestCase({
      key: 'WALLET_MULTIPLE_TX',
      enabled: true,
      expectedPagesTxCounts: [3, 5]
    }),
    createTestCase({
      key: 'WALLET_MULTIPLE_TX',
      enabled: false,
      expectedPagesTxCounts: [0]
    }),
    createTestCase({
      key: 'WALLET_SINGLE_TX',
      enabled: true,
      expectedPagesTxCounts: [1]
    }),
    createTestCase({
      key: 'WALLET_SINGLE_TX',
      enabled: false,
      expectedPagesTxCounts: [0]
    }),
    createTestCase({
      key: 'WALLET_EMPTY',
      enabled: true,
      expectedPagesTxCounts: [0]
    })
  ])(
    'fetches history for key:$key enabled:$enabled expectedPagesTxCounts:$expectedPagesTxCounts',
    async ({ key, enabled, expectedPagesTxCounts }) => {
      const mockUseArbQueryParams = vi.mocked(useArbQueryParams)
      const [currentParams, setParams] = mockUseArbQueryParams()

      mockUseArbQueryParams.mockReturnValue([
        {
          ...currentParams,
          sourceChain: 11155111,
          disabledFeatures: enabled ? [] : ['tx-history']
        },
        setParams
      ])

      const address = wallets[key]

      if (!address) {
        throw new Error(
          `Wallet ${key} not found. Make sure it's added to the list of wallets.`
        )
      }

      const { result } = await renderHookAsyncUseTransactionHistory(address)

      // fetch each batch
      for (let page = 0; page < expectedPagesTxCounts.length; page++) {
        // initial fetch starts immediately
        if (page > 0) {
          act(() => {
            result.current.resume()
          })
        }

        expect(result.current.loading).toBe(true)

        await waitFor(
          () => {
            // fetching finished
            expect(result.current.loading).toBe(false)
          },
          { timeout: 30_000, interval: 500 }
        )

        // total results so far
        expect(result.current.transactions).toHaveLength(
          Number(expectedPagesTxCounts[page])
        )
      }

      // finally, no more transactions left to be fetched
      expect(result.current.completed).toBe(true)
    }
  )
})
