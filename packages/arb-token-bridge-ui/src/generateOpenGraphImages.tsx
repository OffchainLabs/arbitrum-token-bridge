import React from 'react'
import satori, { Font } from 'satori'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import yargs, { Arguments, InferredOptionTypes } from 'yargs'
import { hideBin } from 'yargs/helpers'

// this has to be called before import from "networks.ts"
// to ensure that the environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { isNetwork } from './util/networks'
import { ChainId } from './types/ChainId'
import { getBridgeUiConfigForChain } from './util/bridgeUiConfig'
import { orbitMainnets, orbitTestnets } from './util/orbitChainsList'

const dimensions = {
  width: 1200,
  height: 627
} as const

async function getFonts(): Promise<Font[]> {
  const unica77_regular = fs.readFileSync('./src/font/Unica77LL-Regular.otf')
  const unica77_medium = fs.readFileSync('./src/font/Unica77LL-Medium.otf')

  return [
    {
      name: 'Unica77',
      data: unica77_regular,
      weight: 400,
      style: 'normal'
    },
    {
      name: 'Unica77',
      data: unica77_medium,
      weight: 500,
      style: 'normal'
    }
  ]
}

type Chain = ChainId | number

type ChainCombination = [Chain, Chain]

const chainToLogo: { [key: Chain]: string } = {
  [ChainId.Ethereum]: 'https://l2beat.com/icons/ethereum.png',
  [ChainId.ArbitrumOne]: 'https://l2beat.com/icons/arbitrum.png',
  [ChainId.ArbitrumNova]: 'https://l2beat.com/icons/nova.png',
  [ChainId.Sepolia]: 'https://l2beat.com/icons/ethereum.png',
  [ChainId.ArbitrumSepolia]: 'https://l2beat.com/icons/arbitrum.png'
}

const configs: ChainCombination[] = [
  [ChainId.Ethereum, ChainId.ArbitrumOne],
  [ChainId.Ethereum, ChainId.ArbitrumNova],
  [ChainId.Sepolia, ChainId.ArbitrumSepolia],
  ...Object.values(orbitMainnets).map(
    chain => [chain.parentChainId, chain.chainId] as ChainCombination
  ),
  ...Object.values(orbitTestnets).map(
    chain => [chain.parentChainId, chain.chainId] as ChainCombination
  )
]

function ChainWrapper({
  chain,
  direction
}: {
  chain: Chain
  direction: 'From' | 'To'
}) {
  const chainConfig = getBridgeUiConfigForChain(chain)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '825px',
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
        {direction}: {chainConfig.network.name}
      </span>
      <img
        src={chainToLogo[chain]}
        alt={`${chainConfig.network.name} logo`}
        width={80}
        height={80}
        style={{ opacity: 0.5 }}
      />
    </div>
  )
}

function ArbitrumLogo({
  style,
  width,
  height
}: {
  style: React.CSSProperties
  width: number
  height: number
}) {
  return (
    <img
      style={style}
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUEAAAFZCAYAAAAGi53HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAACbjSURBVHgB7d0HvBxV9Qfw8+gmIFVAWh6ELggonRBCCVJEuoCCPvgHJCKCfERsVBUUFUSKSpEI0puEnlASuqj0GsoLCUGRXkPN+f+Od9CXzezO3d05uzO7v+/ncz6b7N7dN29297yZO/eeK0JERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERJSqR4haRFXnx80wxDqIXsQQxAKI1xAvIB5E3I24raen5wMhIuoESH5rIcYgXtU4LyPOQvQKEVFZIYktjjhXG/cR4iTEECEiKgskrcGIIxFvaT6mIr6NmE2IiIoMiWok4l/q4xnEZkJEVDQa+v1u1ta4UNlfSERFoKHf7w8a+u9a6UPEyYglhIio1ZB8ZkMcovFXfL30I/YWIqJWQdLZBvGkFssjiGFCROQFSebziPFabOcp+wuJKE9IKgsgjkW8qeVgQ3N+hJhbiIgahSQyB+IgxItaTv2IPiGqgXOHKRWSx3DcnIpYTcrP5iTv2tPTM0mIKnAEPs0EyW9JxF/wz4nimwBvRWyKWAixM+Ih8fNZxBP4vc5ALCNERJWQHD6J+AnidfU1BbFLlW3YJzmF9WTFGQ5FDBYiIg3j/XZDvKC+LLkeiZgnY3vmRRyv/oOv+xE7ChF1LySBjRAT1d/ZWmclGLTvRfxZ/V2LWE6IqHvgS78U4hz1P9q6G7GhNAHP3xzxtPr7nXJ8IVFn03Dqa/1h3lPdXkKMQuQy+gCvMzviAPU/Ze9HfDOv7SaiAsEX+4uIyerrfcTPEAuIAw1HsKdrKJ7gyUp2bSNEVH74Mq+krSlxdQViaWkBDf2F49TfRcpTZKJywpd3IcSvNBydeXoAsaW0AX7uXuo/pGY64mjEwkJExYcv6yc09Pu9or7s9b+nbZ6fq6G/0LbjJfX1LGIfIaLiwpd0BOJh9WdHmAtKgWg4RT5T/VkJsbWFiIoDX8plEWPV302I1aXANJT5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"
      width={width}
      height={height}
      alt="Arbitrum Logo"
    />
  )
}

function getCoreChainImage(from: Chain, to: Chain) {
  return (
    <div
      style={{
        ...dimensions,
        display: 'flex',
        position: 'relative',
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: 'black',
        fontFamily: 'Unica77'
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
      <ArbitrumLogo
        style={{
          position: 'absolute',
          top: '100px',
          left: '10px'
        }}
        width={320}
        height={345}
      />
      <span
        style={{
          position: 'absolute',
          top: '425px',
          left: '85px',
          fontSize: '40px',
          fontWeight: '500',
          color: 'white',
          letterSpacing: '4px'
        }}
      >
        BRIDGE
      </span>
      <div
        style={{
          ...dimensions,
          position: 'absolute',
          top: 0,
          left: '160px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px',
          fontSize: '40px',
          fontWeight: '400',
          color: 'white'
        }}
      >
        <ChainWrapper chain={from} direction="From" />
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAABBCAYAAABMx43BAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAF3SURBVHgB7dmBcYIwFMbxh9cBOooj0A26AWzQEXSDdgPaSWwnqBvIBrpB+tKG9qpCXpIvAe/e/y6ndyD8AME7QwTKGPPE42B+sq8bWlIMejbX29ESYkhtpqspsRWlV3uWN5QYApk9RaJSJCpFolIkKkWiUiQqRaJSJCpFolIkKkWiUiQqRaJSJCpFolIkKkWiugnk3fCGZwnu6e9P+n1VVT0VzhkeeZwuDLyw4XE8m9ro3Id8G956pkg6EjQyF7QZFq4ndvDpgyKQ7oSM1drv5NT02prHzgjOaGzuINqJVZqVg0yVDSoA2mqL7MkfHCoE2nqL/CBZMGgA0PY+fOjVyPt3M4XeOJ6b5Oq+vh/m/Dxq+eWNZEWf0cAzuOfxwLbT7y9ObmgscGxjoZf+xbNOZyIuMQmOOgTq6xiwrgyYCYoHzgCNAxaEpgELQDHAjFAsMAM0DxAIzQsEQMsAE6BlgRHQeYAB0HmBAugygEOMaR3KduCxJVBfLnVlwvIHe58AAAAASUVORK5CYII="
          alt="arrow"
          width={41}
          height={67}
        />
        <ChainWrapper chain={to} direction="To" />
      </div>
    </div>
  )
}

async function getOrbitChainImage(orbitChain: Chain) {
  const chainConfig = getBridgeUiConfigForChain(orbitChain)
  const isSvg = chainConfig.network.logo.endsWith('.svg')
  const logoFileBuffer = fs.readFileSync(`./public${chainConfig.network.logo}`)

  console.log(`Generating image for ${orbitChain}`)

  const imageContent = isSvg
    ? await sharp(logoFileBuffer)
        .resize({
          width: 120,
          height: 120,
          fit: 'contain',
          background: 'transparent'
        })
        .toBuffer()
    : await sharp(logoFileBuffer).png().toBuffer()

  return (
    <div
      style={{
        ...dimensions,
        display: 'flex',
        position: 'relative',
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: chainConfig.color,
        fontFamily: 'Unica77'
      }}
    >
      <div
        style={{
          ...dimensions,
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}
      ></div>
      <div
        style={{
          ...dimensions,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          textAlign: 'center',
          paddingLeft: '40px',
          paddingRight: '40px'
        }}
      >
        <ArbitrumLogo
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '40px'
          }}
          width={156}
          height={168}
        />
        <img
          src={`data:image/png;base64,${imageContent.toString('base64')}`}
          width={120}
          height={120}
          alt="logo"
          style={{ marginBottom: '40px' }}
        />
        <span
          style={{
            fontSize: '112px',
            fontWeight: '500',
            color: 'white',
            letterSpacing: '4px',
            lineHeight: '1',
            marginBottom: '30px'
          }}
        >
          {chainConfig.network.name.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: '60px',
            fontWeight: '500',
            color: 'white',
            letterSpacing: '4px',
            lineHeight: '1'
          }}
        >
          BRIDGE
        </span>
      </div>
    </div>
  )
}
async function generateSvg(orbitChain: Chain): Promise<void>
async function generateSvg({
  from,
  to
}: {
  from: Chain
  to: Chain
}): Promise<void>
async function generateSvg(
  chainsOrOrbitChain: Chain | { from: Chain; to: Chain }
): Promise<void> {
  const fonts = await getFonts()
  const isOrbitChain = typeof chainsOrOrbitChain === 'number'

  const svg = await satori(
    isOrbitChain
      ? await getOrbitChainImage(chainsOrOrbitChain)
      : getCoreChainImage(chainsOrOrbitChain.from, chainsOrOrbitChain.to),
    {
      ...dimensions,
      fonts
    }
  )

  const file = isOrbitChain
    ? `${chainsOrOrbitChain}.jpg`
    : `${chainsOrOrbitChain.from}-to-${chainsOrOrbitChain.to}.jpg`
  const filePath = `./public/images/__auto-generated/open-graph/${file}`

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(filePath)

  console.log(`Generated ${filePath}`)
}

const generateOptions = {
  core: {
    alias: 'c',
    type: 'boolean',
    description: 'Generate images for core chains',
    default: false
  },
  orbit: {
    alias: 'o',
    type: 'boolean',
    description: 'Generate images for orbit chains',
    default: true
  }
} as const

type Args = Arguments<InferredOptionTypes<typeof generateOptions>>

async function generate(argv: Args) {
  for (const combination of configs) {
    const { isCoreChain: isChildChainCoreChain } = isNetwork(combination[1])

    if (argv.orbit && !isChildChainCoreChain) {
      await generateSvg(combination[1])
    }

    if (argv.core && isChildChainCoreChain) {
      await generateSvg({ from: combination[0], to: combination[1] })
      await generateSvg({ from: combination[1], to: combination[0] })
    }
  }
}

yargs(hideBin(process.argv))
  .command<Args>({
    command: 'generate',
    describe: 'Generate OpenGraph images',
    handler: async argv => {
      await generate(argv)
    }
  })
  .options(generateOptions)
  .parse()
