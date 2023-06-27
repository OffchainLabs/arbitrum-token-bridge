import { CommonAddress } from '../../../util/CommonAddressUtils'
import { ExternalLink } from '../../common/ExternalLink'
import { Checkbox } from '../../common/Checkbox'

export function USDCDepositConfirmationDialogCheckbox({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const externalLinkClassnames = 'arb-hover text-blue-link underline'

  function linksOnClickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  return (
    <Checkbox
      label={
        <span className="select-none font-light">
          I understand{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
            onClick={linksOnClickHandler}
          >
            USDC.e
          </ExternalLink>{' '}
          is different from{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne.USDC}`}
            onClick={linksOnClickHandler}
          >
            USDC
          </ExternalLink>
          .{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href="https://arbitrumfoundation.medium.com/usdc-to-come-natively-to-arbitrum-f751a30e3d83"
            onClick={linksOnClickHandler}
          >
            Learn more
          </ExternalLink>
          .
        </span>
      }
      checked={checked}
      onChange={onChange}
    />
  )
}
