import Image, { ImageProps } from 'next/image'
import ThreeArbinautsImg from '@/images/three-arbinauts.webp'
import { ExternalLink } from '../common/ExternalLink'

export function AppConnectionFallbackContainer({
  layout = 'col',
  imgProps = {
    className: 'sm:w-[420px]',
    src: ThreeArbinautsImg,
    alt: 'Three Arbinauts',
    priority: true
  },
  children
}: {
  layout?: 'row' | 'col'
  imgProps?: ImageProps
  children: React.ReactNode
}) {
  return (
    <div className="my-24 flex items-center justify-center px-8">
      <div
        className={`flex flex-col items-center md:flex-${layout} md:items-${
          layout === 'col' ? 'center' : 'start'
        }`}
      >
        {children}
        <ExternalLink href="https://metamask.io/download">
          <Image {...imgProps} />
        </ExternalLink>
      </div>
    </div>
  )
}
