import { CommonAddress } from '../../../util/CommonAddressUtils'
import { ExternalLink } from '../../common/ExternalLink'
import { Checkbox } from '../../common/Checkbox'
import { useChainId } from 'wagmi'
import { getExplorerUrl } from '../../../util/networks'
import { useEffect, useState } from 'react'

export function USDCDepositConfirmationDialogCheckbox({
  onChange,
  onAllCheckboxesCheched,
  isBridingNativeUSDC
}: {
  onChange: (checked: boolean) => void
  onAllCheckboxesCheched?: () => void
  isBridingNativeUSDC?: true
}) {
  const [checkboxesChecked, setCheckboxesChecked] = useState([
    false,
    false,
    false
  ])
  const chainId = useChainId()
  const externalLinkClassnames = 'arb-hover text-blue-link underline'

  function linksOnClickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  useEffect(() => {
    if (checkboxesChecked.every(checked => checked)) {
      onAllCheckboxesCheched?.()
    }
  }, [checkboxesChecked, onAllCheckboxesCheched])

  return (
    <>
      {isBridingNativeUSDC && (
        <>
          <Checkbox
            label={
              <span className="select-none font-light">
                I understand that I&apos;ll have to send{' '}
                <span className="strong">a second transaction on L2</span> and
                pay another L2 fee to claim my USDC.
              </span>
            }
            checked={checkboxesChecked[0] ?? false}
            onChange={checked => {
              onChange(checked)
              setCheckboxesChecked(prevCheckboxesState => {
                const newState = [...prevCheckboxesState]
                newState[0] = checked
                return newState
              })
            }}
          />
          <Checkbox
            label={
              <span className="select-none font-light">
                I understand that it will take{' '}
                <span className="strong">~15 minutes</span> before I can claim
                my USDC on Arbitrum One.
              </span>
            }
            checked={checkboxesChecked[1] ?? false}
            onChange={checked => {
              onChange(checked)
              setCheckboxesChecked(prevCheckboxesState => {
                const newState = [...prevCheckboxesState]
                newState[1] = checked
                return newState
              })
            }}
          />
        </>
      )}
      <Checkbox
        label={
          <span className="select-none font-light">
            I understand{' '}
            <ExternalLink
              className={externalLinkClassnames}
              href={`${getExplorerUrl(chainId)}/token/${
                CommonAddress.ArbitrumOne['USDC.e']
              }`}
              onClick={linksOnClickHandler}
            >
              USDC.e
            </ExternalLink>{' '}
            is different from{' '}
            <ExternalLink
              className={externalLinkClassnames}
              href={`${getExplorerUrl(chainId)}/token/${
                CommonAddress.ArbitrumOne.USDC
              }`}
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
        checked={checkboxesChecked[2] ?? false}
        onChange={checked => {
          onChange(checked)
          setCheckboxesChecked(prevCheckboxesState => {
            const newState = [...prevCheckboxesState]
            newState[2] = checked
            return newState
          })
        }}
      />
    </>
  )
}
