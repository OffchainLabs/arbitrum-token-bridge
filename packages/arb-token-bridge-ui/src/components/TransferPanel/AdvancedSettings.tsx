import { useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { create } from 'zustand'
import { isAddress } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'

import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAppState } from '../../state'
import { useAccountType } from '../../hooks/useAccountType'
import {
  addressIsSmartContract,
  addressIsDenylisted
} from '../../util/AddressUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Transition } from '../common/Transition'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.',
  DENYLISTED_ADDRESS = 'The address you entered is a known contract address, and sending funds to it would likely result in losing said funds. If you think this is a mistake, please contact our support.'
}

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.'
}

type DestinationAddressStore = {
  error: DestinationAddressErrors | null
  destinationAddress: string | undefined
  setError: (error: DestinationAddressErrors | null) => void
  setDestinationAddress: (destinationAddress: string | undefined) => void
}

export const useDestinationAddressStore = create<DestinationAddressStore>(
  set => ({
    error: null,
    destinationAddress: undefined,
    setError: error => set(() => ({ error })),
    setDestinationAddress: destinationAddress =>
      set(() => ({ destinationAddress }))
  })
)

export async function getDestinationAddressError({
  destinationAddress,
  isSmartContractWallet
}: {
  destinationAddress?: string
  isSmartContractWallet: boolean
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSmartContractWallet) {
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS
  }

  if (!destinationAddress) {
    return null
  }

  if (!isAddress(destinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS
  }
  if (await addressIsDenylisted(destinationAddress)) {
    return DestinationAddressErrors.DENYLISTED_ADDRESS
  }

  // no error
  return null
}

async function getDestinationAddressWarning({
  destinationAddress,
  isEOA,
  destinationProvider
}: {
  destinationAddress: string | undefined
  isEOA: boolean
  destinationProvider: Provider
}) {
  if (!destinationAddress) {
    return null
  }

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

export const AdvancedSettings = () => {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
  const { address } = useAccount()
  const { isEOA, isSmartContractWallet } = useAccountType()

  const [collapsed, setCollapsed] = useState(true)
  const [inputLocked, setInputLocked] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  const { error, setError, destinationAddress, setDestinationAddress } =
    useDestinationAddressStore()

  useEffect(() => {
    // Initially hide for EOA
    setCollapsed(isEOA)
    // Initially lock for EOA
    setInputLocked(isEOA)
  }, [isEOA])

  useEffect(() => {
    async function updateError() {
      setError(
        await getDestinationAddressError({
          destinationAddress,
          isSmartContractWallet
        })
      )
    }
    updateError()
  }, [destinationAddress, isSmartContractWallet, setError])

  useEffect(() => {
    // isSubscribed makes sure that only the latest state is written
    let isSubscribed = true

    async function updateWarning() {
      const result = await getDestinationAddressWarning({
        destinationAddress,
        isEOA,
        destinationProvider: isDepositMode
          ? childChainProvider
          : parentChainProvider
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
    isDepositMode,
    isEOA,
    childChainProvider,
    parentChainProvider
  ])

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
    <div className="mb-6 flex flex-col items-end">
      <button
        onClick={handleVisibility}
        className={twMerge(
          'arb-hover flex flex-row items-center text-sm text-white',
          collapsible ? '' : 'pointer-events-none'
        )}
      >
        <span>Advanced Settings</span>
        {collapsible && (
          <ChevronDownIcon
            className={twMerge(
              'ml-1 h-4 w-4 transition-transform duration-200',
              collapsed ? 'rotate-0' : '-rotate-180'
            )}
          />
        )}
      </button>
      <Transition isOpen={!collapsed}>
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
              'my-1 flex w-full items-center rounded-lg border border-white bg-black/40 px-2 py-1 shadow-input',
              error ? 'border-red-400' : '',
              warning && !error ? 'border-yellow-500' : ''
            )}
          >
            <input
              className="w-full bg-transparent text-white"
              placeholder={isEOA ? address : 'Enter Custom Destination Address'}
              value={destinationAddress}
              disabled={inputLocked}
              spellCheck={false}
              onChange={e =>
                setDestinationAddress(e.target.value?.toLowerCase().trim())
              }
            />
            {isEOA && (
              <button onClick={() => setInputLocked(!inputLocked)}>
                {inputLocked ? (
                  <LockClosedIcon height={20} className="mr-2" />
                ) : (
                  <LockOpenIcon height={20} className="mr-2" />
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
              isDepositMode ? childChain.id : parentChain.id
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
