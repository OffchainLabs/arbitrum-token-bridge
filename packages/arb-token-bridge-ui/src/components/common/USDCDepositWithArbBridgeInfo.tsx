import { CommonAddress } from '../../util/CommonAddressUtils'
import { ExternalLink } from './ExternalLink'

export function USDCDepositWithArbBridgeInfo() {
  const externalLinkClassnames = 'arb-hover text-blue-link underline'
  return (
    <div className="flex flex-col space-y-3">
      <p className="font-light">
        If you choose to use Arbitrum’s bridge instead, you’ll have to do two
        transfers to obtain{' '}
        <ExternalLink
          className={externalLinkClassnames}
          href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne.USDC}`}
        >
          native USDC
        </ExternalLink>
        .
      </p>
      <ol className="list-decimal px-4 font-light">
        <li>
          Transfer{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://etherscan.io/token/${CommonAddress.Mainnet.USDC}`}
          >
            USDC
          </ExternalLink>{' '}
          on Arbitrum’s bridge to get{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
          >
            Bridged USDC (USDC.e)
          </ExternalLink>
        </li>
        <li>
          Swap{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
          >
            Bridged USDC (USDC.e)
          </ExternalLink>{' '}
          for{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne.USDC}`}
          >
            native USDC
          </ExternalLink>{' '}
          on a{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href="https://portal.arbitrum.io/one?categories=dex_dex-aggregator"
          >
            decentralized exchange on Arbitrum One
          </ExternalLink>
        </li>
      </ol>
    </div>
  )
}
