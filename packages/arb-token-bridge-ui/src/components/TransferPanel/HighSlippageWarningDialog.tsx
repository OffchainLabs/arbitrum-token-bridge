import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useRouteStore } from './hooks/useRouteStore'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { useETHPrice } from '../../hooks/useETHPrice'
import { BigNumber, constants, utils } from 'ethers'
import { Token } from '../../pages/api/crosschain-transfers/types'

function Amount({
  amount,
  token,
  showToken
}: {
  amount: BigNumber
  token: Token
  showToken?: true
}) {
  const { ethToUSD } = useETHPrice()

  if (token.address !== constants.AddressZero) {
    return <span>{formatAmount(amount, token)}</span>
  }

  if (showToken) {
    return (
      <span>
        {formatAmount(amount, token)} (
        {formatUSD(ethToUSD(Number(utils.formatUnits(amount, token.decimals))))}
        )
      </span>
    )
  }

  return (
    <span>
      {formatUSD(ethToUSD(Number(utils.formatUnits(amount, token.decimals))))}
    </span>
  )
}

export function getAmountLoss({
  fromAmount,
  toAmount
}: {
  fromAmount: BigNumber
  toAmount: BigNumber
}) {
  const diff = fromAmount.sub(toAmount)
  const lossPercentage = BigNumber.from(100).sub(
    toAmount.mul(100).div(fromAmount)
  )
  return { diff, lossPercentage }
}

export function HighSlippageWarningDialog(props: UseDialogProps) {
  const context = useRouteStore(state => state.context)

  if (!context) {
    props.onClose(false)
    return null
  }

  const { diff, lossPercentage } = getAmountLoss({
    fromAmount: context.fromAmount.amount,
    toAmount: context.toAmount.amount
  })

  return (
    <Dialog
      {...props}
      actionButtonTitle="I’m okay with this"
      title={
        <div className="flex h-10 flex-row items-center gap-2 text-brick">
          <ExclamationCircleIcon height={30} />
          High Slippage
        </div>
      }
      onClose={(confirmed: boolean) => {
        props.onClose(confirmed)
      }}
    >
      <div className="mt-4 text-sm text-brick">
        You will receive significantly less value than you are sending due to
        slippage and fees.
      </div>

      <div className="my-4 flex flex-col gap-2 ">
        <div className="flex items-center justify-between px-2">
          <span>Sending</span>
          <Amount {...context.fromAmount} showToken />
        </div>

        <div className="flex items-center justify-between px-2">
          <span>Gas fees</span>
          <Amount {...context.gas} />
        </div>

        <div className="flex items-center justify-between px-2">
          <span>Protocol fees</span>
          <Amount {...context.fee} />
        </div>

        <div className="flex items-center justify-between px-2">
          <span>Receiving</span>
          <Amount {...context.toAmount} showToken />
        </div>

        <div className="flex items-center justify-between rounded bg-brick-dark px-2 py-1 font-bold">
          <span>Value lost</span>
          <span>
            -{lossPercentage.toString()}% (
            <Amount amount={diff} token={context.toAmount.token} />)
          </span>
        </div>
      </div>
    </Dialog>
  )
}
