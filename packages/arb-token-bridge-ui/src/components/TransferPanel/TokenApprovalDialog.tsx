import { useEffect, useMemo, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { BigNumber, utils } from 'ethers'

import { useAppState } from '../../state'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useGasPrice } from '../../hooks/useGasPrice'
import { formatNumber, formatUSD } from '../../util/NumberUtils'

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
    const eth = formatNumber(estimatedGasFees)
    const usd = formatUSD(toUSD(estimatedGasFees))
    return `${eth} ETH (${usd})`
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
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-6 md:max-w-[490px]">
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
        <div className="flex flex-row items-center space-x-2 rounded-lg bg-cyan py-3 px-2">
          <InformationCircleIcon className="h-6 w-6 text-cyan-dark" />
          <span className="text-sm font-light text-cyan-dark">
            After approval, you’ll see a second prompt in your wallet for the
            standard L2 deposit fee.{' '}
            <ExternalLink href="#" className="underline">
              Learn more.
            </ExternalLink>
          </span>
        </div>
      </div>
    </Dialog>
  )
}
