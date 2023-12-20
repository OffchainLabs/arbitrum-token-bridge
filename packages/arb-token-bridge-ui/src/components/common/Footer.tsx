import Image from 'next/image'
import { ExternalLink } from './ExternalLink'
import { DOCS_DOMAIN } from '../../constants'

type FooterLink = {
  title: string
  href: string
  className: string
}

const footerLinks: FooterLink[] = [
  {
    title: 'Documentation',
    href: DOCS_DOMAIN,
    className: 'lg:order-1'
  },
  {
    title: 'Careers',
    href: 'https://offchainlabs.com/careers',
    className: 'lg:order-2'
  },
  {
    title: 'Blog',
    href: 'https://medium.com/offchainlabs',
    className: 'lg:order-4'
  },
  {
    title: 'Recent Press',
    href: 'https://offchainlabs.com/#press',
    className: 'lg:order-5'
  },
  {
    title: 'ToS',
    href: 'https://arbitrum.io/tos',
    className: 'lg:order-3'
  },
  {
    title: 'Privacy Policy',
    href: 'https://arbitrum.io/privacy',
    className: 'lg:order-6'
  }
]

export function Footer() {
  return (
    <footer className="z-[1] flex justify-center">
      <div className="flex w-full max-w-[1440px] flex-col space-y-8 py-20 text-white lg:px-8 lg:py-8">
        <div className="flex flex-col items-center space-y-2 px-8 text-center lg:items-start lg:px-0">
          <span className="text-4xl">The most decentralized L2</span>
          <ExternalLink href={DOCS_DOMAIN} className="text-2xl underline">
            Learn more.
          </ExternalLink>
        </div>

        <div className="flex flex-col space-y-8">
          <ul className="grid text-center font-light lg:max-w-[500px] lg:grid-cols-3 lg:grid-rows-2 lg:text-left lg:font-normal">
            {footerLinks.map(link => (
              <li key={link.href} className={link.className}>
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
              <Image
                src="/icons/discord.webp"
                alt="Discord"
                width={32}
                height={32}
              />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="arb-hover h-8 w-8"
            >
              <Image
                src="/icons/twitter.webp"
                alt="Twitter"
                width={32}
                height={32}
              />
            </ExternalLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
