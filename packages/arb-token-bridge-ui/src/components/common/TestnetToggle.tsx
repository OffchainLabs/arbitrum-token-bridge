import { useCallback } from 'react'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

import { Switch } from './atoms/Switch'
import { twMerge } from 'tailwind-merge'
import { ChainId } from '../../util/networks'
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
  const { isSourceChainTestnet, isTestnetMode, setIsTestnetMode } =
    useIsTestnetMode()
  const [, setNetworks] = useNetworks()

  const onChange = useCallback(() => {
    if (isSourceChainTestnet) {
      setNetworks({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    }
    setTimeout(() => {
      // this is to ensure it's done after setNetworks
      // or else it wouldn't work
      setIsTestnetMode(prevIsTestnetMode => !prevIsTestnetMode)
    }, 0)
  }, [isSourceChainTestnet, setIsTestnetMode, setNetworks])

  return (
    <div
      className={twMerge(!isTestnetMode && 'opacity-60', className?.wrapper)}
    >
      <Switch
        className={className?.switch}
        label={label}
        description={description}
        checked={isTestnetMode}
        onChange={onChange}
      />
    </div>
  )
}
