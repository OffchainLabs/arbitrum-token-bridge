import { useEffect, useState } from 'react'

import { Checkbox } from '../../common/Checkbox'
import { getNetworkName, isNetwork } from '../../../util/networks'
import { useNetworks } from '../../../hooks/useNetworks'

export function USDCWithdrawalConfirmationDialogCheckbox({
  onChange,
  onAllCheckboxesCheched
}: {
  onChange: (checked: boolean) => void
  onAllCheckboxesCheched?: () => void
}) {
  const [checkboxesChecked, setCheckboxesChecked] = useState([false, false])
  const [networks] = useNetworks()
  const { isTestnet } = isNetwork(networks.sourceChain.id)

  const destinationNetworkName = getNetworkName(networks.destinationChain.id)

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
              a second transaction on {destinationNetworkName}
            </span>{' '}
            and pay another {destinationNetworkName} fee to claim my USDC.
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
            before I can claim my USDC on {isTestnet ? 'Sepolia' : 'Ethereum'}.
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
