import { useNetworksAndSigners } from '../hooks/useNetworksAndSigners'
import { getBlockTime, getConfirmPeriodBlocks } from './networks'

const SECONDS_IN_DAY = 86400
const SECONDS_IN_HOUR = 3600

export function useWithdrawalConfirmationPeriod() {
  const { l1, l2 } = useNetworksAndSigners()

  const confirmationSeconds =
    getBlockTime(l1.network.id) * getConfirmPeriodBlocks(l2.network.id)
  const confirmationDays = Math.ceil(confirmationSeconds / SECONDS_IN_DAY)
  const confirmationHours = Math.ceil(confirmationSeconds / SECONDS_IN_HOUR)
  let confirmationPeriod = ''

  if (confirmationDays >= 2) {
    confirmationPeriod = `${confirmationDays} day${
      confirmationDays > 1 ? 's' : ''
    }`
  } else {
    confirmationPeriod = `${confirmationHours} hour${
      confirmationHours > 1 ? 's' : ''
    }`
  }
  return { confirmationHours, confirmationPeriod }
}
