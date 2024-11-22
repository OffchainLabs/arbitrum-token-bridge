import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils.js'
import { Address, useAccount } from 'wagmi'
import { useCallback, useEffect } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Button } from '../common/Button'

export enum TransactionHistorySearchError {
  INVALID_ADDRESS = 'That doesn’t seem to be a valid address, please try again.'
}

type TransactionHistoryAddressStore = {
  address: string
  sanitizedAddress: Address | undefined
  searchError: any
  setAddress: (address: string) => void
  setSanitizedAddress: (address: string) => void
  setSearchError: (error: any) => void
}

export const useTransactionHistoryAddressStore =
  create<TransactionHistoryAddressStore>((set, get) => ({
    address: '',
    sanitizedAddress: undefined,
    setAddress: (address: string) => set({ address }),
    setSanitizedAddress: (address: string) => {
      if (isAddress(address)) {
        set({ sanitizedAddress: address })
      }
    },
    searchError: undefined,
    setSearchError: (error: string | undefined) => set({ searchError: error })
  }))

export function TransactionHistorySearchBar() {
  const { address, setAddress, setSanitizedAddress, setSearchError } =
    useTransactionHistoryAddressStore()
  const { address: connectedAddress } = useAccount()

  useEffect(() => {
    if (address === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress)
    }
  }, [address, connectedAddress, setSanitizedAddress])

  const searchTxForAddress = useCallback(() => {
    if (isAddress(address)) {
      setSanitizedAddress(address)
    } else {
      setSearchError(TransactionHistorySearchError.INVALID_ADDRESS)
    }
  }, [address, setSanitizedAddress, setSearchError])

  return (
    <div className="mb-4 flex flex-row items-stretch">
      <form
        className={twMerge(
          'flex items-center justify-center overflow-hidden rounded border border-gray-dark bg-black text-white md:w-1/2'
        )}
        onSubmit={event => event.preventDefault()}
      >
        <MagnifyingGlassIcon className="ml-3 mr-1 h-3 w-3" />
        <input
          type="text"
          value={address}
          onChange={event => setAddress(event.target.value)}
          inputMode="search"
          placeholder="Search by address"
          aria-label="Transaction history wallet address input"
          className="h-full w-full bg-transparent py-1 pl-1 pr-3 text-sm font-light placeholder:text-white/60"
          // stop password managers from autofilling
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <Button
          variant="secondary"
          className="select-none rounded-l-none border-y-0 border-r-0 border-gray-dark bg-black py-[7px] hover:bg-white/20 hover:opacity-100"
          onClick={searchTxForAddress}
        >
          Search
        </Button>
      </form>
    </div>
  )
}
