import { ExternalLink } from '../../common/ExternalLink'
import { Checkbox } from '../../common/Checkbox'
import { useEffect, useState } from 'react'
import { isNetwork } from '../../../util/networks'
import { useNetwork } from 'wagmi'

export function USDCDepositConfirmationDialogCheckbox({
  onChange,
  onAllCheckboxesCheched,
  isBridgingNativeUSDC
}: {
  onChange: (checked: boolean) => void
  onAllCheckboxesCheched?: () => void
  isBridgingNativeUSDC?: true
}) {
  const [checkboxesChecked, setCheckboxesChecked] = useState([
    false,
    false,
    false
  ])
  const externalLinkClassnames = 'arb-hover underline'
  const { chain } = useNetwork()
  const { isTestnet } = isNetwork(chain?.id ?? 0)

  const destinationNetworkName = isTestnet ? 'Arbitrum Sepolia' : 'Arbitrum One'

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
      {isBridgingNativeUSDC && (
        <>
          <Checkbox
            label={
              <span className="select-none font-light">
                I understand that I&apos;ll have to send{' '}
                <span className="font-medium">
                  a second transaction on {destinationNetworkName}
                </span>{' '}
                and pay another {destinationNetworkName} fee to claim my USDC.
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
                <span className="font-medium">
                  {isTestnet ? '~1 minute' : '~15 minutes'}
                </span>{' '}
                before I can claim my USDC on {destinationNetworkName}.
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
            I understand <span className="font-medium">USDC.e</span> is
            different from <span className="font-medium">USDC</span>.{' '}
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
