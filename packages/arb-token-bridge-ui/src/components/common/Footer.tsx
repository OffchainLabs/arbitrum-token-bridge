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
  return (
    <footer className="z-10 flex justify-center">
      <div className="flex w-full max-w-[1440px] flex-col space-y-8 py-20 text-white lg:px-8 lg:py-8">
        <div className="flex flex-col items-center space-y-2 px-8 text-center lg:items-start lg:px-0">
          <span className="text-4xl">Now running Arbitrum Nitro.</span>
          <ExternalLink
            href="https://developer.arbitrum.io"
            className="text-4xl underline"
          >
            Learn more.
          </ExternalLink>
        </div>

        <div className="flex flex-col space-y-8">
          <ul className="grid text-center font-light lg:max-w-[448px] lg:grid-cols-3 lg:grid-rows-2 lg:text-left lg:font-normal">
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
