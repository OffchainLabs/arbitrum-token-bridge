import { useCallback, useEffect, useMemo, useState } from 'react'
import { utils } from 'ethers'
import { twMerge } from 'tailwind-merge'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/solid'
import {
  ArrowDownTrayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

import { useAppState } from '../../state'
import { CustomDestinationTransferValidationErrors } from './TransferPanel'
import { Tooltip } from '../common/Tooltip'
import { ExternalLink } from '../common/ExternalLink'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getExplorerUrl } from '../../util/networks'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useAccountType } from '../../hooks/useAccountType'

export const AdvancedSettings = ({
  destinationAddress,
  onChange,
  error
}: {
  destinationAddress: string
  onChange: (value?: string) => void
  error: CustomDestinationTransferValidationErrors | null
}) => {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const { isEOA, isSmartContractWallet } = useAccountType()
  const { walletAddress } = arbTokenBridge
  // hide by default for EOA
  const [collapsed, setCollapsed] = useState(true)
  // disable by default for EOA
  const [disabled, setDisabled] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  const destinationAddressSameAsSenderEOA = useMemo(() => {
    if (isSmartContractWallet || !walletAddress) return false
    // defaults to wallet address
    if (!destinationAddress) return true
    return destinationAddress.toLowerCase() === walletAddress.toLowerCase()
  }, [destinationAddress, isSmartContractWallet, walletAddress])

  const DestinationAddressExplorer = useMemo(() => {
    const explorerUrl = getExplorerUrl((isDepositMode ? l2 : l1).network.id)

    if (!explorerUrl || error) {
      return null
    }
    return (
      <ExternalLink
        className="mt-2 flex w-fit items-center"
        href={`${explorerUrl}/address/${destinationAddress || walletAddress}`}
      >
        <ArrowDownTrayIcon height={16} className="mr-2 -rotate-90" />
        View account in explorer
      </ExternalLink>
    )
  }, [l1, l2, isDepositMode, walletAddress, error, destinationAddress])

  useEffect(() => {
    if (isSmartContractWallet) {
      setDisabled(false)
      setCollapsed(false)
    }
  }, [isSmartContractWallet])

  useEffect(() => {
    let isLatestUpdate = true
    async function getWarning() {
      if (!utils.isAddress(destinationAddress)) {
        setWarning(null)
        return
      }
      const provider = isDepositMode ? l2.provider : l1.provider
      if (
        !isSmartContractWallet &&
        (await addressIsSmartContract(destinationAddress, provider))
      ) {
        if (isLatestUpdate) {
          setWarning(
            'The destination address is a contract address. Make sure it is a valid wallet address before sending a transaction.'
          )
        }
      } else {
        setWarning(null)
      }
    }

    getWarning()
    return () => {
      isLatestUpdate = false
    }
  }, [
    destinationAddress,
    isDepositMode,
    isSmartContractWallet,
    l1.provider,
    l2.provider
  ])

  const handleAdvancedSettingsToggle = useCallback(() => {
    // keep visible if destination address provided to make clear where funds go
    // or for SC wallets as destination address is mandatory
    // allow to close if destination address is sender address
    if (!destinationAddressSameAsSenderEOA || isSmartContractWallet) {
      setCollapsed(false)
      return
    }
    setCollapsed(!collapsed)
  }, [
    collapsed,
    setCollapsed,
    destinationAddressSameAsSenderEOA,
    isSmartContractWallet
  ])

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  return (
    <div className="mt-6">
      {!isSmartContractWallet && (
        <button
          onClick={handleAdvancedSettingsToggle}
          className="flex flex-row items-center text-gray-dark"
        >
          <span className="text-md">Advanced Settings</span>
          {collapsed ? (
            <ChevronDownIcon className="ml-1 h-4 w-4" />
          ) : (
            <ChevronUpIcon className="ml-1 h-4 w-4" />
          )}
        </button>
      )}
      {!collapsed && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between">
            <span className="flex items-center font-semibold">
              Custom Destination Address
              <Tooltip
                wrapperClassName="ml-1"
                content={
                  <span>
                    This is where your funds will end up at.{' '}
                    {isSmartContractWallet
                      ? ''
                      : 'Defaults to your wallet address.'}
                  </span>
                }
              >
                <InformationCircleIcon className="h-4 w-4" />
              </Tooltip>
            </span>
          </div>
          <p className="my-2 text-sm text-gray-dark">
            {isSmartContractWallet ? (
              <>
                With Smart Contract Wallets, you <b>must specify an address</b>{' '}
                you&apos;d like the funds sent to.
              </>
            ) : (
              <>
                Send your funds to a different address.{' '}
                <b>This is not standard.</b> Be sure you mean to send it here.
              </>
            )}
          </p>
          <div
            className={twMerge(
              'my-1 flex w-full rounded-lg border px-2 py-1 shadow-input',
              error ? 'border border-[#cd0000]' : 'border border-gray-dark',
              !error && warning ? 'border-yellow-600' : '',
              disabled ? 'bg-slate-200' : 'bg-white'
            )}
          >
            <input
              type="string"
              className="w-full"
              defaultValue={destinationAddress}
              placeholder={isSmartContractWallet ? undefined : walletAddress}
              spellCheck={false}
              disabled={disabled && !isSmartContractWallet}
              onChange={e => {
                if (!e.target.value) {
                  onChange(undefined)
                } else {
                  onChange(e.target.value.toLowerCase().trim())
                }
              }}
              // disables 1password on the field
              data-1p-ignore
            />
            {!isSmartContractWallet && (
              <button onClick={() => setDisabled(!disabled)}>
                {disabled ? (
                  <LockClosedIcon className="mr-2 h-5 w-5 text-slate-600" />
                ) : (
                  <LockOpenIcon className="mr-2 h-5 w-5 text-slate-600" />
                )}
              </button>
            )}
          </div>
          {error && <span className="text-xs text-red-400">{error}</span>}
          {/* just a warning, can still transfer */}
          {!error && warning && (
            <span className="mt-2 flex text-xs text-yellow-600">{warning}</span>
          )}
          {DestinationAddressExplorer}
        </div>
      )}
    </div>
  )
}
