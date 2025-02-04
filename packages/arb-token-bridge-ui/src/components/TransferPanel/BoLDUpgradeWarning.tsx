import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { ExternalLink } from '../common/ExternalLink'

export const BoLDUpgradeWarning = () => {
  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded border border-white/30 bg-orange-dark/60 p-2 text-sm font-light text-white">
      <p className="flex flex-row flex-nowrap items-center gap-1 font-bold">
        <InformationCircleIcon className="h-4 w-4" />
        Notice: BoLD Upgrade
      </p>
      <p className="">
        Only relevant to withdrawals from{' '}
        <span className="font-bold">Arbitrum One</span> or{' '}
        <span className="font-bold">Arbitrum Nova</span>, to{' '}
        <span className="font-bold">Mainnet</span>.
      </p>

      <p>
        Withdrawals initiated between{' '}
        <span className="font-bold">Feb 5 09:00 ET and Feb 12 09:00 ET</span> on
        Arbitrum&apos;s canonical bridge (the page you&apos;re on right now)
        will be delayed by an <span className="underline">additional</span> 6.4
        days.{' '}
      </p>

      <p>This is happening because BoLD is getting an essential update.</p>

      <p>It&apos;s super annoying, but it&apos;s worth it, trust us.</p>

      <p>
        To avoid this additional delay of nearly a week, you can either:
        <ul>
          <li>(1) use a third-party fast bridge</li>
          <li>(2) do your withdrawal before Feb 5 or after Feb 12</li>
        </ul>
      </p>

      <p>
        Read more about the upgrade{' '}
        <ExternalLink
          className="underline"
          href="https://docs.arbitrum.io/how-arbitrum-works/bold/gentle-introduction#wen-mainnet"
        >
          here
        </ExternalLink>
        .
      </p>
    </div>
  )
}
