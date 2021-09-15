import React from 'react'

import { useHistory, Link } from 'react-router-dom'

const navigation = {
  product: [
    { name: 'What is Arbitrum', href: 'https://offchainlabs.com/#tech' },
    { name: 'Why Arbitrum', href: 'https://offchainlabs.com/#why' },
    { name: 'Technology', href: 'https://offchainlabs.com/#paper' }
  ],
  community: [
    { name: 'Blog', href: 'https://medium.com/offchainlabs' },
    { name: 'Recent Press', href: 'https://offchainlabs.com/#press' },
    { name: 'Discord', href: 'https://discord.gg/ZpZuw7p' },
    { name: 'Twitter', href: 'https://twitter.com/OffchainLabs' }
  ],
  learnmore: [
    {
      name: 'Documentation',
      href: 'https://developer.offchainlabs.com/docs/developer_quickstart'
    },
    { name: 'Github', href: 'https://github.com/OffchainLabs/arbitrum' },
    { name: 'Terms of Service', href: '/tos' }
  ],
  officanlabs: [
    { name: 'Website', href: 'https://arbitrum.io' },
    { name: 'Team', href: 'https://offchainlabs.com/#team' },
    { name: 'Careers', href: 'https://offchainlabs.com/#careers' },
    { name: 'Investors', href: 'https://offchainlabs.com/#investors' }
  ],
  social: [
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/offchainlabs',
      icon: (props: any) => (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z" />
        </svg>
      )
    },
    {
      name: 'Linkedin',
      href: 'https://www.linkedin.com/company/offchain-labs-inc/',
      icon: (props: any) => (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          version="1.1"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d="M6 6h2.767v1.418h0.040c0.385-0.691 1.327-1.418 2.732-1.418 2.921 0 3.461 1.818 3.461 4.183v4.817h-2.885v-4.27c0-1.018-0.021-2.329-1.5-2.329-1.502 0-1.732 1.109-1.732 2.255v4.344h-2.883v-9z" />
          <path d="M1 6h3v9h-3v-9z" />
          <path d="M4 3.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5z" />
        </svg>
      ),
      classes: 'relative'
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/OffchainLabs',
      icon: (props: any) => (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z" />
        </svg>
      )
    },
    {
      name: 'GitHub',
      href: 'https://github.com/OffchainLabs/arbitrum',
      icon: (props: any) => (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 496 512"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
        </svg>
      )
    },
    {
      name: 'Discord',
      href: 'https://discord.gg/ZpZuw7p',
      icon: (props: any) => (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 448 512"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d="M297.216 243.2c0 15.616-11.52 28.416-26.112 28.416-14.336 0-26.112-12.8-26.112-28.416s11.52-28.416 26.112-28.416c14.592 0 26.112 12.8 26.112 28.416zm-119.552-28.416c-14.592 0-26.112 12.8-26.112 28.416s11.776 28.416 26.112 28.416c14.592 0 26.112-12.8 26.112-28.416.256-15.616-11.52-28.416-26.112-28.416zM448 52.736V512c-64.494-56.994-43.868-38.128-118.784-107.776l13.568 47.36H52.48C23.552 451.584 0 428.032 0 398.848V52.736C0 23.552 23.552 0 52.48 0h343.04C424.448 0 448 23.552 448 52.736zm-72.96 242.688c0-82.432-36.864-149.248-36.864-149.248-36.864-27.648-71.936-26.88-71.936-26.88l-3.584 4.096c43.52 13.312 63.744 32.512 63.744 32.512-60.811-33.329-132.244-33.335-191.232-7.424-9.472 4.352-15.104 7.424-15.104 7.424s21.248-20.224 67.328-33.536l-2.56-3.072s-35.072-.768-71.936 26.88c0 0-36.864 66.816-36.864 149.248 0 0 21.504 37.12 78.08 38.912 0 0 9.472-11.52 17.152-21.248-32.512-9.728-44.8-30.208-44.8-30.208 3.766 2.636 9.976 6.053 10.496 6.4 43.21 24.198 104.588 32.126 159.744 8.96 8.96-3.328 18.944-8.192 29.44-15.104 0 0-12.8 20.992-46.336 30.464 7.68 9.728 16.896 20.736 16.896 20.736 56.576-1.792 78.336-38.912 78.336-38.912z" />
        </svg>
      )
    }
  ]
}

export default function Footer() {
  const router = useHistory()
  return (
    <footer className="bg-gray-800" aria-labelledby="footerHeading">
      <h2 id="footerHeading" className="sr-only">
        Footer
      </h2>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="flex flex-col md:flex-row">
          <div className="hidden md:inline-block md:order-1 mr-auto">
            <img
              className="w-48"
              src="/images/Arbitrum_Vertical_Logo_-_Full_color_-_White_background.svg"
              alt="Arbitrum logo"
            />
          </div>
          <div className="block md:hidden order-2 flex items-center pt-8 border-t border-gray-700">
            <img
              className="w-16 flex"
              src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
              alt="Arbitrum logo"
            />
            <img
              className="w-56 flex ml-2"
              src="/images/Arbitrum_Logo_Name.svg"
              alt="Arbitrum logo"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 md:gap-x-32 md:gap-y-12 lg:gap-x-20 lg:gap-y-0 order-1 md:order-2 pb-8 md:pb-0">
            <div className="mt-12 md:mt-0 order-1">
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Product
              </h3>
              <ul className="mt-4 space-y-4">
                {navigation.product.map(item => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-base text-gray-300 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12 md:mt-0 order-3 lg:order-2">
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Community
              </h3>
              <ul className="mt-4 space-y-4">
                {navigation.community.map(item => (
                  <li key={item.name}>
                    {item.href.startsWith('/') ? (
                      <Link
                        to={item.href}
                        className="text-base text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-base text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12 md:mt-0 order-2 lg:order-3">
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Learn more
              </h3>
              <ul className="mt-4 space-y-4">
                {navigation.learnmore.map(item => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-base text-gray-300 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12 md:mt-0 order-4">
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Offchain Labs
              </h3>
              <ul className="mt-4 space-y-4">
                {navigation.officanlabs.map(item => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-base text-gray-300 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            {navigation.social.map(item => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-400 hover:text-gray-300"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon
                  className={`h-5 w-5 ${item.classes}`}
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            &copy; Offchain Labs, Inc, 2021. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
