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
      <div className="px-3">
        <Loader color="#999999" size="small" />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={twMerge('p-2 text-sm font-light text-gray-6', className)}
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
          'flex h-12 flex-row items-center rounded border bg-black/40 shadow-2 lg:h-16',
          errorMessage ? 'border-[#cd0000]' : 'border-white'
        )}
      >
        <TokenButton />
        <div
          className={twMerge(
            'h-full border-r',
            errorMessage ? 'border-[#cd0000]' : 'border-white'
          )}
        />
        <div className="flex h-full flex-grow flex-row items-center justify-center px-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter amount"
            className="h-full w-full bg-transparent text-xl font-light text-white placeholder:text-white"
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
