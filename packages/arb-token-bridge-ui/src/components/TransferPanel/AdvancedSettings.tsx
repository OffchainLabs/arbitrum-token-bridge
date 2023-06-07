import { useEffect, useState } from 'react'
import { isAddress } from 'ethers/lib/utils.js'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

import { useAppState } from '../../state'
import { useAccountType } from '../../hooks/useAccountType'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid wallet address.',
  REQUIRED_ADDRESS = 'The destination address is required.'
}

export function getDestinationAddressError({
  destinationAddress,
  isEOA
}: {
  destinationAddress?: string
  isEOA: boolean
}): DestinationAddressErrors | null {
  if (!destinationAddress) {
    if (isEOA) {
      return null
    }
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS
  }
  if (!isAddress(destinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS
  }
  return null
}

export const AdvancedSettings = ({
  destinationAddress = '',
  onChange,
  error
}: {
  destinationAddress?: string
  onChange: (value?: string) => void
  error: DestinationAddressErrors | null
}) => {
  const {
    app: { selectedToken, isDepositMode }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const { isEOA = false, isSmartContractWallet = false } = useAccountType()

  const [collapsed, setCollapsed] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(
    // Show on page load if SC wallet since destination address mandatory
    () => setCollapsed(!isSmartContractWallet),
    [isSmartContractWallet]
  )

  useEffect(() => {
    // checks if trying to send to a contract address
    async function getWarning() {
      // only check for EOA, contract wallets will often send to another contract wallet
      if (isEOA && isAddress(destinationAddress)) {
        const isContractAddress = await addressIsSmartContract(
          destinationAddress,
          isDepositMode ? l2.provider : l1.provider
        )
        setWarning(
          isContractAddress
            ? 'The destination address is a contract address. Please make sure it is a valid wallet address.'
            : null
        )
      } else {
        setWarning(null)
      }
    }
    getWarning()

    return () => setWarning(null)
  }, [destinationAddress, l1.provider, l2.provider, isDepositMode, isEOA])

  // Disabled for ETH
  if (!selectedToken) {
    return null
  }

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  function handleVisibility() {
    // Keep visible for SC wallets since destination address is mandatory
    // Or if destination address is provided
    if (isSmartContractWallet || destinationAddress) {
      setCollapsed(false)
      return
    }
    setCollapsed(!collapsed)
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleVisibility}
        className="flex flex-row items-center text-gray-dark"
      >
        <span className="text-lg font-semibold">Advanced Settings</span>
        {collapsed ? (
          <ChevronDownIcon className="ml-1 h-4 w-4" />
        ) : (
          <ChevronUpIcon className="ml-1 h-4 w-4" />
        )}
      </button>
      {!collapsed && (
        <>
          <div className="mt-2">
            <span className="text-md text-gray-dark">
              Destination Address
              {!isSmartContractWallet ? ' (optional)' : ''}
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-dark px-2 py-1 shadow-input"
              placeholder="Enter destination address"
              defaultValue={destinationAddress}
              spellCheck={false}
              onChange={e => onChange(e.target.value?.toLowerCase())}
            />
          </div>
          {error && <span className="text-xs text-red-400">{error}</span>}
          {!error && warning && (
            <span className="text-xs text-yellow-500">{warning}</span>
          )}
        </>
      )}
    </div>
  )
}
