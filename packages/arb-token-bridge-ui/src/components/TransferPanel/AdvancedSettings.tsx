import { useEffect, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

import { useAppState } from '../../state'
import { useAccountType } from '../../hooks/useAccountType'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

export enum AdvancedSettingsErrors {
  INVALID_ADDRESS = 'The destination address is not valid.'
}

export const AdvancedSettings = ({
  destinationAddress = '',
  onChange,
  error
}: {
  destinationAddress?: string
  onChange: (value?: string) => void
  error: AdvancedSettingsErrors | null
}) => {
  const {
    app: { selectedToken, isDepositMode }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const { isEOA = false, isSmartContractWallet = false } = useAccountType()

  const [collapsed, setCollapsed] = useState(true)

  useEffect(
    // Show on page load if SC wallet since destination address mandatory
    () => setCollapsed(!isSmartContractWallet),
    [isSmartContractWallet]
  )

  // Disabled for ETH
  if (!selectedToken) {
    return null
  }

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  function handleVisibility() {
    // Keep visible for SC wallets since destination address is mandatory
    if (!isSmartContractWallet) {
      setCollapsed(!collapsed)
    }
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
          {destinationAddress && !error && (
            <ExternalLink
              className="mt-2 flex w-fit items-center"
              href={`${getExplorerUrl(
                (isDepositMode ? l2 : l1).network.id
              )}/address/${destinationAddress}`}
            >
              <ArrowDownTrayIcon height={16} className="mr-2 -rotate-90" />
              View account in explorer
            </ExternalLink>
          )}
        </>
      )}
      {isSmartContractWallet && error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
