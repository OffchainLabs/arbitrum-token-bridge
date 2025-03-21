import { useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils'
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'
import { useDebounce } from '@uidotdev/usehooks'

import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAccountType } from '../../hooks/useAccountType'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Transition } from '../common/Transition'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.',
  DENYLISTED_ADDRESS = 'The address you entered is a known contract address, and sending funds to it would likely result in losing said funds. If you think this is a mistake, please contact our support.',
  TELEPORT_DISABLED = 'LayerLeap transfers to custom destination addresses are not supported yet.'
}

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.'
}

type AdvancedSettingsStore = {
  advancedSettingsCollapsed: boolean
  setAdvancedSettingsCollapsed: (collapsed: boolean) => void
}

export const useAdvancedSettingsStore = create<AdvancedSettingsStore>(set => ({
  advancedSettingsCollapsed: true,
  setAdvancedSettingsCollapsed: collapsed =>
    set(() => ({ advancedSettingsCollapsed: collapsed }))
}))

async function getDestinationAddressWarning({
  destinationAddress,
  isEOA,
  destinationChainId
}: {
  destinationAddress: string | undefined
  isEOA: boolean
  destinationChainId: number
}) {
  if (!destinationAddress) {
    return null
  }

  if (!isAddress(destinationAddress)) {
    return null
  }

  const destinationIsSmartContract = await addressIsSmartContract(
    destinationAddress,
    destinationChainId
  )

  // checks if trying to send to a contract address, only checks EOA
  if (isEOA && destinationIsSmartContract) {
    return DestinationAddressWarnings.CONTRACT_ADDRESS
  }

  // no warning
  return null
}

export const AdvancedSettings = () => {
  const { advancedSettingsCollapsed, setAdvancedSettingsCollapsed } =
    useAdvancedSettingsStore()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)
  const { address } = useAccount()
  const { isEOA, isSmartContractWallet } = useAccountType()

  const [inputLocked, setInputLocked] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  const [
    { destinationAddress: destinationAddressFromQueryParams },
    setQueryParams
  ] = useArbQueryParams()
  const [destinationAddress, setDestinationAddress] = useState(
    destinationAddressFromQueryParams
  )
  const debouncedDestinationAddress = useDebounce(destinationAddress, 100)
  const { destinationAddressError: error } = useDestinationAddressError()

  const [initialDestinationAddressFromQueryParams] = useState(
    destinationAddressFromQueryParams
  )

  useEffect(() => {
    // Initially hide for EOA and if destination address query param is empty
    setAdvancedSettingsCollapsed(
      isEOA && typeof initialDestinationAddressFromQueryParams === 'undefined'
    )
    // Initially lock for EOA and if destination address query param is empty
    setInputLocked(
      isEOA && typeof initialDestinationAddressFromQueryParams === 'undefined'
    )
  }, [
    initialDestinationAddressFromQueryParams,
    isEOA,
    setAdvancedSettingsCollapsed
  ])

  useEffect(() => {
    // isSubscribed makes sure that only the latest state is written
    let isSubscribed = true

    async function updateWarning() {
      const result = await getDestinationAddressWarning({
        destinationAddress,
        isEOA,
        destinationChainId: networks.destinationChain.id
      })
      if (isSubscribed) {
        setWarning(result)
      }
    }
    updateWarning()

    return () => {
      isSubscribed = false
    }
  }, [
    destinationAddress,
    isEOA,
    childChainProvider,
    parentChainProvider,
    childChain.id,
    parentChain.id,
    networks.destinationChain.id
  ])

  const collapsible = useMemo(() => {
    // cannot collapse if:
    // - SCW because the destination address is mandatory
    // - destination address is not empty
    return isEOA && !destinationAddressFromQueryParams
  }, [destinationAddressFromQueryParams, isEOA])

  useEffect(() => {
    if (!debouncedDestinationAddress) {
      setQueryParams({ destinationAddress: undefined })
      return
    }

    setQueryParams({
      destinationAddress: debouncedDestinationAddress
    })
  }, [debouncedDestinationAddress, setQueryParams])

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  function handleVisibility() {
    if (!collapsible) {
      setAdvancedSettingsCollapsed(false)
      return
    }
    setAdvancedSettingsCollapsed(!advancedSettingsCollapsed)
    setDestinationAddress(undefined)
    setQueryParams({ destinationAddress: undefined })
  }

  return (
    <div className="mb-6 flex flex-col items-end">
      <button
        onClick={handleVisibility}
        className={twMerge(
          'arb-hover flex flex-row items-center text-sm text-white',
          collapsible ? '' : 'pointer-events-none'
        )}
      >
        <span aria-label="advanced settings">Advanced Settings</span>
        {collapsible && (
          <ChevronDownIcon
            className={twMerge(
              'ml-1 h-4 w-4 transition-transform duration-200',
              advancedSettingsCollapsed ? 'rotate-0' : '-rotate-180'
            )}
          />
        )}
      </button>
      <Transition isOpen={!advancedSettingsCollapsed} className="w-full">
        <div className="mt-2 rounded border border-white/30 bg-brick-dark p-2 text-white">
          <p className="text-sm font-light">
            {isEOA ? (
              <>
                Send your funds to a different address.{' '}
                <span className="font-semibold">This is not standard.</span> Be
                sure you mean to send it here, or it may lead to an
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
              'my-1 flex w-full items-center rounded border px-2 py-1 shadow-input',
              inputLocked
                ? 'border-white/20 bg-white/20'
                : 'border-white bg-black/40',
              error ? 'border-red-400' : '',
              warning && !error ? 'border-yellow-500' : ''
            )}
          >
            <input
              className="w-full bg-transparent text-white placeholder-white/50"
              placeholder={isEOA ? address : 'Enter Custom Destination Address'}
              value={destinationAddress}
              disabled={inputLocked}
              spellCheck={false}
              onChange={e =>
                setDestinationAddress(e.target.value?.toLowerCase().trim())
              }
              aria-label="Custom Destination Address Input"
            />
            {isEOA && (
              <button
                onClick={() => setInputLocked(!inputLocked)}
                aria-label="Custom destination input lock"
              >
                {inputLocked ? (
                  <LockClosedIcon height={16} />
                ) : (
                  <LockOpenIcon height={16} />
                )}
              </button>
            )}
          </div>
        </div>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {!error && warning && (
          <p className="mt-1 text-xs text-yellow-500">{warning}</p>
        )}
        {destinationAddress && !error && (
          <ExternalLink
            className="arb-hover mt-2 flex w-fit items-center text-xs font-medium text-white/50"
            href={`${getExplorerUrl(
              networks.destinationChain.id
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
      </Transition>
    </div>
  )
}
