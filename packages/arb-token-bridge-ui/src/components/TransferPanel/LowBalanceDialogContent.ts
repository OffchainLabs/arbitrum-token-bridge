export const LowBalanceDialogContent = {
  CentralizedExchanges: [
    {
      href: 'https://www.binance.com',
      title: 'Binance',
      imageSrc: '/images/projects/binance-logo.webp'
    },
    {
      href: 'https://www.bitget.com',
      title: 'Bitget',
      imageSrc: '/images/projects/bitget-logo.webp'
    },
    {
      href: 'https://www.bybit.com',
      title: 'Bybit',
      imageSrc: '/images/projects/bybit-logo.webp'
    },
    {
      href: 'https://crypto.com',
      title: 'Crypto.com',
      imageSrc: '/images/projects/crypto-com-logo.webp'
    },
    {
      href: 'https://www.kucoin.com',
      title: 'Kucoin',
      imageSrc: '/images/projects/kucoin-logo.webp'
    },
    {
      href: 'https://www.mexc.com',
      title: 'MEXC',
      imageSrc: '/images/projects/mexc-exchange-logo.webp'
    },
    {
      href: 'https://www.okx.com',
      title: 'OKX',
      imageSrc: '/images/projects/okex-logo.webp'
    }
  ],
  FiatOnRamps: [
    {
      href: 'https://arbitrum.banxa.com',
      title: 'Banxa',
      imageSrc: '/images/projects/banxa-logo.webp'
    },
    {
      href: 'https://www.cryptorefills.com',
      title: 'CryptoRefills',
      imageSrc: '/images/projects/cryptorefills-logo.webp'
    },
    {
      href: 'https://fluid.ch',
      title: 'FluidFi',
      imageSrc: '/images/projects/fluidfi-logo.webp'
    },
    {
      href: 'https://www.mtpelerin.com/on-off-ramp',
      title: 'Mt Pelerin',
      imageSrc: '/images/projects/mt-pelerin-logo.webp'
    },
    {
      href: 'https://ramp.network',
      title: 'Ramp',
      imageSrc: '/images/projects/ramp-network-logo.webp'
    },
    {
      href: 'https://www.simplex.com',
      title: 'Simplex',
      imageSrc: '/images/projects/simplex-logo.webp'
    },
    {
      href: 'https://transak.com',
      title: 'Transak',
      imageSrc: '/images/projects/transak-logo.webp'
    },
    {
      href: 'https://wirexapp.com',
      title: 'Wirex',
      imageSrc: '/images/projects/wirex-logo.webp'
    }
  ]
} as const

// CEX
const CEXNames = LowBalanceDialogContent.CentralizedExchanges.map(
  cex => cex.title
)

export type CEXName = (typeof CEXNames)[number]

// Fiat On-ramp
const FiatOnRampNames = LowBalanceDialogContent.FiatOnRamps.map(
  fiat => fiat.title
)

export type FiatOnRampName = (typeof FiatOnRampNames)[number]
