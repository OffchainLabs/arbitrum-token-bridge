import Loader from 'react-loader-spinner'
import { Input } from '../common/atoms/input/Input'
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
        <Loader type="TailSpin" color="#999999" height={16} width={16} />
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
      type="number"
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
