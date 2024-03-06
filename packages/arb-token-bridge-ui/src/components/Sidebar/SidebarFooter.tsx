import { twMerge } from 'tailwind-merge'

import { ExternalLink } from '../common/ExternalLink'

export const SidebarFooter = ({ className }: { className?: string }) => {
  return (
    <div
      className={twMerge(
        'mt-[20px] flex w-full flex-col gap-[12px] px-[16px] pb-[16px]',
        className
      )}
    >
      <div className="border-b border-white/30 py-[16px] text-base text-white/70">
        The Most Decentralized <br />
        L2 Technology
      </div>

      <div className="flex flex-nowrap items-center gap-[8px] text-white/60">
        <ExternalLink
          className="cursor-pointer text-xs text-white/60"
          href="https://bridge.arbitrum.io/tos"
        >
          ToS
        </ExternalLink>
        &bull;
        <ExternalLink
          className="cursor-pointer text-xs text-white/60"
          href="https://arbitrum.io/privacy"
        >
          Privacy Policy
        </ExternalLink>
      </div>
      <div className="text-xs text-white/60">
        Built with love by{' '}
        <ExternalLink
          className="hover:underline"
          href="https://offchainlabs.com/"
        >
          Offchain Labs
        </ExternalLink>
        , builders of{' '}
        <ExternalLink className="hover:underline" href="https://arbitrum.io/">
          Arbitrum technology.
        </ExternalLink>
      </div>
    </div>
  )
}
