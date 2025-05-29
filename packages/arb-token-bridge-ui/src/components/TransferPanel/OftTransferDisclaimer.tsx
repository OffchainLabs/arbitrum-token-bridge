import Image from 'next/image'

import { ExternalLink } from '../common/ExternalLink'

export const OftTransferDisclaimer = () => {
  return (
    <div className="flex w-full flex-col flex-nowrap gap-2 whitespace-nowrap rounded bg-white/10 p-2 text-sm font-light text-white lg:flex-row lg:items-center">
      <Image
        src="/images/LayerZeroLogo.svg"
        alt="LayerZero Logo"
        width={85}
        height={20}
        className="shrink-0"
      />
      <p>
        USDT0 transfers are powered by LayerZero&apos;s OFT protocol.{' '}
        <ExternalLink
          className="underline hover:opacity-70"
          href="https://mirror.xyz/tetherzero.eth/_6FNgGi0WHHQhA9qavZ4rlt-nV9ehVuJUHxQnSwOmbM"
        >
          Learn more.
        </ExternalLink>
      </p>
    </div>
  )
}
