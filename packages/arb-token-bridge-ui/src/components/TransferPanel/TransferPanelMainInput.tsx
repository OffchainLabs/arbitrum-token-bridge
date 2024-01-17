import { useCallback, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { throttle } from 'lodash-es'

import { Loader } from '../common/atoms/Loader'
import { TokenButton } from './TokenButton'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { isMaxAmount, sanitizeAmount } from '../../util/SanitizeUtils'

type MaxButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> & {
  loading: boolean
  onClick: () => Promise<void>
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
  const {
    visible: maxButtonVisible,
    loading: isMaxButtonLoading,
    onClick: setMaxAmount,
    ...restMaxButtonProps
  } = maxButtonProps
  const [{ amount }, setQueryParams] = useArbQueryParams()
  const sanitizedAmount = sanitizeAmount(amount)
  const [inputAmount, setInputAmount] = useState(sanitizedAmount)

  const setQueryParamAmount = throttle(function (amount: string) {
    setQueryParams({ amount })
  }, 300)

  useEffect(() => {
    if (amount !== sanitizedAmount) {
      setQueryParamAmount(sanitizedAmount)
    }
  }, [amount, sanitizedAmount, setQueryParamAmount])

  useEffect(() => {
    setInputAmount(sanitizedAmount)
  }, [sanitizedAmount])

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitizedInputAmount = sanitizeAmount(event.target.value)
      setInputAmount(sanitizedInputAmount)
      setQueryParamAmount(sanitizedInputAmount)
    },
    [setQueryParamAmount]
  )

  const onMaxButtonClick = useCallback(async () => {
    await setMaxAmount()
    setInputAmount(sanitizedAmount)
  }, [sanitizedAmount, setMaxAmount])

  const borderClassName =
    typeof errorMessage !== 'undefined'
      ? 'border border-[#cd0000]'
      : 'border border-gray-6'

  return (
    <>
      <div
        className={twMerge(
          'flex h-12 flex-row items-center rounded-lg bg-white shadow-input lg:h-16',
          borderClassName
        )}
      >
        <TokenButton />
        <div className="h-full border-r border-gray-2" />
        <div className="flex h-full flex-grow flex-row items-center justify-center px-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter amount"
            className="h-full w-full bg-transparent text-xl font-light placeholder:text-gray-dark sm:text-3xl"
            value={inputAmount}
            onChange={onInputChange}
            {...rest}
          />
          {maxButtonVisible && (
            <MaxButton
              loading={isMaxAmount(amount) || isMaxButtonLoading}
              onClick={onMaxButtonClick}
              {...restMaxButtonProps}
            />
          )}
        </div>
      </div>

      {typeof errorMessage !== 'undefined' && (
        <span className="text-sm text-brick">{errorMessage}</span>
      )}
    </>
  )
}
