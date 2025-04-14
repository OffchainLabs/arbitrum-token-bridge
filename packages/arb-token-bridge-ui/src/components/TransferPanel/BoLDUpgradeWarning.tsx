import { ExternalLink } from '../common/ExternalLink'

export const BoLDUpgradeWarning = () => {
  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded border border-white/30 bg-orange-dark/60 p-2 text-sm font-light text-white">
      <p className="">
        <span className="font-bold">Arbitrum One</span> and{' '}
        <span className="font-bold">Arbitrum Nova</span> upgraded to{' '}
        <ExternalLink
          className="font-bold underline"
          href="https://docs.arbitrum.io/how-arbitrum-works/bold/gentle-introduction#wen-mainnet"
        >
          BoLD
        </ExternalLink>{' '}
        on Feb 12 09:00 ET.
        <br />
        <br />
        If you initiated a withdrawal between Feb 5 09:00 ET and Feb 12 09:00
        ET, your withdrawal will be delayed by up to an additional 6.4 days,
        depending on when you initiated it.
      </p>
    </div>
  )
}
