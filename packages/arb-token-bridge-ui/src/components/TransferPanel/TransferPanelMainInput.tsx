import { Loader } from '../common/atoms/Loader'
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
      className={`p-2 text-sm font-light text-gray-dark ${className}`}
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

  const borderClassName =
    typeof errorMessage !== 'undefined'
      ? 'border border-[#cd0000]'
      : 'border border-gray-6'

  return (
    <>
      <div
        className={`flex h-12 flex-row items-center rounded-lg bg-white lg:h-16 ${borderClassName} shadow-[0px_2px_2px_rgba(33,37,41,0.06),0px_0px_1px_rgba(33,37,41,0.08)]`}
      >
        <TokenButton />
        <div className="h-full border-r border-gray-2" />
        <div className="flex h-full flex-grow flex-row items-center justify-center px-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter amount"
            className="h-full w-full bg-transparent text-xl font-light placeholder:text-gray-dark sm:text-3xl"
            {...rest}
          />
          {maxButtonVisible && <MaxButton {...restMaxButtonProps} />}
        </div>
      </div>

      {typeof errorMessage !== 'undefined' && (
        <span className="text-sm text-brick">{errorMessage}</span>
      )}
    </>
  )
}
