import { useAccount, useDisconnect, useEnsAvatar } from 'wagmi'
import { Dialog, UseDialogProps } from '../../components/common/Dialog'
import { GET_HELP_LINK } from '../../constants'
import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'

import { shortenAddress } from '../../util/CommonUtils'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'
import { SafeImage } from '../common/SafeImage'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export const WidgetSettingsDialog = (props: UseDialogProps) => {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const { data: ensAvatar } = useEnsAvatar({
    address,
    chainId: 1
  })

  return (
    <>
      <Dialog
        {...props}
        onClose={() => props.onClose(false)}
        title="Settings"
        actionButtonProps={{ hidden: true }}
        isFooterHidden={true}
        className="h-screen overflow-hidden"
      >
        <div className="my-4 flex h-[calc(100vh-160px)] flex-col gap-4 rounded border border-gray-dark bg-black/30 p-4 text-sm">
          {/* if wallet is connected, show connected wallet and disconnect button */}

          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex w-full justify-between">
              <div className="flex items-center gap-1">
                Connected Address:{' '}
                <div className="flex items-center gap-1">
                  {isConnected && (
                    <>
                      <SafeImage
                        src={ensAvatar || undefined}
                        className="h-6 w-6 rounded-full"
                        fallback={
                          <CustomBoringAvatar size={16} name={address} />
                        }
                      />{' '}
                      {shortenAddress(address ?? '')}
                    </>
                  )}

                  {!isConnected && (
                    <Button
                      variant="primary"
                      className="flex w-full justify-between bg-lime-dark"
                      onClick={openConnectModal}
                    >
                      <div>Connect Wallet</div>
                    </Button>
                  )}
                </div>
              </div>

              {isConnected && (
                <div
                  className="flex cursor-pointer flex-nowrap items-center gap-1 text-red-400"
                  onClick={() => disconnect()}
                >
                  <ArrowLeftOnRectangleIcon className="h-3 w-3 text-red-400" />
                  Disconnect
                </div>
              )}
            </div>
          </div>
        </div>

        {/* get help button */}
        <div className="flex justify-end">
          <ExternalLink href={GET_HELP_LINK}>
            <Button variant="secondary" className="border-white/30 text-sm">
              Get help
            </Button>
          </ExternalLink>
        </div>
      </Dialog>
    </>
  )
}
