import { twMerge } from 'tailwind-merge'

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { useOrbitChainFromRoute } from '../../hooks/useOrbitChainFromRoute'

import { Switch } from './atoms/Switch'

export const TestnetToggle = ({
  className,
  label,
  description,
  includeToggleStateOnLabel
}: {
  className?: {
    wrapper?: string
    switch?: string
  }
  label: string
  description?: string
  includeToggleStateOnLabel?: boolean
}) => {
  const [isTestnetMode, toggleTestnetMode] = useIsTestnetMode()
  const { orbitChain: orbitChainInRoute } = useOrbitChainFromRoute()

  const labelText = includeToggleStateOnLabel
    ? `${label} ${isTestnetMode ? 'ON' : 'OFF'}`
    : label

  return (
    <label className={twMerge('cursor-pointer', className?.wrapper)}>
      <Switch
        className={className?.switch}
        label={labelText}
        description={description}
        checked={isTestnetMode}
        onChange={toggleTestnetMode}
        disabled={!!orbitChainInRoute}
      />
    </label>
  )
}
