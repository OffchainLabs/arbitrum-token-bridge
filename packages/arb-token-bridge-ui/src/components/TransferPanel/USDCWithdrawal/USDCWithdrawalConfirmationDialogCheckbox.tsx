import { useChainId } from 'wagmi'
import { Checkbox } from '../../common/Checkbox'
import { useEffect, useState } from 'react'
import { isNetwork } from '../../../util/networks'
import { useChainLayers } from '../../../hooks/useChainLayers'

export function USDCWithdrawalConfirmationDialogCheckbox({
  onChange,
  onAllCheckboxesCheched
}: {
  onChange: (checked: boolean) => void
  onAllCheckboxesCheched?: () => void
}) {
  const [checkboxesChecked, setCheckboxesChecked] = useState([false, false])
  const chainId = useChainId()
  const { parentLayer } = useChainLayers()
  const { isTestnet } = isNetwork(chainId)

  useEffect(() => {
    if (checkboxesChecked.every(checked => checked)) {
      onAllCheckboxesCheched?.()
    }
  }, [checkboxesChecked, onAllCheckboxesCheched])

  return (
    <>
      <Checkbox
        label={
          <span className="select-none font-light">
            I understand that I&apos;ll have to send{' '}
            <span className="font-medium">
              a second transaction on {parentLayer}
            </span>{' '}
            and pay another {parentLayer} fee to claim my USDC.
          </span>
        }
        checked={checkboxesChecked[0] ?? false}
        onChange={checked => {
          onChange(checked)
          setCheckboxesChecked(prevCheckboxesState => {
            const newState = [...prevCheckboxesState]
            newState[0] = checked
            return newState
          })
        }}
      />
      <Checkbox
        label={
          <span className="select-none font-light">
            I understand that it will take{' '}
            <span className="font-medium">
              {isTestnet ? '~1 minute' : '~15 minutes'}
            </span>{' '}
            before I can claim my USDC on {isTestnet ? 'Goerli' : 'Mainnet'}.
          </span>
        }
        checked={checkboxesChecked[1] ?? false}
        onChange={checked => {
          onChange(checked)
          setCheckboxesChecked(prevCheckboxesState => {
            const newState = [...prevCheckboxesState]
            newState[1] = checked
            return newState
          })
        }}
      />
    </>
  )
}
