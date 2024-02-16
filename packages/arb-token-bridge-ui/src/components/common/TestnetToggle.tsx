import { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'

import { Switch } from './atoms/Switch'
import { ChainId, isNetwork } from '../../util/networks'
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
  const [isTestnetMode, setIsTestnetMode] = useIsTestnetMode()
  const [{ sourceChain }, setNetworks] = useNetworks()

  const isSourceChainTestnet = isNetwork(sourceChain.id).isTestnet

  const onChange = useCallback(() => {
    if (isSourceChainTestnet) {
      setNetworks({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    } else {
      setNetworks({
        sourceChainId: ChainId.Sepolia,
        destinationChainId: ChainId.ArbitrumSepolia
      })
    }
    setTimeout(() => {
      // this is to ensure it's done after setNetworks
      // or else it wouldn't work
      setIsTestnetMode(prevIsTestnetMode => !prevIsTestnetMode)
    }, 0)
  }, [isSourceChainTestnet, setIsTestnetMode, setNetworks])

  return (
    <label className={twMerge('cursor-pointer', className?.wrapper)}>
      <Switch
        className={className?.switch}
        label={label}
        description={description}
        checked={isTestnetMode}
        onChange={onChange}
      />
    </label>
  )
}
