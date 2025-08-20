import { Dialog, UseDialogProps } from '../common/Dialog'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useRouteStore } from './hooks/useRouteStore'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { BigNumber } from 'ethers'
import { Token } from '@/bridge/app/api/crosschain-transfers/types'
import { getAmountToPay } from './useTransferReadiness'

type AmountProps = {
  amount: string | BigNumber
  token: Token
  showToken?: true
}
function Amount({ token, showToken, amount }: AmountProps) {
  if (showToken) {
    return <span>{formatAmount(BigNumber.from(amount), token)}</span>
  }

  return <span>{formatUSD(Number(amount))}</span>
}

export function getAmountLoss({
  fromAmount,
  toAmount
}: {
  fromAmount: number
  toAmount: number
}) {
  const diff = fromAmount - toAmount
  const lossPercentage = Number(((diff / fromAmount) * 100).toFixed(2))
  return { diff, lossPercentage }
}

function LineWrapper({
  title,
  amountProps
}: {
  amountProps: AmountProps[]
  title: string
}) {
  return (
    <div className="flex items-center justify-between px-2 text-sm">
      <span>{title}</span>
      <div className="flex gap-1">
        {amountProps.map(({ amount, token, showToken }, index) => (
          <span key={token.address}>
            <Amount amount={amount} token={token} showToken={showToken} />
            {amountProps.length > 1 && index < amountProps.length - 1 && (
              <span>, </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function HighSlippageWarningDialog(props: UseDialogProps) {
  const context = useRouteStore(state => state.context)

  if (!context) {
    props.onClose(false)
    return null
  }

  const { fromAmountUsd, toAmountUsd, amounts } = getAmountToPay(context)

  const { diff, lossPercentage } = getAmountLoss({
    fromAmount: fromAmountUsd,
    toAmount: toAmountUsd
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
        Slippage for this transaction is {lossPercentage.toString()}%,
        that&apos;s quite high.
      </div>

      <div className="my-4 flex flex-col gap-2 text-sm">
        <LineWrapper
          title="Sending"
          amountProps={Object.keys(amounts).map(address => ({
            amount: amounts[address]!.amount,
            token: amounts[address]!.token,
            showToken: true
          }))}
        />
        <LineWrapper
          title="Gas fees"
          amountProps={[
            { amount: context.gas.amountUSD, token: context.gas.token }
          ]}
        />
        <LineWrapper
          title="Protocol fees"
          amountProps={[
            {
              amount: context.fee.amountUSD,
              token: context.fee.token
            }
          ]}
        />
        <LineWrapper
          title="Receiving"
          amountProps={[
            {
              amount: context.toAmount.amountUSD,
              token: context.toAmount.token
            }
          ]}
        />

        <div className="flex items-center justify-between rounded bg-orange-dark px-2 py-1 font-bold text-orange">
          <span>Value lost</span>
          <span>
            -{lossPercentage.toString()}% (
            <Amount amount={diff.toString()} token={context.toAmount.token} />)
          </span>
        </div>

        <p>
          You can adjust your slippage in Settings, or choose another route.
        </p>
      </div>
    </Dialog>
  )
}
