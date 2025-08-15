import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { isAddress } from 'ethers/lib/utils'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'

import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAccountType } from '../../hooks/useAccountType'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import useSWRImmutable from 'swr/immutable'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.',
  DENYLISTED_ADDRESS = 'The address you entered is a known contract address, and sending funds to it would likely result in losing said funds. If you think this is a mistake, please contact our support.',
  TELEPORT_DISABLED = 'LayerLeap transfers to custom destination addresses are not supported yet.'
}

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.'
}

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

export const CustomDestinationAddressInput = ({
  destinationAddress,
  onDestinationAddressChange
}: {
  destinationAddress: string | undefined
  onDestinationAddressChange: (e: string) => void
}) => {
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

  const [inputLocked, setInputLocked] = useState(
    !destinationAddress && !isSmartContractWallet
  )

  const { destinationAddressError: error } =
    useDestinationAddressError(destinationAddress)
  const { data: warning } = useSWRImmutable(
    destinationAddress
      ? [
          destinationAddress,
          isEOA,
          networks.destinationChain.id,
          isDepositMode,
          childChainProvider,
          parentChainProvider,
          childChain.id,
          parentChain.id,
          'useDestinationAddressWarning'
        ]
      : null,
    ([_destinationAddress, _isEOA, _destinationChainId]) =>
      getDestinationAddressWarning({
        destinationAddress: _destinationAddress,
        isEOA: _isEOA,
        destinationChainId: _destinationChainId
      })
  )

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded border border-white/10 bg-white/5 p-2 text-white">
      <p className="text-sm font-light">
        {isEOA ? (
          <>
            Send your funds to a different address. Be sure you mean to send it
            here.
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
          onChange={e => {
            onDestinationAddressChange(e.target.value?.toLowerCase().trim())
          }}
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

      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && warning && (
        <p className="text-xs text-yellow-500">{warning}</p>
      )}
      {destinationAddress && !error && (
        <ExternalLink
          className="arb-hover flex w-fit items-center text-xs font-medium text-white/50"
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
    </div>
  )
}
