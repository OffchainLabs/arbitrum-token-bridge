import { create } from 'zustand'
import { useAccount } from 'wagmi'
import { Address, isAddress } from 'viem'
import { shallow } from 'zustand/shallow'
import { useCallback, useEffect } from 'react'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { trackEvent } from '../../util/AnalyticsUtils'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

export enum TransactionHistorySearchError {
  INVALID_ADDRESS = 'That doesn’t seem to be a valid address, please try again.'
}

type TransactionHistoryAddressStore = {
  address: string
  sanitizedAddress: Address | undefined
  searchError: TransactionHistorySearchError | undefined
  setAddress: (address: string) => void
  setSanitizedAddress: (address: string) => void
  setSearchError: (error: TransactionHistorySearchError | undefined) => void
}

export const useTransactionHistoryAddressStore =
  create<TransactionHistoryAddressStore>(set => ({
    address: '',
    sanitizedAddress: undefined,
    setAddress: (address: string) => set({ address }),
    setSanitizedAddress: (address: string) => {
      if (isAddress(address)) {
        set({ sanitizedAddress: address })
      }
    },
    searchError: undefined,
    setSearchError: (error: TransactionHistorySearchError | undefined) =>
      set({ searchError: error })
  }))

export function TransactionHistorySearchBar() {
  const { address, setAddress, setSanitizedAddress, setSearchError } =
    useTransactionHistoryAddressStore(
      state => ({
        address: state.address,
        setAddress: state.setAddress,
        setSanitizedAddress: state.setSanitizedAddress,
        setSearchError: state.setSearchError
      }),
      shallow
    )
  const { address: connectedAddress } = useAccount()
  const [isTestnetMode] = useIsTestnetMode()

  useEffect(() => {
    if (address === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress)
      setSearchError(undefined)
    }
  }, [address, connectedAddress, setSanitizedAddress, setSearchError])

  const searchTxForAddress = useCallback(() => {
    if (address === '') {
      return
    }

    if (!isAddress(address)) {
      setSearchError(TransactionHistorySearchError.INVALID_ADDRESS)
      return
    }

    trackEvent('Search Tx for Address Click', {
      isTestnetMode,
      isConnectedAddress:
        address.toLowerCase() === connectedAddress?.toLowerCase()
    })

    setSanitizedAddress(address)
    setSearchError(undefined)
  }, [
    address,
    setSanitizedAddress,
    setSearchError,
    isTestnetMode,
    connectedAddress
  ])

  return (
    <div className="mb-4 flex flex-row items-stretch gap-1 pr-4 md:pr-0">
      <form
        className={twMerge(
          'relative flex w-full items-center justify-center overflow-hidden rounded border border-gray-dark bg-black text-white md:w-1/2'
        )}
        onSubmit={event => event.preventDefault()}
      >
        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -mt-[7px] h-3 w-3" />
        <Tooltip
          content="Search any wallet address to view transactions and claim withdrawals for them. The funds will arrive at the destination wallet address specified by the original withdrawal transaction."
          wrapperClassName="h-full w-full"
          tippyProps={{
            hideOnClick: false
          }}
        >
          <input
            type="text"
            value={address}
            onChange={event => setAddress(event.target.value)}
            inputMode="search"
            placeholder="Search any wallet address"
            aria-label="Transaction history wallet address input"
            className="h-full w-full bg-transparent py-1 pl-6 pr-3 text-sm font-light placeholder:text-white/60"
            // stop password managers from autofilling
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Tooltip>
        <Button
          type="submit"
          variant="secondary"
          className={twMerge(
            'select-none rounded-l-none border-y-0 border-r-0 border-gray-dark bg-black py-[7px]',
            'hover:bg-white/20 hover:opacity-100',
            'disabled:border-y-0 disabled:border-r-0 disabled:border-l-gray-dark'
          )}
          onClick={searchTxForAddress}
          disabled={!address}
        >
          Search
        </Button>
      </form>
    </div>
  )
}
