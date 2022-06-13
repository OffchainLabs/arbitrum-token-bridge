import { useMemo, useState } from 'react'
import { CheckIcon } from '@heroicons/react/outline'

import { DialogV3, UseDialogProps } from '../common/DialogV3'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export function WithdrawalConfirmationDialog(props: UseDialogProps) {
  const { l1 } = useNetworksAndSigners()

  const [checkbox1Checked, setCheckbox1Checked] = useState(false)
  const [checkbox2Checked, setCheckbox2Checked] = useState(false)

  const bothCheckboxesChecked = checkbox1Checked && checkbox2Checked

  const isTestnet = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return true
    }

    return l1.network.chainID !== 1
  }, [l1.network])

  const confirmationPeriod = useMemo(
    () => (isTestnet ? '~1 day' : '~8 days'),
    [isTestnet]
  )

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setCheckbox1Checked(false)
    setCheckbox2Checked(false)
  }

  return (
    <DialogV3
      {...props}
      onClose={closeWithReset}
      title={`Move funds to ${l1.network?.name}`}
      actionButtonTitle="Continue"
      actionButtonProps={{ disabled: !bothCheckboxesChecked }}
    >
      <div className="lg:max-width-725px flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <span className="font-light">
            Get your funds in {confirmationPeriod} and pay a small fee twice.{' '}
            <ExternalLink href="#" className="underline">
              Learn more.
            </ExternalLink>
          </span>

          <div className="flex flex-row items-center space-x-1">
            <CheckIcon className="h-5 w-5 text-v3-lime-dark" />
            <span className="font-medium text-v3-lime-dark">
              Security guaranteed by Ethereum
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center space-x-2">
          <Checkbox checked={checkbox1Checked} onChange={setCheckbox1Checked} />
          <span className="font-light">
            I understand that it will take {confirmationPeriod} before I can
            claim my funds on Ethereum {l1.network?.name}
          </span>
        </div>

        <div className="flex flex-row items-center space-x-2">
          <Checkbox checked={checkbox2Checked} onChange={setCheckbox2Checked} />
          <span className="font-light">
            I understand that after claiming my funds, I’ll have to send{' '}
            <span className="font-medium">another transaction on L1</span> and
            pay another L1 fee
          </span>
        </div>
      </div>
    </DialogV3>
  )
}
