import { Checkbox } from '../../common/Checkbox'
import { useEffect, useState } from 'react'

export function USDCWithdrawalConfirmationDialogCheckbox({
  onChange,
  onAllCheckboxesCheched
}: {
  onChange: (checked: boolean) => void
  onAllCheckboxesCheched?: () => void
}) {
  const [checkboxesChecked, setCheckboxesChecked] = useState([false, false])

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
            <span className="strong">a second transaction on L1</span> and pay
            another L1 fee to claim my USDC.
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
            <span className="strong">~15 minutes</span> before I can claim my
            USDC on Ethereum Mainnet.
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
