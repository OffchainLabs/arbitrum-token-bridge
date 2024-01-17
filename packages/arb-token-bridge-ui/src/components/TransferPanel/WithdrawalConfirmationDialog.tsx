import { useState } from 'react'
import {
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import dayjs from 'dayjs'
import Image from 'next/image'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useAppState } from '../../state'
import { trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { getFastBridges } from '../../util/fastBridges'
import { CONFIRMATION_PERIOD_ARTICLE_LINK } from '../../constants'
import { useChainLayers } from '../../hooks/useChainLayers'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { getTxConfirmationDate } from '../common/WithdrawalCountdown'

function getCalendarUrl(
  withdrawalDate: dayjs.Dayjs,
  amount: string,
  token: string,
  networkName: string
) {
  const title = `${amount} ${token} Withdrawal from ${networkName}`

  // Google event date format: YYYYMMDDTHHmmss/YYYYMMDDTHHmmss
  const parsedWithdrawalDate = withdrawalDate.format(
    'YYYYMMDD[T]HHmm[00%2F]YYYYMMDD[T]HHmm[00]'
  )

  return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${title}&dates=${parsedWithdrawalDate}&details=Withdrawn+on+%3Ca%20href=%22https://bridge.arbitrum.io%22%3Ehttps://bridge.arbitrum.io%3C/a%3E`
}

export function WithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain } =
    useNetworksRelationship(networks)

  const { parentLayer } = useChainLayers()
  const networkName = getNetworkName(parentChain.id)

  const {
    app: { selectedToken }
  } = useAppState()

  const nativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  const fastBridges = getFastBridges({
    from: childChain.id,
    to: parentChain.id,
    tokenSymbol: selectedToken?.symbol ?? nativeCurrency.symbol,
    amount: props.amount
  })

  const [checkbox1Checked, setCheckbox1Checked] = useState(false)
  const [checkbox2Checked, setCheckbox2Checked] = useState(false)

  const { isArbitrumOne } = isNetwork(childChain.id)
  const bothCheckboxesChecked = checkbox1Checked && checkbox2Checked

  const estimatedConfirmationDate = getTxConfirmationDate({
    createdAt: dayjs(new Date()),
    withdrawalFromChainId: childChain.id
  })

  const confirmationPeriod = estimatedConfirmationDate.fromNow(true)

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setCheckbox1Checked(false)
    setCheckbox2Checked(false)
  }

  return (
    <Dialog {...props} onClose={closeWithReset} isCustom>
      <div className="flex flex-col md:min-w-[725px] md:max-w-[725px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-ocl-blue px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {networkName}
            </HeadlessUIDialog.Title>
            <button className="arb-hover" onClick={() => closeWithReset(false)}>
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="bg-ocl-blue">
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
                    href={CONFIRMATION_PERIOD_ARTICLE_LINK}
                    className="underline"
                  >
                    Learn more.
                  </ExternalLink>
                </p>

                {parentLayer === 'L1' && (
                  <div className="flex flex-row items-center space-x-1">
                    <CheckIcon className="h-6 w-6 text-lime-dark" />
                    <span className="font-medium text-lime-dark">
                      Security guaranteed by Ethereum
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-6">
                <Checkbox
                  label={
                    <span className="font-light">
                      I understand that it will take ~{confirmationPeriod}{' '}
                      before I can claim my funds on{' '}
                      {parentLayer === 'L1' ? 'Ethereum ' : ''}
                      {networkName}
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
                        another transaction on {parentLayer}
                      </span>{' '}
                      and pay another {parentLayer} fee
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
                        estimatedConfirmationDate,
                        props.amount,
                        selectedToken?.symbol || nativeCurrency.symbol,
                        getNetworkName(childChain.id)
                      )}
                      onClick={() => trackEvent('Add to Google Calendar Click')}
                      className="arb-hover flex space-x-2 rounded border border-ocl-blue px-4 py-2 text-ocl-blue"
                    >
                      <Image
                        src="/images/GoogleCalendar.svg"
                        alt="Google Calendar Icon"
                        width={24}
                        height={24}
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
              <Button variant="secondary" onClick={() => closeWithReset(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!bothCheckboxesChecked}
                onClick={() => {
                  closeWithReset(true)
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
