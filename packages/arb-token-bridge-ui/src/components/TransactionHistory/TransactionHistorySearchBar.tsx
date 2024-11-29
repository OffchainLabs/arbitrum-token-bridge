import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils.js'
import { Address, useAccount } from 'wagmi'
import { useCallback, useEffect } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

import { Button } from '../common/Button'
import { isValidTxHash } from './helpers'

export enum TransactionHistorySearchError {
  INVALID_ADDRESS = 'That doesn’t seem to be a valid address, please try again.'
}

type TransactionHistoryAddressStore = {
  addressOrTxHash: string
  sanitizedAddress: Address | undefined
  sanitizedTxHash: string | undefined
  searchError: TransactionHistorySearchError | undefined
  setAddressOrTxHash: (addressOrTxHash: string) => void
  setSanitizedAddress: (address: string) => void
  setSanitizedTxHash: (txHash: string) => void
  setSearchError: (error: TransactionHistorySearchError | undefined) => void
}

export const useTransactionHistoryAddressStore =
  create<TransactionHistoryAddressStore>(set => ({
    addressOrTxHash: '',
    sanitizedAddress: undefined,
    setAddressOrTxHash: (addressOrTxHash: string) => set({ addressOrTxHash }),
    setSanitizedAddress: (address: string) => {
      if (isAddress(address)) {
        set({ sanitizedAddress: address })
      }
    },
    sanitizedTxHash: undefined,
    setSanitizedTxHash: (txHash: string | undefined) => {
      if (isValidTxHash(txHash)) {
        set({
          sanitizedTxHash: txHash
        })
      }

      if (typeof txHash === 'undefined') {
        set({
          sanitizedTxHash: undefined
        })
      }
    },
    searchError: undefined,
    setSearchError: (error: TransactionHistorySearchError | undefined) =>
      set({ searchError: error })
  }))

export function TransactionHistorySearchBar() {
  const {
    addressOrTxHash,
    setAddressOrTxHash,
    setSanitizedAddress,
    setSanitizedTxHash,
    setSearchError
  } = useTransactionHistoryAddressStore()
  const { address: connectedAddress } = useAccount()

  useEffect(() => {
    if (addressOrTxHash === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress)
      setSanitizedTxHash(undefined)
      setSearchError(undefined)
    }
  }, [addressOrTxHash, connectedAddress, setSanitizedAddress, setSearchError])

  const searchTxForAddress = useCallback(() => {
    if (addressOrTxHash === '') {
      return
    }

    if (isValidTxHash(addressOrTxHash)) {
      setSanitizedTxHash(addressOrTxHash)
      setSearchError(undefined)
      return
    }

    if (!isAddress(addressOrTxHash)) {
      setSearchError(TransactionHistorySearchError.INVALID_ADDRESS)
      return
    }

    setSanitizedAddress(addressOrTxHash)
    setSearchError(undefined)
  }, [addressOrTxHash, setSanitizedAddress, setSanitizedTxHash, setSearchError])

  return (
    <div className="mb-4 flex flex-row items-stretch pr-4 md:pr-0">
      <form
        className={twMerge(
          'flex w-full items-center justify-center overflow-hidden rounded border border-gray-dark bg-black text-white md:w-1/2'
        )}
        onSubmit={event => event.preventDefault()}
      >
        <MagnifyingGlassIcon className="ml-3 mr-1 h-3 w-3" />
        <input
          type="text"
          value={addressOrTxHash}
          onChange={event => setAddressOrTxHash(event.target.value)}
          inputMode="search"
          placeholder="Search by address or transaction hash"
          aria-label="Transaction history wallet address input"
          className="h-full w-full bg-transparent py-1 pl-1 pr-3 text-sm font-light placeholder:text-white/60"
          // stop password managers from autofilling
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <Button
          variant="secondary"
          className={twMerge(
            'select-none rounded-l-none border-y-0 border-r-0 border-gray-dark bg-black py-[7px]',
            'hover:bg-white/20 hover:opacity-100',
            'disabled:border-y-0 disabled:border-r-0 disabled:border-l-gray-dark'
          )}
          onClick={searchTxForAddress}
          disabled={!addressOrTxHash}
        >
          Search
        </Button>
      </form>
    </div>
  )
}
