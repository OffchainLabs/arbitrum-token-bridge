import { ExternalLink } from './ExternalLink'

export const SiteBanner = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className="bg-atmosphere-blue px-4 py-[8px] text-center text-sm font-normal text-white"
      {...props}
    >
      {children}
    </div>
  )
}

export function SiteBannerArbiscanIncident() {
  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink className="underline" href="https://arbiscan.io/">
            Arbiscan
          </ExternalLink>{' '}
          is temporarily facing some issues while showing the latest data.
          Arbitrum chains are still live and running. If you need an alternative
          block explorer, you can visit{' '}
          <ExternalLink
            className="underline"
            href="https://www.oklink.com/arbitrum"
          >
            OKLink
          </ExternalLink>
          .
        </p>
      </div>
    </div>
  )
}
