import { useMemo } from 'react'
import { useWindowSize } from 'react-use'

import { ExternalLink } from './ExternalLink'

type FooterLink = {
  title: string
  href: string
  lgOrder: number
}

const footerLinks: FooterLink[] = [
  {
    title: 'Documentation',
    href: 'https://developer.offchainlabs.com/docs/developer_quickstart',
    lgOrder: 1
  },
  {
    title: 'Careers',
    href: 'https://offchainlabs.com/careers',
    lgOrder: 4
  },
  {
    title: 'Blog',
    href: 'https://medium.com/offchainlabs',
    lgOrder: 2
  },
  {
    title: 'Recent Press',
    href: 'https://offchainlabs.com/#press',
    lgOrder: 5
  },
  {
    title: 'ToS',
    href: '/tos',
    lgOrder: 3
  }
]

export function Footer() {
  const { width } = useWindowSize()

  const footerBackgroundStyle: React.CSSProperties = useMemo(() => {
    const isLarge = width >= 1024

    // These values came to me in my dream.
    return {
      background: 'url(/images/moon.png)',
      backgroundSize: isLarge ? width / 1.2 : width * 1.2,
      backgroundRepeat: 'no-repeat',
      backgroundPositionX: isLarge ? width / 3.625 : 'center',
      backgroundPositionY: isLarge ? -(width / 12) : 428 - width * 0.2
    }
  }, [width])

  return (
    <footer className="flex justify-center pt-16" style={footerBackgroundStyle}>
      <div className="flex flex-col w-full max-w-1440px lg:px-8 space-y-12 py-20 lg:py-8 text-white">
        <div className="flex flex-col items-center lg:items-start text-center px-8 lg:px-0 space-y-4">
          <span className="text-4xl">The most secure L2</span>
          <span className="text-3xl font-light">
            Ask us about our fraud proofs
          </span>
        </div>

        <div className="flex flex-col space-y-8">
          <ul className="grid lg:grid-rows-2 lg:grid-cols-3 text-center lg:text-left font-light lg:font-normal lg:max-width-448px">
            {footerLinks.map(link => (
              <li key={link.href} className={`lg:order-${link.lgOrder}`}>
                <ExternalLink href={link.href}>{link.title}</ExternalLink>
              </li>
            ))}
          </ul>
          <div className="flex lg:hidden flex-row justify-center space-x-6">
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="h-8 w-8"
            >
              <img src="/icons/discord.png" alt="Discord" />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="h-8 w-8"
            >
              <img src="/icons/twitter.png" alt="Twitter" />
            </ExternalLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
