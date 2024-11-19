import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils.js'
import { Address, useAccount, useNetwork } from 'wagmi'

import { Button } from '../common/Button'
import { useEffect, useState } from 'react'
import { ExternalLink } from '../common/ExternalLink'
import { getExplorerUrl } from '../../util/networks'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'

type TransactionHistoryAddressStore = {
  address: string
  sanitizedAddress: Address | undefined
  setAddress: (address: string) => void
  setSanitizedAddress: (address: string) => void
}

export const useTransactionHistoryAddressStore =
  create<TransactionHistoryAddressStore>((set, get) => ({
    address: '',
    sanitizedAddress: undefined,
    setAddress: (address: string) => {
      const currentSanitizedAddress = get().sanitizedAddress

      set({ address })

      if (
        typeof currentSanitizedAddress !== 'undefined' &&
        isAddress(currentSanitizedAddress) &&
        !isAddress(address)
      ) {
        return
      }

      get().setSanitizedAddress(address)
    },
    setSanitizedAddress: (address: string) => {
      if (isAddress(address)) {
        set({ sanitizedAddress: address })
      } else {
        set({ sanitizedAddress: undefined })
      }
    }
  }))

export function TransactionHistorySearchBar() {
  const { address, setAddress, setSanitizedAddress, sanitizedAddress } =
    useTransactionHistoryAddressStore()
  const [showAddressField, setShowAddressField] = useState(false)
  const { address: connectedAddress } = useAccount()
  const { chain } = useNetwork()

  useEffect(() => {
    if (address === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress)
    }
  }, [address, connectedAddress, setSanitizedAddress])

  return (
    <div className="mb-4 flex flex-col gap-2">
      <span className="text-sm text-white">
        Showing transactions for{' '}
        {chain ? (
          <ExternalLink
            href={`${getExplorerUrl(chain.id)}/address/${sanitizedAddress}`}
            className="text-blue-400 underline hover:no-underline"
          >
            {sanitizedAddress}
          </ExternalLink>
        ) : (
          sanitizedAddress
        )}
      </span>
      <div className="flex flex-row items-center">
        <Button
          variant="secondary"
          className={twMerge(
            'h-[32px] w-min items-center px-3',
            'no-select [&>div>span]:flex [&>div>span]:w-max [&>div>span]:flex-row [&>div>span]:items-center [&>div>span]:justify-center',
            showAddressField ? 'hidden' : 'flex'
          )}
          truncate={false}
          onClick={() => setShowAddressField(true)}
        >
          <MagnifyingGlassIcon className="mr-1 h-3 w-3" />
          <span>Check another address</span>
        </Button>
        <form
          className={twMerge(
            'items-center justify-center overflow-hidden rounded border border-gray-dark bg-white/[0.15] text-white md:w-1/2',
            showAddressField ? 'flex' : 'hidden'
          )}
          onSubmit={event => event.preventDefault()}
        >
          <MagnifyingGlassIcon className="ml-3 mr-1 h-3 w-3" />
          <input
            type="text"
            value={address}
            onChange={event => setAddress(event.target.value)}
            inputMode="search"
            placeholder="0xWalletAddress"
            aria-label="Transaction history wallet address input"
            className="w-full bg-transparent py-1 pl-1 pr-3 text-sm font-light placeholder:text-white/60"
            // stop password managers from autofilling
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </form>
      </div>
    </div>
  )
}
