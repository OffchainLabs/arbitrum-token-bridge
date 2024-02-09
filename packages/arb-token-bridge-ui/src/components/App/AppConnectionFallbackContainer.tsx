import { WalletConnectWarning } from '../common/WalletConnectWarning'

export function AppConnectionFallbackContainer({
  layout = 'col',
  children
}: {
  layout?: 'row' | 'col'
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <WalletConnectWarning />

      <div className="my-24 flex items-center justify-center px-8">
        <div
          className={`flex flex-col items-center md:flex-${layout} md:items-${
            layout === 'col' ? 'center' : 'start'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
