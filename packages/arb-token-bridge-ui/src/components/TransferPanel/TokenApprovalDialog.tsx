import { useEffect, useMemo, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { BigNumber, utils } from 'ethers'

import { useAppState } from '../../state'
import { DialogV3, UseDialogProps } from '../common/DialogV3'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useGasPrice } from '../../hooks/useGasPrice'

export type TokenApprovalDialogProps = UseDialogProps & {
  erc20L1Address?: string
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { erc20L1Address } = props
  const {
    app: { arbTokenBridge }
  } = useAppState()

  const { toUSD } = useETHPrice()
  const { l1GasPrice } = useGasPrice()

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(BigNumber.from(0))

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(l1GasPrice))),
    [estimatedGas, l1GasPrice]
  )

  const approvalFeeText = useMemo(() => {
    const eth = estimatedGasFees.toFixed(8)
    const usd = toUSD(estimatedGasFees).toLocaleString()
    return `${eth} ETH ($${usd})`
  }, [estimatedGasFees, toUSD])

  useEffect(() => {
    async function getEstimatedGas() {
      if (typeof erc20L1Address !== 'undefined') {
        setEstimatedGas(
          await arbTokenBridge.token.approveEstimateGas(erc20L1Address)
        )
      }
    }

    getEstimatedGas()
  }, [erc20L1Address])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  return (
    <DialogV3
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="lg:max-width-490px flex flex-col space-y-6">
        <div className="flex flex-row items-center space-x-2">
          <Checkbox checked={checked} onChange={setChecked} />
          <span className="text-sm font-light">
            I understand that I have to pay a one-time{' '}
            <span className="font-medium">
              approval fee of {approvalFeeText}*
            </span>{' '}
            for each new token I add to my wallet.
          </span>
        </div>
        <div className="flex flex-row items-center space-x-2 rounded-lg bg-v3-cyan py-3 px-2">
          <InformationCircleIcon className="h-6 w-6 text-v3-cyan-dark" />
          <span className="text-sm font-light text-v3-cyan-dark">
            After approval, you’ll see a second prompt in your wallet for the
            standard L2 deposit fee.{' '}
            <ExternalLink href="#" className="underline">
              Learn more.
            </ExternalLink>
          </span>
        </div>
      </div>
    </DialogV3>
  )
}
