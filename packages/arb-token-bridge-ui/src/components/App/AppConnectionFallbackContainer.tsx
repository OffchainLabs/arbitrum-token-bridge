import { ExternalLink } from '../common/ExternalLink'

export function AppConnectionFallbackContainer({
  layout = 'col',
  imgProps = {
    className: 'sm:w-[420px]',
    src: '/images/three-arbinauts.webp',
    alt: 'Three Arbinauts'
  },
  children
}: {
  layout?: 'row' | 'col'
  imgProps?: {
    className?: string
    src?: string
    alt?: string
  }
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
          <img
            className={imgProps.className}
            src={imgProps.src}
            alt={imgProps.alt}
          />
        </ExternalLink>
      </div>
    </div>
  )
}
