import { useState } from 'react'
import {
  CheckIcon,
  XIcon,
  ExclamationCircleIcon
} from '@heroicons/react/outline'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import dayjs from 'dayjs'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { trackEvent } from '../../util/AnalyticsUtils'
import {
  getBlockTime,
  getConfirmPeriodBlocks,
  getNetworkName,
  isNetwork
} from '../../util/networks'
import { getFastBridges } from '../../util/fastBridges'
import Image from 'next/image'
import GoogleCalendarSVG from '@/images/GoogleCalendar.svg'

const SECONDS_IN_DAY = 86400
const SECONDS_IN_HOUR = 3600

function getCalendarUrl(
  confirmationHours: number,
  amount: string,
  token: string,
  networkName: string
) {
  const title = `${amount} ${token} Withdrawal from ${networkName}`

  // Add 1 extra hour to account for remaining minutes
  const withdrawalDate = dayjs().add(confirmationHours + 1, 'hour')
  // Google event date format: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
  const parsedWithdrawalDate = withdrawalDate.format(
    'YYYYMMDD[T]HH[0000%2F]YYYYMMDD[T]HH[0000]'
  )

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${parsedWithdrawalDate}&details=Withdrawn+on+%3Ca%20href=%22https://bridge.arbitrum.io%22%3Ehttps://bridge.arbitrum.io%3C/a%3E`
}

export function WithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const networkName = getNetworkName(l1.network.chainID)
  const {
    app: { selectedToken }
  } = useAppState()

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network
  const fastBridges = getFastBridges(
    from.chainID,
    to.chainID,
    selectedToken?.symbol,
    props.amount
  )

  const [checkbox1Checked, setCheckbox1Checked] = useState(false)
  const [checkbox2Checked, setCheckbox2Checked] = useState(false)

  const bothCheckboxesChecked = checkbox1Checked && checkbox2Checked
  const confirmationSeconds =
    getBlockTime(l1.network.chainID) *
    getConfirmPeriodBlocks(l2.network.chainID)
  const confirmationDays = Math.ceil(confirmationSeconds / SECONDS_IN_DAY)
  let confirmationPeriod = ''
  const confirmationHours = Math.ceil(confirmationSeconds / SECONDS_IN_HOUR)

  if (confirmationDays >= 2) {
    confirmationPeriod = `${confirmationDays} day${
      confirmationDays > 1 ? 's' : ''
    }`
  } else {
    confirmationPeriod = `${confirmationHours} hour${
      confirmationHours > 1 ? 's' : ''
    }`
  }

  const { isArbitrumOne } = isNetwork(l2.network.chainID)

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
            {isArbitrumOne && <TabButton>Use a third-party bridge</TabButton>}
            <TabButton>Use Arbitrum’s bridge</TabButton>
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

              <BridgesTable bridgeList={fastBridges} />
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
                        confirmationHours,
                        props.amount,
                        selectedToken?.symbol || 'ETH',
                        getNetworkName(l2.network.chainID)
                      )}
                      onClick={() => trackEvent('Add to Google Calendar Click')}
                      className="arb-hover flex space-x-2 rounded border border-blue-arbitrum py-2 px-4 text-blue-arbitrum"
                    >
                      <Image
                        src={GoogleCalendarSVG}
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
