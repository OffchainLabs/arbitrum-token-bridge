import { useCallback, useEffect } from 'react'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

import { Switch } from './atoms/Switch'
import { warningToast } from './atoms/Toast'
import { isNetwork } from '../../util/networks'
import { twMerge } from 'tailwind-merge'
import { useNetworks } from '../../hooks/useNetworks'

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
  const [{ sourceChain }] = useNetworks()
  const [isTestnetMode, setIsTestnetMode] = useIsTestnetMode()
  const isSourceChainTestnet = isNetwork(sourceChain.id).isTestnet

  const enableTestnetMode = useCallback(() => {
    setIsTestnetMode(true)
  }, [setIsTestnetMode])

  const disableTestnetMode = useCallback(() => {
    // can't turn test mode off if connected to testnet
    if (!isSourceChainTestnet) {
      setIsTestnetMode(false)
    } else {
      warningToast(
        'Cannot disable Testnet mode while connected to a testnet network'
      )
    }
  }, [isSourceChainTestnet, setIsTestnetMode])

  useEffect(() => {
    // force test mode if connected to testnet
    if (isSourceChainTestnet) {
      enableTestnetMode()
    }
  }, [isSourceChainTestnet, enableTestnetMode])

  return (
    <div
      className={twMerge(
        isSourceChainTestnet && 'opacity-40',
        className?.wrapper
      )}
    >
      <Switch
        className={className?.switch}
        label={label}
        description={description}
        checked={!!isTestnetMode}
        disabled={isSourceChainTestnet}
        onChange={isTestnetMode ? disableTestnetMode : enableTestnetMode}
      />
    </div>
  )
}
