import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { Routes } from '../TransferPanel/Routes/Routes'

export const WidgetRoutes = () => {
  const [{ amount }] = useArbQueryParams()

  if (!amount || isNaN(Number(amount)) || Number(amount) === 0) {
    return (
      <div className="flex min-h-[100px] flex-grow text-xs">
        Please enter a valid amount to get route options.
      </div>
    )
  }

  return (
    <div className="flex max-h-[220px] flex-grow flex-col gap-3 overflow-y-auto overflow-x-hidden">
      <Routes />
    </div>
  )
}
