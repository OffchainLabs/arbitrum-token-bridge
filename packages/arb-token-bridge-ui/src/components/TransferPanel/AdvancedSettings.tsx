import { useCallback, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/solid'
import {
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

import { useAppState } from '../../state'
import { TransferValidationErrors } from '../../util'
import { Tooltip } from '../common/Tooltip'
import { ExternalLink } from '../common/ExternalLink'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getExplorerUrl } from '../../util/networks'
import { shortenAddress } from '../../util/CommonUtils'

const AdvancedSettings = ({
  destinationAddress,
  onChange,
  error
}: {
  destinationAddress: string
  onChange: (value?: string) => void
  error: TransferValidationErrors | null
}) => {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()
  const { l1, l2, isSmartContractWallet } = useNetworksAndSigners()
  const { walletAddress } = arbTokenBridge
  // hide by default for EOA
  const [collapsed, setCollapsed] = useState(!isSmartContractWallet)
  // disable by default for EOA
  const [disabled, setDisabled] = useState(!isSmartContractWallet)

  const destAddressInputClassName =
    (error ? 'border border-[#cd0000]' : 'border border-gray-dark') +
    ` ${disabled ? 'bg-slate-200' : 'bg-white'}`

  const toAddressEqualsSenderEOA = useMemo(() => {
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
        <ArrowTopRightOnSquareIcon className="mr-1 h-4 w-4" />
        View account in explorer
      </ExternalLink>
    )
  }, [l1, l2, isDepositMode, walletAddress, error, destinationAddress])

  const handleAdvancedSettingsToggle = useCallback(() => {
    // keep visible if destination address provided to make clear where funds go
    // or for SC wallets as destination address is mandatory
    // allow to close if destination address is sender address
    if (!toAddressEqualsSenderEOA || isSmartContractWallet) {
      setCollapsed(false)
      return
    }
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed, toAddressEqualsSenderEOA, isSmartContractWallet])

  return (
    <div className="mt-6">
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
      {!collapsed && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between">
            <span className="flex items-center font-semibold">
              Destination Address
              <Tooltip
                wrapperClassName="ml-1"
                content={
                  <span>
                    Send your funds to a different address.{' '}
                    <b>This is not standard.</b> Be sure you mean to send it
                    here.
                  </span>
                }
              >
                <ExclamationCircleIcon className="h-4 w-4" />
              </Tooltip>
            </span>
          </div>
          <div
            className={twMerge(
              'mt-1 flex w-full rounded-lg px-2 py-1 shadow-input',
              destAddressInputClassName
            )}
          >
            <input
              type="string"
              className="w-full"
              // we want to keep the input empty for the same wallet address
              // placeholder only displays it to the user for assurance
              placeholder={
                !isSmartContractWallet && walletAddress
                  ? shortenAddress(walletAddress)
                  : undefined
              }
              defaultValue={destinationAddress}
              spellCheck={false}
              disabled={disabled && !isSmartContractWallet}
              onChange={e => {
                if (!e.target.value) {
                  onChange(undefined)
                } else {
                  onChange(e.target.value.toLowerCase())
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
          {DestinationAddressExplorer}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      )}
    </div>
  )
}

export { AdvancedSettings }
