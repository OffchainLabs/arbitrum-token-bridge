import React from 'react'
import satori, { Font } from 'satori'
import sharp from 'sharp'
import fs from 'fs'

const dimensions = {
  width: 1200,
  height: 627
} as const

async function getFont(): Promise<Font> {
  const spaceGrotesk = fs.readFileSync('./SpaceGrotesk-Medium.ttf')

  return {
    name: 'Space Grotesk',
    data: spaceGrotesk,
    weight: 500,
    style: 'normal'
  }
}

type Chain = {
  name: string
  slug: string
  logo: string
}

type ChainCombination = [Chain, Chain]

const configs: ChainCombination[] = [
  [
    {
      name: 'Ethereum',
      slug: 'ethereum',
      logo: 'https://l2beat.com/icons/ethereum.png'
    },
    {
      name: 'Arbitrum One',
      slug: 'arbitrum-one',
      logo: 'https://l2beat.com/icons/arbitrum.png'
    }
  ],
  [
    {
      name: 'Ethereum',
      slug: 'ethereum',
      logo: 'https://l2beat.com/icons/ethereum.png'
    },
    {
      name: 'Arbitrum Nova',
      slug: 'arbitrum-nova',
      logo: 'https://l2beat.com/icons/nova.png'
    }
  ],
  [
    {
      name: 'Arbitrum One',
      slug: 'arbitrum-one',
      logo: 'https://l2beat.com/icons/arbitrum.png'
    },
    {
      name: 'Xai',
      slug: 'xai',
      logo: 'https://bin.bnbstatic.com/static/research/xai.png'
    }
  ]
]

function ChainWrapper({ chain }: { chain: Chain }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0,0,0, 1)',
          borderRadius: '50%',
          padding: '8px'
        }}
      >
        <img src={chain.logo} width={38} height={38} />
      </div>
      {chain.name}
    </div>
  )
}

async function generateSvg({ from, to }: { from: Chain; to: Chain }) {
  const font = await getFont()

  const svg = await satori(
    //
    <div
      style={{
        ...dimensions,
        display: 'flex',
        position: 'relative',
        width: dimensions.width,
        height: dimensions.height
      }}
    >
      <img
        src="https://bridge.arbitrum.io/og-image.jpg"
        width={1200}
        height={627}
        alt="Arbitrum Bridge"
      />
      <div
        style={{
          ...dimensions,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-end',
          padding: '0 85px 90px'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '45px',
            width: '100%',
            height: 90,
            alignItems: 'center',
            justifyContent: 'flex-start',
            fontSize: '40px',
            fontWeight: '500',
            color: 'white'
          }}
        >
          <ChainWrapper chain={from} />
          <ChainWrapper chain={to} />
        </div>
      </div>
    </div>,
    {
      ...dimensions,
      fonts: [font]
    }
  )

  const file = `${from.slug}-to-${to.slug}.jpg`
  const filePath = `./public/images/__auto-generated/open-graph/${file}`

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(filePath)

  console.log(`Generated ${filePath}`)
}

async function main() {
  for (const combination of configs) {
    await generateSvg({ from: combination[0], to: combination[1] })
    await generateSvg({ from: combination[1], to: combination[0] })
  }
}

main()
