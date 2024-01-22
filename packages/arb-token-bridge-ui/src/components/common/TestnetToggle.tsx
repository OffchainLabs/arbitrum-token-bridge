import { useCallback } from 'react'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

import { Switch } from './atoms/Switch'
import { warningToast } from './atoms/Toast'
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
  const { isSourceChainTestnet, isTestnetMode, setIsTestnetMode } =
    useIsTestnetMode()

  const enableTestnetMode = useCallback(() => {
    setIsTestnetMode(true)
  }, [setIsTestnetMode])

  const disableTestnetMode = useCallback(() => {
    // can't turn test mode off if source chain is testnet
    if (!isSourceChainTestnet) {
      setIsTestnetMode(false)
    } else {
      warningToast(
        'Cannot disable Testnet mode while connected to a testnet network'
      )
    }
  }, [isSourceChainTestnet, setIsTestnetMode])

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
