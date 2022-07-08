import { Fragment, useMemo, useState } from 'react'
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

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { TabButton } from '../common/Tab'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const FastBridges = [
  {
    name: 'Hop',
    imageSrc:
      'https://s3.us-west-1.amazonaws.com/assets.hop.exchange/images/hop_logo.png',
    href: 'https://hop.exchange'
  },
  {
    name: 'Celer',
    imageSrc:
      'https://www.celer.network/static/Black-4d795924d523c9d8d45540e67370465a.png',
    href: 'https://cbridge.celer.network'
  },
  {
    name: 'Connext',
    imageSrc: 'https://bridge.connext.network/logos/logo_white.png',
    href: 'https://bridge.connext.network'
  },
  {
    name: 'Across',
    imageSrc:
      'https://2085701667-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fo33kX1T6RRp4inOcEH1d%2Fuploads%2FVqg353nqWxKYvWS16Amd%2FAcross-logo-greenbg.png?alt=media&token=23d5a067-d417-4b1c-930e-d40ad1d8d89a',
    href: 'https://across.to'
  }
]

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

  const sortedFastBridges = FastBridges.sort((a, b) => {
    const isFavoriteA = isFavorite(a.name)
    const isFavoriteB = isFavorite(b.name)

    if (isFavoriteA && !isFavoriteB) {
      return -1
    } else if (!isFavoriteA && isFavoriteB) {
      return 1
    } else {
      return 0
    }
  })

  return (
    <table className="w-full border border-gray-5">
      <thead className="bg-gray-1 text-left">
        <tr className="text-gray-9">
          <th className="w-1/5 px-6 py-4 font-normal">Favorite</th>
          <th className="w-1/5 px-6 py-4 font-normal">Exchange</th>
          <th className="w-2/5 px-6 py-4 font-normal">
            Amount you’ll see on L1
          </th>
          <th className="w-1/5 px-6 py-4 font-normal"></th>
        </tr>
      </thead>
      <tbody className="font-light">
        {sortedFastBridges.map(bridge => (
          <tr key={bridge.name} className="border border-gray-5 hover:bg-cyan">
            <td className="flex items-center px-6 py-5">
              <button onClick={() => toggleFavorite(bridge.name)}>
                {isFavorite(bridge.name) ? (
                  <StarIconSolid className="h-6 w-6 text-blue-arbitrum" />
                ) : (
                  <StarIconOutline className="h-6 w-6 text-blue-arbitrum" />
                )}
              </button>
            </td>
            <td className="px-6 py-4">
              <div className="flex flex-row items-center space-x-4">
                <img
                  src={bridge.imageSrc}
                  alt={bridge.name}
                  className="h-8 w-8 rounded-full object-contain"
                />
                <span>{bridge.name}</span>
              </div>
            </td>
            <td className="px-6 py-4">0.012 ETH</td>
            <td className="px-6 py-4">
              <ExternalLink
                href={bridge.href}
                className="arb-hover text-gray-6 hover:text-blue-arbitrum"
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

export function WithdrawalConfirmationDialog(props: UseDialogProps) {
  const { l1 } = useNetworksAndSigners()

  const [checkbox1Checked, setCheckbox1Checked] = useState(false)
  const [checkbox2Checked, setCheckbox2Checked] = useState(false)

  const bothCheckboxesChecked = checkbox1Checked && checkbox2Checked

  const isTestnet = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return true
    }

    return l1.network.chainID !== 1
  }, [l1.network])

  const confirmationPeriod = useMemo(
    () => (isTestnet ? '~1 day' : '~8 days'),
    [isTestnet]
  )

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
              Move funds to {l1.network?.name}
            </HeadlessUIDialog.Title>
            <button className="arb-hover" onClick={() => closeWithReset(false)}>
              <XIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="bg-blue-arbitrum">
            <Tab as={Fragment}>
              {({ selected }) => (
                <TabButton selected={selected}>
                  Use a third-party bridge
                </TabButton>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <TabButton selected={selected}>Use Arbitrum’s bridge</TabButton>
              )}
            </Tab>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-4 px-8 py-4">
            <div className="flex flex-col space-y-2">
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
          <Tab.Panel className="flex flex-col justify-between px-8 py-4 md:min-h-[422px]">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  Get your funds in {confirmationPeriod} and pay a small fee
                  twice.{' '}
                  <ExternalLink href="#" className="underline">
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
                <div className="flex flex-row items-center space-x-3">
                  <Checkbox
                    checked={checkbox1Checked}
                    onChange={setCheckbox1Checked}
                  />
                  <span className="font-light">
                    I understand that it will take {confirmationPeriod} before I
                    can claim my funds on Ethereum {l1.network?.name}
                  </span>
                </div>

                <div className="flex flex-row items-center space-x-3">
                  <Checkbox
                    checked={checkbox2Checked}
                    onChange={setCheckbox2Checked}
                  />
                  <span className="font-light">
                    I understand that after claiming my funds, I’ll have to send{' '}
                    <span className="font-medium">
                      another transaction on L1
                    </span>{' '}
                    and pay another L1 fee
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!bothCheckboxesChecked}
                onClick={() => props.onClose(true)}
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
