import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'

import { useAppState } from '../../state'
import { useAccountType } from '../../hooks/useAccountType'

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
    app: {
      selectedToken,
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()
  const { isEOA = false, isSmartContractWallet = false } = useAccountType()

  const [collapsed, setCollapsed] = useState(true)
  const [inputLocked, setInputLocked] = useState(true)

  useEffect(() => {
    // Initially hide for EOA
    setCollapsed(isEOA)
    // Initially lock for EOA
    setInputLocked(isEOA)
  }, [isEOA])

  // Disabled for ETH
  if (!selectedToken) {
    return null
  }

  if (!isEOA && !isSmartContractWallet) {
    return null
  }

  function handleVisibility() {
    // Keep visible for contract wallets
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
            <div
              className={twMerge(
                'my-1 flex w-full items-center rounded-lg border border-gray-dark px-2 py-1 shadow-input',
                inputLocked ? 'bg-slate-200' : 'bg-white'
              )}
            >
              <input
                className="w-full"
                placeholder={isSmartContractWallet ? undefined : walletAddress}
                defaultValue={destinationAddress}
                disabled={inputLocked}
                spellCheck={false}
                onChange={e => onChange(e.target.value?.toLowerCase().trim())}
                // disable 1password
                data-1p-ignore
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
        </>
      )}
      {isSmartContractWallet && error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
