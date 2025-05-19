import { Dialog, UseDialogProps } from '../common/Dialog'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { RouteContext, useRouteStore } from './hooks/useRouteStore'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { useETHPrice } from '../../hooks/useETHPrice'
import { BigNumber, constants, utils } from 'ethers'
import { Token } from '../../pages/api/crosschain-transfers/types'
import { addressesEqual } from '../../util/AddressUtils'

type AmountProps = {
  amount: BigNumber
  token: Token
  showToken?: true
}
function Amount({ amount, token, showToken }: AmountProps) {
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

export function getAmountToPay(selectedRouteContext: RouteContext) {
  let amountToPay = BigNumber.from(0)
  if (
    addressesEqual(
      selectedRouteContext.fee.token.address,
      constants.AddressZero
    )
  ) {
    amountToPay = amountToPay.add(selectedRouteContext.fee.amount)
  }
  if (
    addressesEqual(
      selectedRouteContext.gas.token.address,
      constants.AddressZero
    )
  ) {
    amountToPay = amountToPay.add(selectedRouteContext.gas.amount)
  }
  if (
    addressesEqual(
      selectedRouteContext.fromAmount.token.address,
      constants.AddressZero
    )
  ) {
    amountToPay = amountToPay.add(selectedRouteContext.fromAmount.amount)
  }

  return amountToPay
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

function LineWrapper({
  title,
  amountProps: { amount, token, showToken }
}: {
  amountProps: AmountProps
  title: string
}) {
  return (
    <div className="flex items-center justify-between px-2 text-sm">
      <span>{title}</span>
      <Amount amount={amount} token={token} showToken={showToken} />
    </div>
  )
}

export function HighSlippageWarningDialog(props: UseDialogProps) {
  const context = useRouteStore(state => state.context)

  if (!context) {
    props.onClose(false)
    return null
  }

  const { diff, lossPercentage } = getAmountLoss({
    fromAmount: getAmountToPay(context),
    toAmount: context.toAmount.amount
  })

  return (
    <Dialog
      {...props}
      actionButtonTitle="Continue with transaction"
      title={
        <div className="flex h-10 flex-row items-center gap-2">
          <InformationCircleIcon height={30} />
          Slippage
        </div>
      }
      onClose={(confirmed: boolean) => {
        props.onClose(confirmed)
      }}
      className="!max-w-[420px]"
    >
      <div className="mt-4 text-sm">
        Slippage for this transaction is {lossPercentage.toString()}%, that's
        quite high.
      </div>

      <div className="my-4 flex flex-col gap-2 text-sm">
        <LineWrapper
          title="Sending"
          amountProps={{
            ...context.fromAmount,
            amount: BigNumber.from(getAmountToPay(context)),
            showToken: true
          }}
        />
        <LineWrapper title="Gas fees" amountProps={context.gas} />
        <LineWrapper title="Protocol fees" amountProps={context.fee} />
        <LineWrapper
          title="Receiving"
          amountProps={{ ...context.toAmount, showToken: true }}
        />

        <div className="flex items-center justify-between rounded bg-orange-dark px-2 py-1 font-bold text-orange">
          <span>Value lost</span>
          <span>
            -{lossPercentage.toString()}% (
            <Amount amount={diff} token={context.toAmount.token} />)
          </span>
        </div>

        <p>
          You can adjust your slippage in Settings, or choose another route.
        </p>
      </div>
    </Dialog>
  )
}
