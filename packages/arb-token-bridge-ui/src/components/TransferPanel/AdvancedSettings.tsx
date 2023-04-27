import { useCallback, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/solid'
import {
  ExternalLinkIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/outline'

import { useAppState } from '../../state'
import { Tooltip } from '../common/Tooltip'
import { ExternalLink } from '../common/ExternalLink'
import { TransferValidationErrors } from 'src/util/AddressUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

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
  const networksAndSigners = useNetworksAndSigners()
  const { l1, l2, isSmartContractWallet } = networksAndSigners
  const { walletAddress } = arbTokenBridge
  // hide by default for EOA
  const [collapsed, setCollapsed] = useState(!isSmartContractWallet)
  // disable by default for EOA
  const [disabled, setDisabled] = useState(!isSmartContractWallet)

  const destAddressInputClassName =
    (error ? 'border border-[#cd0000]' : 'border border-gray-9') +
    ` ${disabled ? 'bg-slate-200' : 'bg-white'}`

  const toAddressEqualsSenderEOA = useMemo(() => {
    if (isSmartContractWallet) return false
    // defaults to wallet address
    if (!destinationAddress) return true
    return destinationAddress.toLowerCase() === walletAddress.toLowerCase()
  }, [destinationAddress, isSmartContractWallet, walletAddress])

  const DestinationAddressLabel = useCallback(() => {
    if (error || isSmartContractWallet || !walletAddress) {
      return null
    }

    return toAddressEqualsSenderEOA ? (
      <div className="w-fit rounded bg-lime px-2 py-1 text-sm text-lime-dark">
        Sending to your address
      </div>
    ) : (
      <div className="w-fit rounded bg-orange px-2 py-1 text-sm text-orange-dark">
        Sending to a different address
      </div>
    )
  }, [error, isSmartContractWallet, walletAddress, toAddressEqualsSenderEOA])

  const DestinationAddressExplorer = useCallback(() => {
    const { explorerUrl } = (isDepositMode ? l2 : l1).network

    if (!explorerUrl || error) {
      return null
    }
    return (
      <ExternalLink
        className="mt-2 flex w-fit text-xs text-slate-500"
        href={`${explorerUrl}/address/${destinationAddress || walletAddress}`}
      >
        <ExternalLinkIcon className="mr-1 h-4 w-4" />
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
        className="flex flex-row items-center"
      >
        <span className=" text-lg">Advanced Settings</span>
        {collapsed ? (
          <ChevronDownIcon className="ml-1 h-4 w-4" />
        ) : (
          <ChevronUpIcon className="ml-1 h-4 w-4" />
        )}
      </button>
      {!collapsed && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between">
            <span className="text-md flex items-center text-gray-10">
              Destination Address
              <Tooltip
                wrapperClassName="ml-1"
                theme="dark"
                content={
                  <span>
                    This is where your funds will end up at.{' '}
                    {isSmartContractWallet
                      ? ''
                      : 'Defaults to your wallet address.'}
                  </span>
                }
              >
                <QuestionMarkCircleIcon className="h-4 w-4 text-slate-400" />
              </Tooltip>
            </span>
            <DestinationAddressLabel />
          </div>
          <div
            className={twMerge(
              'mt-1 flex h-full flex-row items-center rounded',
              destAddressInputClassName
            )}
          >
            <input
              type="string"
              className="w-full rounded px-2 py-1"
              // we want to keep the input empty for the same wallet address
              // placeholder only displays it to the user for assurance
              placeholder={!isSmartContractWallet ? walletAddress : undefined}
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
          <DestinationAddressExplorer />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      )}
    </div>
  )
}

export { AdvancedSettings }
