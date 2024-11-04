import React from 'react'
import satori, { Font } from 'satori'
import sharp from 'sharp'
import fs from 'fs'
import { ChainId } from './util/networks'
import { getBridgeUiConfigForChain } from './util/bridgeUiConfig'

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
  id: ChainId | number
  name?: string
  slug?: string
  logo: string
}

type ChainCombination = [Chain, Chain]

const configs: ChainCombination[] = [
  [
    {
      id: ChainId.Ethereum,
      logo: 'https://l2beat.com/icons/ethereum.png'
    },
    {
      id: ChainId.ArbitrumOne,
      logo: 'https://l2beat.com/icons/arbitrum.png'
    }
  ],
  [
    {
      id: ChainId.Ethereum,
      logo: 'https://l2beat.com/icons/ethereum.png'
    },
    {
      id: ChainId.ArbitrumNova,
      logo: 'https://l2beat.com/icons/nova.png'
    }
  ],
  [
    {
      id: ChainId.ArbitrumOne,
      logo: 'https://l2beat.com/icons/arbitrum.png'
    },
    {
      id: 660279,
      name: 'Xai',
      slug: 'xai',
      logo: 'https://bin.bnbstatic.com/static/research/xai.png'
    }
  ]
]

function ChainWrapper({
  chain,
  direction
}: {
  chain: Chain
  direction: 'From' | 'To'
}) {
  const chainConfig = getBridgeUiConfigForChain(chain.id)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '760px',
        gap: '6px',
        padding: '25px',
        backgroundColor: `${chainConfig.color}40`,
        border: '1px solid',
        borderColor: chainConfig.color,
        borderRadius: '5px'
      }}
    >
      <span
        style={{
          display: 'block',
          color: 'white',
          backgroundColor: chainConfig.color,
          padding: '15px 20px',
          fontSize: '60px',
          borderRadius: '5px'
        }}
      >
        {direction}: {chainConfig.network.name ?? chain.name}
      </span>
      <img src={chain.logo} width={80} height={80} />
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
        height: dimensions.height,
        backgroundColor: 'black'
      }}
    >
      <div
        style={{
          transform: 'rotate(180deg)',
          mixBlendMode: 'overlay',
          backgroundImage:
            'url("https://arbitrum.io/background/grains_bottom.png")',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          width: '100%',
          height: '100%',
          opacity: 0.35
        }}
      />
      <img
        style={{
          position: 'absolute',
          top: '100px',
          left: '10px'
        }}
        src="https://file.notion.so/f/f/80206c3c-8bc5-49a2-b0cd-756884a06880/66797a3e-80c6-4bff-8d3c-f278ff6b201f/0923_Arbitrum_Logos_AllWhite_vertical_RGB.png?table=block&id=73ae889b-4295-4018-a3eb-23cdd02d6324&spaceId=80206c3c-8bc5-49a2-b0cd-756884a06880&expirationTimestamp=1730570400000&signature=LstJJPDHP4DCVtDWNkyCoMM63OgSJoqPD8QHr_5q0jY&downloadName=AllWhite_vertical_RGB.png"
        width={320}
        height={345}
        alt="Arbitrum Logo"
      />
      <span
        style={{
          position: 'absolute',
          top: '430px',
          left: '105px',
          fontSize: '40px',
          fontWeight: '500',
          color: 'white'
        }}
      >
        BRIDGE
      </span>
      <div
        style={{
          ...dimensions,
          position: 'absolute',
          top: 0,
          left: '320px',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 85px 90px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            height: 200,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            fontSize: '40px',
            fontWeight: '500',
            color: 'white'
          }}
        >
          <ChainWrapper chain={from} direction="From" />
          {/* arrow png */}
          <ChainWrapper chain={to} direction="To" />
        </div>
      </div>
    </div>,
    {
      ...dimensions,
      fonts: [font]
    }
  )

  const file = `${from.id}-to-${to.id}.jpg`
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
