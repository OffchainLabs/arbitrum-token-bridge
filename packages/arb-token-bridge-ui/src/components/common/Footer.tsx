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
      <div className="max-w-1440px flex w-full flex-col space-y-12 py-20 text-white lg:px-8 lg:py-8">
        <div className="flex flex-col items-center space-y-4 px-8 text-center lg:items-start lg:px-0">
          <span className="text-4xl">The most secure L2</span>
          <span className="text-3xl font-light">
            Ask us about our fraud proofs
          </span>
        </div>

        <div className="flex flex-col space-y-8">
          <ul className="lg:max-w-448px grid text-center font-light lg:grid-cols-3 lg:grid-rows-2 lg:text-left lg:font-normal">
            {footerLinks.map(link => (
              <li key={link.href} className={`lg:order-${link.lgOrder}`}>
                <ExternalLink href={link.href} className="arb-hover">
                  {link.title}
                </ExternalLink>
              </li>
            ))}
          </ul>
          <div className="flex flex-row justify-center space-x-6 lg:hidden">
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="arb-hover h-8 w-8"
            >
              <img src="/icons/discord.png" alt="Discord" />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="arb-hover h-8 w-8"
            >
              <img src="/icons/twitter.png" alt="Twitter" />
            </ExternalLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
