import { useEffect, useState } from 'react'
import { isAddress } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAppState } from '../../state'
import { useAccountType } from '../../hooks/useAccountType'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.'
}

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.'
}

export function getDestinationAddressError({
  destinationAddress,
  isSmartContractWallet
}: {
  destinationAddress?: string
  isSmartContractWallet: boolean
}): DestinationAddressErrors | null {
  if (!destinationAddress && isSmartContractWallet) {
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS
  }

  if (destinationAddress && !isAddress(destinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS
  }

  // no error
  return null
}

async function getDestinationAddressWarning({
  destinationAddress,
  isEOA,
  destinationProvider
}: {
  destinationAddress: string
  isEOA: boolean
  destinationProvider: Provider
}) {
  if (!isAddress(destinationAddress)) {
    return null
  }

  const destinationIsSmartContract = await addressIsSmartContract(
    destinationAddress,
    destinationProvider
  )

  // checks if trying to send to a contract address, only checks EOA
  if (isEOA && destinationIsSmartContract) {
    return DestinationAddressWarnings.CONTRACT_ADDRESS
  }

  // no warning
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
    async function updateWarning() {
      setWarning(
        await getDestinationAddressWarning({
          destinationAddress,
          isEOA,
          destinationProvider: (isDepositMode ? l2 : l1).provider
        })
      )
    }
    updateWarning()

    return () => setWarning(null)
  }, [destinationAddress, isDepositMode, isEOA, l2, l1])

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
          {destinationAddress && !error && (
            <ExternalLink
              className="arb-hover mt-2 flex w-fit items-center text-xs font-bold text-gray-dark"
              href={`${getExplorerUrl(
                (isDepositMode ? l2 : l1).network.id
              )}/address/${destinationAddress}`}
            >
              <ArrowDownTrayIcon height={12} className="mr-2 -rotate-90" />
              View account in explorer
            </ExternalLink>
          )}
        </>
      )}
    </div>
  )
}
