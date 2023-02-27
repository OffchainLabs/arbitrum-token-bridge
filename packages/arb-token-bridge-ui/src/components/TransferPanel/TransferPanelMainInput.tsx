import { Loader } from '../common/atoms/loader/Loader'
import { InputRow } from '../common/molecules/InputRow/InputRow'

import { TokenButton } from './TokenButton'

type MaxButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean
}

function MaxButton(props: MaxButtonProps) {
  const { loading, className = '', ...rest } = props

  if (loading) {
    return (
      <div className="px-3">
        <Loader color="#999999" size="small" />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`p-2 text-sm font-light text-gray-9 ${className} pr-3`}
      {...rest}
    >
      MAX
    </button>
  )
}

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | React.ReactNode
    maxButtonProps: MaxButtonProps & {
      visible: boolean
    }
  }

export function TransferPanelMainInput(props: TransferPanelMainInputProps) {
  const { errorMessage, maxButtonProps, ...rest } = props
  const { visible: maxButtonVisible, ...restMaxButtonProps } = maxButtonProps

  return (
    <InputRow
      inputSize="large"
      type="text"
      inputMode="decimal"
      placeholder="Enter amount"
      errorMessage={errorMessage}
      leftChildren={
        <>
          <TokenButton />
          <div className="h-full border-r border-gray-4" />
        </>
      }
      rightChildren={maxButtonVisible && <MaxButton {...restMaxButtonProps} />}
      {...rest}
    />
  )
}
