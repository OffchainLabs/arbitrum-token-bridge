import Loader from 'react-loader-spinner'

export function HeaderNetworkLoadingIndicator() {
  return (
    <div className="rounded-full p-3 lg:bg-dark lg:p-2">
      <Loader type="TailSpin" height={32} width={32} color="white" />
    </div>
  )
}
