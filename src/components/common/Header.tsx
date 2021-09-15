import React from 'react'

const Header: React.FC = () => {
  return (
    <header>
      <div className="border-b border-gray-700">
        <div className="flex items-center w-full h-16 px-4 sm:px-0 justify-between">
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0">
              <img
                className="w-8 h-8"
                src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
                alt="Arbitrum logo"
              />
            </a>
            <div className="block">
              <div className="ml-6 flex items-baseline space-x-4">
                <a
                  href="/"
                  className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Bridge
                </a>
                <a
                  href="https://portal.arbitrum.one/"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Portal
                </a>
                <a
                  href="https://explorer.arbitrum.io/"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Explorer
                </a>
                <a
                  href="https://developer.offchainlabs.com/"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Documentation
                </a>
                <a
                  href="/data/token-list-42161.json"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Token List
                </a>
              </div>
            </div>
          </div>
          <div>
            <a
              href="https://discord.com/invite/5KE54JwyTs"
              target="_blank"
              className="bg-bright-blue hover:bg-faded-blue text-navy rounded-md text-sm font-medium"
              style={{ padding: '10px 12px' }}
              rel="noopener noreferrer"
            >
              Join Community
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export { Header }
