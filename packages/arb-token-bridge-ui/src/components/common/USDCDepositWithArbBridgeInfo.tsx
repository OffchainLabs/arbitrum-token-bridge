import { CommonAddress } from '../../util/CommonAddressUtils'
import { ExternalLink } from './ExternalLink'
import { Checkbox } from './Checkbox'

export function USDCDepositWithArbBridgeInfo({
  USDCcheckboxChecked,
  setUSDCcheckboxChecked
}: {
  USDCcheckboxChecked: boolean
  setUSDCcheckboxChecked: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const externalLinkClassnames = 'arb-hover text-blue-link underline'

  return (
    <div className="flex flex-col space-y-3">
      <p className="font-light">
        Receive{' '}
        <ExternalLink
          className={externalLinkClassnames}
          href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
        >
          Bridged USDC (USDC.e)
        </ExternalLink>{' '}
        on Arbitrum One using Arbitrum’s native bridge.
      </p>

      <div className="flex flex-col space-y-6">
        <Checkbox
          label={
            <span className="font-light">
              I understand{' '}
              <ExternalLink
                className={externalLinkClassnames}
                href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
              >
                USDC.e
              </ExternalLink>{' '}
              is different from{' '}
              <ExternalLink
                className={externalLinkClassnames}
                href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne.USDC}`}
              >
                USDC
              </ExternalLink>
              .{' '}
              <ExternalLink
                className={externalLinkClassnames}
                href="https://arbitrumfoundation.medium.com/usdc-to-come-natively-to-arbitrum-f751a30e3d83"
              >
                Learn more
              </ExternalLink>
              .
            </span>
          }
          checked={USDCcheckboxChecked}
          onChange={setUSDCcheckboxChecked}
        />
      </div>
    </div>
  )
}
