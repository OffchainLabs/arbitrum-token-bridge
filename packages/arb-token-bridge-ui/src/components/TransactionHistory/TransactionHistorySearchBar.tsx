import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils.js'
import { Address, useAccount, useNetwork } from 'wagmi'

import { Button } from '../common/Button'
import { useEffect } from 'react'
import { ExternalLink } from '../common/ExternalLink'
import { getExplorerUrl } from '../../util/networks'

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
  const { address: connectedAddress } = useAccount()
  const { chain } = useNetwork()

  useEffect(() => {
    if (address === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress)
    }
  }, [address, connectedAddress, setSanitizedAddress])

  return (
    <div className="mb-4 flex flex-col gap-2">
      <form className="flex flex-col overflow-hidden rounded border border-gray-dark">
        <input
          type="text"
          value={address}
          onChange={event => setAddress(event.target.value)}
          inputMode="search"
          placeholder="0xWalletAddress"
          aria-label="Transaction history wallet address input"
          className="w-full bg-white px-3 py-1 text-sm font-light placeholder:text-gray-400"
          // stop password managers from autofilling
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </form>
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
    </div>
  )
}
