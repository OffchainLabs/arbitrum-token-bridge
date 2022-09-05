import { Fragment, useState } from 'react'
import {
  CheckIcon,
  XIcon,
  ExclamationCircleIcon,
  StarIcon as StarIconOutline,
  ExternalLinkIcon
} from '@heroicons/react/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/solid'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { useLocalStorage } from '@rehooks/local-storage'
import dayjs from 'dayjs'

import GoogleCalendarIcon from '../../assets/GoogleCalendar.svg'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { TabButton } from '../common/Tab'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { useAppState } from '../../state'

const FastBridges = [
  {
    name: 'Hop',
    imageSrc:
      'https://s3.us-west-1.amazonaws.com/assets.hop.exchange/images/hop_logo.png',
    href: 'https://app.hop.exchange/#/send?sourceNetwork=arbitrum&destNetwork=ethereum'
  },
  {
    name: 'Celer',
    imageSrc:
      'https://www.celer.network/static/Black-4d795924d523c9d8d45540e67370465a.png',
    href: 'https://cbridge.celer.network/42161/1/ETH'
  },
  {
    name: 'Connext',
    imageSrc: 'https://bridge.connext.network/logos/logo_white.png',
    href: 'https://bridge.connext.network/from-arbitrum-to-ethereum'
  },
  {
    name: 'Across',
    imageSrc:
      'https://2085701667-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fo33kX1T6RRp4inOcEH1d%2Fuploads%2FVqg353nqWxKYvWS16Amd%2FAcross-logo-greenbg.png?alt=media&token=23d5a067-d417-4b1c-930e-d40ad1d8d89a',
    href: 'https://across.to/?from=42161&to=1'
  },
  {
    name: 'Stargate',
    imageSrc: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18934.png',
    href: 'https://stargate.finance/transfer?srcChain=arbitrum&dstChain=ethereum&srcToken=eth'
  },
  {
    name: 'Synapse',
    imageSrc: 'https://s2.coinmarketcap.com/static/img/coins/64x64/12147.png',
    // We can't specify the input chain for Synapse, as it will use whatever the user is connected to.
    // We make sure to prompt a network switch to Arbitrum prior to showing this.
    href: 'https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=1'
  }
] as const

const SECONDS_IN_DAY = 86400
const SECONDS_IN_HOUR = 3600

const FastBridgeNames = FastBridges.map(bridge => bridge.name)
export type FastBridgeName = typeof FastBridgeNames[number]

function FastBridgesTable() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    'arbitrum:bridge:favorite-fast-bridges',
    []
  )

  function isFavorite(bridgeName: string) {
    return favorites.includes(bridgeName)
  }

  function toggleFavorite(bridgeName: string) {
    if (favorites.includes(bridgeName)) {
      setFavorites(favorites.filter(favorite => favorite !== bridgeName))
    } else {
      setFavorites([...favorites, bridgeName])
    }
  }

  function onClick(bridgeName: FastBridgeName) {
    trackEvent(`Fast Bridge Click: ${bridgeName}`)
  }

  const sortedFastBridges = [...FastBridges].sort((a, b) => {
    const isFavoriteA = isFavorite(a.name)
    const isFavoriteB = isFavorite(b.name)

    if (isFavoriteA && !isFavoriteB) {
      return -1
    } else if (!isFavoriteA && isFavoriteB) {
      return 1
    }

    if (a.name < b.name) {
      return -1
    } else {
      return 1
    }
  })

  return (
    <table className="w-full border border-gray-5">
      <thead className="bg-gray-1 text-left">
        <tr className="text-gray-9">
          <th className="w-1/6 px-6 py-4 font-normal">Favorite</th>
          <th className="w-4/6 px-6 py-4 font-normal">Exchange</th>
          <th className="w-1/6 px-6 py-4 font-normal"></th>
        </tr>
      </thead>
      <tbody className="font-light">
        {sortedFastBridges.map(bridge => (
          <tr
            key={bridge.name}
            className="cursor-pointer border border-gray-5 hover:bg-cyan"
          >
            <td>
              <ExternalLink
                href={bridge.href}
                className="flex h-16 items-center px-6"
                onClick={() => onClick(bridge.name)}
              >
                <button
                  onClick={event => {
                    event.preventDefault()
                    toggleFavorite(bridge.name)
                  }}
                >
                  {isFavorite(bridge.name) ? (
                    <StarIconSolid className="h-6 w-6 text-blue-arbitrum" />
                  ) : (
                    <StarIconOutline className="h-6 w-6 text-blue-arbitrum" />
                  )}
                </button>
              </ExternalLink>
            </td>

            <td>
              <ExternalLink
                href={bridge.href}
                onClick={() => onClick(bridge.name)}
              >
                <div className="flex h-16 items-center space-x-4 px-6">
                  <img
                    src={bridge.imageSrc}
                    alt={bridge.name}
                    className="h-8 w-8 rounded-full object-contain"
                  />
                  <span>{bridge.name}</span>
                </div>
              </ExternalLink>
            </td>

            <td>
              <ExternalLink
                href={bridge.href}
                className="arb-hover flex h-16 w-full items-center justify-center text-gray-6 hover:text-blue-arbitrum"
                onClick={() => onClick(bridge.name)}
              >
                <ExternalLinkIcon className="h-5 w-5" />
              </ExternalLink>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function getCalendarUrl(
  confirmationDays: number,
  amount: string,
  token: string,
  networkName: string
) {
  const title = `${amount} ${token} Withdrawal from ${networkName}`
  const withdrawalDate = dayjs().add(confirmationDays, 'day').format('YYYYMMDD')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${withdrawalDate}%2F${withdrawalDate}`
}

export function WithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const { l1, l2 } = useNetworksAndSigners()
  const networkName = getNetworkName(l1.network)
  const {
    app: { selectedToken }
  } = useAppState()

  const [checkbox1Checked, setCheckbox1Checked] = useState(false)
  const [checkbox2Checked, setCheckbox2Checked] = useState(false)

  const bothCheckboxesChecked = checkbox1Checked && checkbox2Checked
  const confirmationSeconds =
    l1.network.blockTime * l2.network.confirmPeriodBlocks
  const confirmationDays = Math.ceil(confirmationSeconds / SECONDS_IN_DAY)
  let confirmationPeriod = ''

  if (confirmationDays >= 2) {
    confirmationPeriod = `${confirmationDays} day${
      confirmationDays > 1 ? 's' : ''
    }`
  } else {
    const confirmationHours = Math.round(confirmationSeconds / SECONDS_IN_HOUR)
    confirmationPeriod = `${confirmationHours} hour${
      confirmationHours > 1 ? 's' : ''
    }`
  }

  const { isArbitrumOne } = isNetwork(l2.network)

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setCheckbox1Checked(false)
    setCheckbox2Checked(false)
  }

  return (
    <Dialog {...props} onClose={closeWithReset} isCustom>
      <div className="flex flex-col md:min-w-[725px] md:max-w-[725px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-blue-arbitrum px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {networkName}
            </HeadlessUIDialog.Title>
            <button className="arb-hover" onClick={() => closeWithReset(false)}>
              <XIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="bg-blue-arbitrum">
            {isArbitrumOne && (
              <Tab as={Fragment}>
                {({ selected }) => (
                  <TabButton selected={selected}>
                    Use a third-party bridge
                  </TabButton>
                )}
              </Tab>
            )}
            <Tab as={Fragment}>
              {({ selected }) => (
                <TabButton selected={selected}>Use Arbitrum’s bridge</TabButton>
              )}
            </Tab>
          </Tab.List>

          {isArbitrumOne && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  Get your funds in under 30 min with a fast exit bridge.
                </p>

                <div className="flex flex-row items-center space-x-1">
                  <ExclamationCircleIcon className="h-6 w-6 text-orange-dark" />
                  <span className="font-medium text-orange-dark">
                    Security not guaranteed by Arbitrum
                  </span>
                </div>
              </div>

              <FastBridgesTable />
            </Tab.Panel>
          )}

          <Tab.Panel className="flex flex-col justify-between px-8 py-4 md:min-h-[430px]">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  Get your funds in ~{confirmationPeriod} and pay a small fee
                  twice.{' '}
                  <ExternalLink
                    href="https://consensys.zendesk.com/hc/en-us/articles/7311862385947"
                    className="underline"
                  >
                    Learn more.
                  </ExternalLink>
                </p>

                <div className="flex flex-row items-center space-x-1">
                  <CheckIcon className="h-6 w-6 text-lime-dark" />
                  <span className="font-medium text-lime-dark">
                    Security guaranteed by Ethereum
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-6">
                <Checkbox
                  label={
                    <span className="font-light">
                      I understand that it will take ~{confirmationPeriod}{' '}
                      before I can claim my funds on Ethereum {networkName}
                    </span>
                  }
                  checked={checkbox1Checked}
                  onChange={setCheckbox1Checked}
                />

                <Checkbox
                  label={
                    <span className="font-light">
                      I understand that after claiming my funds, I’ll have to
                      send{' '}
                      <span className="font-medium">
                        another transaction on L1
                      </span>{' '}
                      and pay another L1 fee
                    </span>
                  }
                  checked={checkbox2Checked}
                  onChange={setCheckbox2Checked}
                />

                <div className="flex flex-col justify-center space-y-2.5 rounded bg-cyan py-4 align-middle ">
                  <p className="text-center text-sm font-light">
                    Set calendar reminder for {confirmationPeriod} from now
                  </p>
                  <div className="flex justify-center">
                    <ExternalLink
                      href={getCalendarUrl(
                        confirmationDays,
                        props.amount,
                        selectedToken?.symbol || 'ETH',
                        getNetworkName(l2.network)
                      )}
                      onClick={() => trackEvent('Add to Google Calendar Click')}
                      className="arb-hover flex space-x-2 rounded border border-blue-arbitrum py-2 px-4 text-blue-arbitrum"
                    >
                      <img
                        src={GoogleCalendarIcon}
                        alt="Google Calendar Icon"
                      />
                      <span>Add to Google Calendar</span>
                    </ExternalLink>
                  </div>
                  <p className="text-center text-sm font-light">
                    We don’t store any email data
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!bothCheckboxesChecked}
                onClick={() => {
                  props.onClose(true)
                  trackEvent('Slow Bridge Click')
                }}
              >
                Continue
              </Button>
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
