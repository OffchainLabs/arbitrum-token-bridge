import { twMerge } from 'tailwind-merge'
import { Loader } from '../common/atoms/Loader'
import { TokenButton } from './TokenButton'

type MaxButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean
}

function MaxButton(props: MaxButtonProps) {
  const { loading, className = '', ...rest } = props

  if (loading) {
    return (
      <div className="px-4">
        <Loader color="#999999" size="small" />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={twMerge(
        'arb-hover px-2 py-2 text-sm font-light text-gray-6 sm:px-4',
        className
      )}
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
    value: string
  }

export function TransferPanelMainInput(props: TransferPanelMainInputProps) {
  const { errorMessage, maxButtonProps, value, ...rest } = props
  const { visible: maxButtonVisible, ...restMaxButtonProps } = maxButtonProps

  return (
    <>
      <div
        className={twMerge(
          'flex flex-row rounded border bg-black/40 shadow-2',
          errorMessage
            ? 'border-brick text-brick'
            : 'border-white/30 text-white'
        )}
      >
        <TokenButton />
        <div
          className={twMerge(
            'flex grow flex-row items-center justify-center border-l',
            errorMessage ? 'border-brick' : 'border-white/30'
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter amount"
            className="h-full w-full bg-transparent px-3 text-xl font-light placeholder:text-gray-dark sm:text-3xl"
            value={value}
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
