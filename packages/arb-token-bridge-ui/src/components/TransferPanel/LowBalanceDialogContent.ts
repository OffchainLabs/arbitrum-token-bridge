export const LowBalanceDialogContent = {
  CentralizedExchanges: [
    {
      href: 'https://www.binance.com',
      title: 'Binance',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2021/11/i0KjbCry_400x400.jpg'
    },
    {
      href: 'https://www.bitget.com',
      title: 'Bitget',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/02/bitget.jpeg'
    },
    {
      href: 'https://www.bybit.com',
      title: 'Bybit',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/01/20220126-215931.png'
    },
    {
      href: 'https://crypto.com',
      title: 'Crypto.com',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2021/11/404-4048020_crypto-com-logo-svg-hd-png-download.png'
    },
    {
      href: 'https://ftx.com',
      title: 'FTX',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/02/7_HigzNT_400x400.png'
    },
    {
      href: 'https://www.huobi.com',
      title: 'Huobi',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2021/09/huobi.jpg'
    },
    {
      href: 'https://www.kucoin.com',
      title: 'Kucoin',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/04/q56IIHA_400x400.jpg'
    },
    {
      href: 'https://www.mexc.com',
      title: 'MEXC',
      imageSrc: 'https://www.mexc.com/sites/favicon.png'
    },
    {
      href: 'https://www.okx.com',
      title: 'OKX',
      imageSrc: 'https://portal.arbitrum.one/wp-content/uploads/2021/08/okx.png'
    }
  ],
  FiatOnRamps: [
    {
      href: 'https://arbitrum.banxa.com',
      title: 'Banxa',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2021/12/Banxa-Icon-RGB.png'
    },
    {
      href: 'https://www.cryptorefills.com',
      title: 'CryptoRefills',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/02/NpCfgNkI_400x400.jpg'
    },
    {
      href: 'https://fluid.ch',
      title: 'FluidFi',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/05/aZUvXpeh_400x400.jpg'
    },
    {
      href: 'https://www.mtpelerin.com/on-off-ramp',
      title: 'Mt Pelerin',
      imageSrc: 'https://portal.arbitrum.one/wp-content/uploads/2022/01/mt.png'
    },
    {
      href: 'https://ramp.network',
      title: 'Ramp',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/05/2iU0-aH9_400x400.png'
    },
    {
      href: 'https://www.simplex.com',
      title: 'Simplex',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/05/85g3O4A-_400x400.jpg'
    },
    {
      href: 'https://transak.com',
      title: 'Transak',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/02/photo_2022-01-29_08-32-43.jpg'
    },
    {
      href: 'https://wirexapp.com',
      title: 'Wirex',
      imageSrc:
        'https://portal.arbitrum.one/wp-content/uploads/2022/05/Z0uAglMT_400x400.png'
    }
  ]
} as const

// CEX
const CEXNames = LowBalanceDialogContent.CentralizedExchanges.map(
  cex => cex.title
)

export type CEXName = typeof CEXNames[number]

// Fiat On-ramp
const FiatOnRampNames = LowBalanceDialogContent.FiatOnRamps.map(
  fiat => fiat.title
)

export type FiatOnRampName = typeof FiatOnRampNames[number]
