import { useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { isAddress } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'

import { Tooltip } from '../common/Tooltip'
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
  const { address } = useAccount()
  const { l1, l2 } = useNetworksAndSigners()
  const { isEOA = false, isSmartContractWallet = false } = useAccountType()

  const [collapsed, setCollapsed] = useState(true)
  const [inputLocked, setInputLocked] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    // Initially hide for EOA
    setCollapsed(isEOA)
    // Initially lock for EOA
    setInputLocked(isEOA)
  }, [isEOA])

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

  useEffect(() => setCollapsed(isEOA), [isEOA])

  const collapsible = useMemo(() => {
    // cannot collapse if:
    // - SCW because the destination address is mandatory
    // - destination address is not empty
    return isEOA && !destinationAddress
  }, [destinationAddress, isEOA])

  // Disabled for ETH
  if (!selectedToken) {
    return null
  }

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  function handleVisibility() {
    if (!collapsible) {
      setCollapsed(false)
      return
    }
    setCollapsed(!collapsed)
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleVisibility}
        className={twMerge(
          'arb-hover flex flex-row items-center text-gray-dark',
          collapsible ? '' : 'pointer-events-none'
        )}
      >
        <span className="font-medium">Advanced Settings</span>
        {collapsible && (
          <ChevronDownIcon
            className={twMerge('ml-1 h-4 w-4', collapsed ? '' : 'rotate-180')}
          />
        )}
      </button>
      {!collapsed && (
        <>
          <div className="mt-2">
            <div className="flex items-center space-x-1">
              <span className="font-medium">Custom Destination Address</span>
              <Tooltip
                content={
                  <span>
                    This is where your funds will end up at.
                    {isEOA ? ' Defaults to your wallet address.' : ''}
                  </span>
                }
              >
                <InformationCircleIcon strokeWidth={2} height={16} />
              </Tooltip>
            </div>
            <p className="my-2 text-sm font-light text-gray-dark">
              {isEOA ? (
                <>
                  Send your funds to a different address.{' '}
                  <span className="font-semibold">This is not standard.</span>{' '}
                  Be sure you mean to send it here, or it may lead to an
                  irrecoverable loss of funds.
                </>
              ) : (
                <>
                  With Smart Contract Wallets, you{' '}
                  <span className="font-semibold">must specify an address</span>{' '}
                  you&apos;d like the funds sent to.
                </>
              )}
            </p>
            <div
              className={twMerge(
                'my-1 flex w-full items-center rounded-lg border border-gray-dark px-2 py-1 shadow-input',
                inputLocked ? 'bg-slate-200' : 'bg-white',
                error ? 'border-red-400' : '',
                warning && !error ? 'border-yellow-500' : ''
              )}
            >
              <input
                className="w-full"
                placeholder={
                  isEOA ? address : 'Enter Custom Destination Address'
                }
                value={destinationAddress}
                disabled={inputLocked}
                spellCheck={false}
                onChange={e => onChange(e.target.value?.toLowerCase().trim())}
              />
              {isEOA && (
                <button onClick={() => setInputLocked(!inputLocked)}>
                  {inputLocked ? (
                    <LockClosedIcon
                      height={20}
                      className="mr-2 text-slate-600"
                    />
                  ) : (
                    <LockOpenIcon height={20} className="mr-2 text-slate-600" />
                  )}
                </button>
              )}
            </div>
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
              <ArrowDownTrayIcon
                height={12}
                strokeWidth={3}
                className="mr-1 -rotate-90"
              />
              View account in explorer
            </ExternalLink>
          )}
        </>
      )}
    </div>
  )
}
