import { renderHook, waitFor, act } from '@testing-library/react'
import { Address } from 'viem'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTransactionHistory } from '../useTransactionHistory'
import { useArbQueryParams } from '../useArbQueryParams'

const wallets = {
  WALLET_MULTIPLE_TX: '0x1798440327d78ebb19db0c8999e2368eaed8f413',
  WALLET_SINGLE_TX: '0x6d051646D4A9df8679E9AD3429e70415f75f6499',
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
  address,
  enabled,
  expectedPagesTxCounts
}: {
  address: (typeof wallets)[keyof typeof wallets]
  enabled: boolean
  expectedPagesTxCounts: number[]
}) => ({ address, enabled, expectedPagesTxCounts })

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

  // Allow initial async operations to settle
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })

  return { result: hook.result }
}

describe.sequential('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    createTestCase({
      address: wallets.WALLET_MULTIPLE_TX,
      enabled: true,
      expectedPagesTxCounts: [3, 5]
    }),
    createTestCase({
      address: wallets.WALLET_MULTIPLE_TX,
      enabled: false,
      expectedPagesTxCounts: [0]
    }),
    createTestCase({
      address: wallets.WALLET_SINGLE_TX,
      enabled: true,
      expectedPagesTxCounts: [1]
    }),
    createTestCase({
      address: wallets.WALLET_SINGLE_TX,
      enabled: false,
      expectedPagesTxCounts: [0]
    }),
    createTestCase({
      address: wallets.WALLET_EMPTY,
      enabled: true,
      expectedPagesTxCounts: [0]
    })
  ])(
    'fetches history for key:$key enabled:$enabled expectedPagesTxCounts:$expectedPagesTxCounts',
    async ({ address, enabled, expectedPagesTxCounts }) => {
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

      const { result } = await renderHookAsyncUseTransactionHistory(address)

      // fetch each batch
      for (let page = 0; page < expectedPagesTxCounts.length; page++) {
        // initial fetch starts immediately
        if (page > 0) {
          act(() => {
            result.current.resume()
          })
        }

        await waitFor(() => {
          expect(result.current.loading).toBe(true)
        })

        await waitFor(
          () => {
            expect(result.current.loading).toBe(false)
          },
          { timeout: 30_000, interval: 500 }
        )

        // await act(async () => {
        //   await new Promise(resolve => setTimeout(resolve, 0))
        // })

        // total results so far
        expect(result.current.transactions).toHaveLength(
          Number(expectedPagesTxCounts[page])
        )
      }

      // await act(async () => {
      //   await new Promise(resolve => setTimeout(resolve, 0))
      // })

      // finally, no more transactions left to be fetched
      expect(result.current.completed).toBe(true)
    }
  )
})
