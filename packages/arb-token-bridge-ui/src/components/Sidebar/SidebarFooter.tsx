import { twMerge } from 'tailwind-merge'

import { ExternalLink } from '../common/ExternalLink'

export const SidebarFooter = ({ className }: { className?: string }) => {
  return (
    <div
      className={twMerge(
        'mb-[20px] mr-[12px] mt-[50px] flex w-full shrink-0 grow-0 flex-col gap-3 overflow-hidden px-[16px]',
        className
      )}
    >
      <div className="border-b border-white/30 py-4 text-base">
        The Most Decentralized <br /> L2 Technology
      </div>

      <div className="flex flex-nowrap items-center gap-2 text-gray-600">
        <ExternalLink
          className="cursor-pointer text-xs text-gray-600"
          href="https://bridge.arbitrum.io/tos"
        >
          ToS
        </ExternalLink>
        &bull;
        <ExternalLink
          className="cursor-pointer text-xs text-gray-600"
          href="https://arbitrum.io/privacy"
        >
          Privacy Policy
        </ExternalLink>
      </div>
      <div className="text-xs text-gray-600">
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
