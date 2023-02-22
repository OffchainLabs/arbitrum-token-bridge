import { Loader } from './atoms/loader/Loader'

export function HeaderNetworkLoadingIndicator() {
  return (
    <div className="rounded-full p-3 lg:bg-dark lg:p-2">
      <Loader color="white" size="medium" />
    </div>
  )
}
