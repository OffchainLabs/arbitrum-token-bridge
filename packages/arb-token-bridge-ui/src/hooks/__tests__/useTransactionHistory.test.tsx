import { PropsWithChildren } from 'react'
import { SWRConfig } from 'swr'
import { constants } from 'ethers'
import { Address } from 'wagmi'
import dayjs from 'dayjs'
import {
  act,
  renderHook,
  RenderHookResult,
  waitFor
} from '@testing-library/react'
import { useTransactionHistory } from '../useTransactionHistory'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { AssetType } from '../arbTokenBridge.types'

const sender = '0x5d64a0fd6af0d76a7ed189d4061ffa6823fbf97e'
const TRANSACTIONS_COUNT = 37

const mockedPendingTransaction: MergedTransaction = {
  sender,
  direction: 'deposit-l1',
  status: 'pending',
  createdAt: dayjs().valueOf(),
  resolvedAt: null,
  txId: constants.AddressZero,
  asset: 'ETH',
  assetType: AssetType.ETH,
  value: '0.1',
  depositStatus: DepositStatus.L1_PENDING,
  uniqueId: null,
  isWithdrawal: false,
  blockNum: null,
  tokenAddress: null,
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 1,
  destinationChainId: 42161
}

const Container = ({ children }: PropsWithChildren<unknown>) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

jest.mock('../useArbQueryParams', () => ({
  useArbQueryParams: jest.fn().mockReturnValue([
    {
      txHistory: 1
    }
  ])
}))

jest.mock('../useIsTestnetMode', () => ({
  useIsTestnetMode: jest.fn().mockReturnValue([false, jest.fn()])
}))

jest.mock('../useAccountType', () => ({
  useAccountType: jest.fn().mockReturnValue({
    isEOA: true,
    isSmartContractWallet: false,
    isLoading: false
  })
}))

jest.mock('wagmi', () => ({
  ...jest.requireActual('wagmi'),
  useNetwork: () => ({
    // this is not important to test this hook, it just needs to be defined
    // only relevant for smart contract wallets
    chain: {
      id: '1'
    }
  }),
  useAccount: () => ({
    isConnected: true
  })
}))

const renderHookAsyncUseTransactionHistory = async (
  walletAddress: Address | undefined
) => {
  let hook:
    | RenderHookResult<
        ReturnType<typeof useTransactionHistory>,
        { walletAddress: Address | undefined }
      >
    | undefined

  await act(async () => {
    hook = renderHook(
      () => useTransactionHistory(walletAddress, { runFetcher: true }),
      {
        wrapper: Container
      }
    )
  })

  if (!hook) {
    throw new Error('Hook is not defined')
  }

  return { result: hook.result }
}

describe('useTransactionHistory', () => {
  it(
    'fetches history for the first and subsequent batches',
    async () => {
      const { result } = await renderHookAsyncUseTransactionHistory(sender)

      expect(result.current.completed).toBe(false)
      expect(result.current.loading).toBe(true)
      expect(result.current.transactions.length).toBe(0)

      // This account has TRANSACTIONS_COUNT transactions, we fetch in batches of 3.
      // This is why we stop when nearly all are fetched, and at the end we check if the last 1 tx got fetched
      while (result.current.transactions.length < TRANSACTIONS_COUNT - 1) {
        const previousTransactionsCount = result.current.transactions.length

        await waitFor(
          () => {
            expect(result.current.completed).toBe(false)
            expect(result.current.loading).toBe(false)
            expect(result.current.transactions.length).toBe(
              previousTransactionsCount + 3
            )
            expect(result.current.error).toBe(undefined)
          },
          { timeout: 100_000 }
        )

        act(() => {
          result.current.resume()
        })
      }

      // We have fetched nearly all transactions, now we should only fetch the remaining 1
      await waitFor(
        () => {
          expect(result.current.completed).toBe(true)
          expect(result.current.loading).toBe(false)
          expect(result.current.transactions.length).toBe(TRANSACTIONS_COUNT)
          expect(result.current.error).toBe(undefined)
        },
        { timeout: 100_000 }
      )
    },
    100_000 * (TRANSACTIONS_COUNT / 3)
  )

  it('adds pending transaction when fetching is paused', async () => {
    const { result } = await renderHookAsyncUseTransactionHistory(sender)

    await waitFor(
      () => {
        expect(result.current.completed).toBe(false)
        expect(result.current.loading).toBe(false)
        expect(result.current.transactions.length).toBe(3)
        expect(result.current.error).toBe(undefined)
      },
      { timeout: 100_000 }
    )

    act(() => {
      result.current.addPendingTransaction(mockedPendingTransaction)
    })

    await waitFor(
      () => {
        expect(result.current.transactions.length).toBe(4)
      },
      { timeout: 20_000 }
    )
  }, 150_000)

  it('adds pending transaction when fetching is ongoing', async () => {
    const { result } = await renderHookAsyncUseTransactionHistory(sender)

    act(() => {
      result.current.addPendingTransaction(mockedPendingTransaction)
    })

    await waitFor(
      () => {
        expect(result.current.transactions.length).toBe(1)
      },
      { timeout: 20_000 }
    )

    await waitFor(
      () => {
        expect(result.current.completed).toBe(false)
        expect(result.current.loading).toBe(false)
        expect(result.current.transactions.length).toBe(4)
        expect(result.current.error).toBe(undefined)
      },
      { timeout: 100_000 }
    )
  }, 150_000)
})
