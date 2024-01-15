import { useCallback, useEffect } from 'react'
import { useChainId } from 'wagmi'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

import { Switch } from './atoms/Switch'
import { warningToast } from './atoms/Toast'
import { isNetwork } from '../../util/networks'
import { twMerge } from 'tailwind-merge'

export const TestnetToggle = ({
  className,
  label,
  description
}: {
  className?: {
    wrapper?: string
    switch?: string
  }
  label: string
  description?: string
}) => {
  const chainId = useChainId()
  const [isTestnetMode, setIsTestnetMode] = useIsTestnetMode()
  const isConnectedToTestnet = isNetwork(chainId).isTestnet

  const enableTestnetMode = useCallback(() => {
    setIsTestnetMode(true)
  }, [setIsTestnetMode])

  const disableTestnetMode = useCallback(() => {
    // can't turn test mode off if connected to testnet
    if (!isConnectedToTestnet) {
      setIsTestnetMode(false)
    } else {
      warningToast(
        'Cannot disable Testnet mode while connected to a testnet network'
      )
    }
  }, [isConnectedToTestnet, setIsTestnetMode])

  useEffect(() => {
    // force test mode if connected to testnet
    if (isConnectedToTestnet) {
      enableTestnetMode()
    }
  }, [isConnectedToTestnet, enableTestnetMode])

  return (
    <div
      className={twMerge(
        isConnectedToTestnet && 'opacity-40',
        className?.wrapper
      )}
    >
      <Switch
        className={className?.switch}
        label={label}
        description={description}
        checked={!!isTestnetMode}
        disabled={isConnectedToTestnet}
        onChange={isTestnetMode ? disableTestnetMode : enableTestnetMode}
      />
    </div>
  )
}
