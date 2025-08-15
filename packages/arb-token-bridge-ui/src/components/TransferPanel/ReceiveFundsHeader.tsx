import { twMerge } from 'tailwind-merge'
import { Button } from '../common/Button'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { CustomDestinationAddressInput } from './CustomDestinationAddressInput'
import { useCallback, useEffect, useState } from 'react'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useAccountType } from '../../hooks/useAccountType'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'

export const ReceiveFundsHeader = () => {
  const [
    showCustomDestinationAddressInput,
    setShowCustomDestinationAddressInput
  ] = useState(false)

  const [{ destinationAddress }, setQueryParams] = useArbQueryParams()

  const { isSmartContractWallet } = useAccountType()

  const { destinationAddressError } = useDestinationAddressError()

  const setDestinationAddress = useCallback(
    (newDestinationAddress: string) =>
      setQueryParams({
        destinationAddress: newDestinationAddress
      }),
    [setQueryParams]
  )

  useEffect(() => {
    // if there is an error, show the custom destination address input
    if (destinationAddressError) {
      setShowCustomDestinationAddressInput(true)
      return
    }

    if (isSmartContractWallet && !showCustomDestinationAddressInput) {
      setShowCustomDestinationAddressInput(true)
    }
  }, [isSmartContractWallet])

  const toggleCustomDestinationAddressInput = useCallback(() => {
    // for SCW, we must always show the custom destination address input
    if (isSmartContractWallet) {
      setShowCustomDestinationAddressInput(true)
    }

    setShowCustomDestinationAddressInput(prev => !prev)
  }, [isSmartContractWallet])

  return (
    <div
      className={twMerge(
        'flex max-h-[40px] flex-col gap-3 overflow-hidden transition-all duration-200',
        showCustomDestinationAddressInput && 'max-h-[180px]',
        destinationAddressError && 'max-h-[230px]'
      )}
    >
      <div className="flex flex-nowrap items-end justify-between text-white">
        <div className="text-[18px]">Receive</div>
        <Button
          variant="tertiary"
          aria-label="Show Custom Destination Address"
          onClick={toggleCustomDestinationAddressInput}
          disabled={!!destinationAddressError || isSmartContractWallet}
          className="p-0"
        >
          <div className="flex flex-nowrap items-center gap-1 text-sm opacity-50">
            Send to custom address
            <ChevronDownIcon
              className={twMerge(
                'h-3 w-3 transition duration-200',
                showCustomDestinationAddressInput && 'rotate-180'
              )}
            />
          </div>
        </Button>
      </div>

      <CustomDestinationAddressInput
        destinationAddress={destinationAddress}
        onDestinationAddressChange={setDestinationAddress}
      />
    </div>
  )
}
