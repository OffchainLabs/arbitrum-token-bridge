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
import { AccountType } from '../../util/AccountUtils'
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
  accountType,
  destinationChainId
}: {
  destinationAddress: string | undefined
  accountType: AccountType
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
  if (
    (accountType === 'externally-owned-account' ||
      accountType === 'delegated-account') &&
    destinationIsSmartContract
  ) {
    return DestinationAddressWarnings.CONTRACT_ADDRESS
  }

  // no warning
  return null
}

export const AdvancedSettings = ({
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
  const { accountType, isLoading: isLoadingAccountType } = useAccountType()

  const [inputLocked, setInputLocked] = useState(
    !destinationAddress && accountType !== 'smart-contract-wallet'
  )

  const { destinationAddressError: error } =
    useDestinationAddressError(destinationAddress)
  const { data: warning } = useSWRImmutable(
    destinationAddress &&
      !isLoadingAccountType &&
      typeof accountType !== 'undefined'
      ? [
          destinationAddress,
          accountType,
          networks.destinationChain.id,
          isDepositMode,
          childChainProvider,
          parentChainProvider,
          childChain.id,
          parentChain.id,
          'useDestinationAddressWarning'
        ]
      : null,
    ([_destinationAddress, _accountType, _destinationChainId]) =>
      getDestinationAddressWarning({
        destinationAddress: _destinationAddress,
        accountType: _accountType,
        destinationChainId: _destinationChainId
      })
  )

  const isSmartContractWallet = accountType === 'smart-contract-wallet'

  if (isLoadingAccountType) {
    return null
  }

  return (
    <div className="mb-6 flex flex-col items-end">
      <div className="mt-2 w-full rounded border border-white/30 bg-brick-dark p-2 text-white">
        <p className="text-sm font-light">
          {isSmartContractWallet ? (
            <>
              With Smart Contract Wallets, you{' '}
              <span className="font-semibold">must specify an address</span>{' '}
              you&apos;d like the funds sent to.
            </>
          ) : (
            <>
              Send your funds to a different address.{' '}
              <span className="font-semibold">This is not standard.</span> Be
              sure you mean to send it here, or it may lead to an irrecoverable
              loss of funds.
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
            placeholder={
              isSmartContractWallet ? 'Enter Destination Address' : address
            }
            value={destinationAddress}
            disabled={inputLocked}
            spellCheck={false}
            onChange={e => {
              onDestinationAddressChange(e.target.value?.toLowerCase().trim())
            }}
            aria-label="Custom Destination Address Input"
          />
          {!isSmartContractWallet && (
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
