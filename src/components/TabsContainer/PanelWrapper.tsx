import React, { FunctionComponent } from 'react'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Popover from 'react-bootstrap/Popover'

import { useIsDepositMode } from 'components/App/ModeContext'
import { useL1Network } from 'components/App/NetworkContext'

interface props {
  isDepositPanel: boolean
  disabledWithdrawals?: boolean
}

const PanelWrapper: FunctionComponent<props> = ({
  isDepositPanel,
  disabledWithdrawals = false,
  children
}) => {
  const isDepositMode = useIsDepositMode()
  const l1NetworkName = useL1Network().name
  const isActive = !disabledWithdrawals && isDepositMode === isDepositPanel
  if (isActive) {
    return <div> {children}</div>
  }

  const prevent = (e: any) => {
    if (e.target.id === 'challenge-blog-link') {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    return
  }

  return (
    <div>
      {
        <OverlayTrigger
          placement="bottom-start"
          delay={{ show: 100, hide: 1000 }}
          overlay={renderPopover(
            isDepositPanel,
            disabledWithdrawals,
            l1NetworkName
          )}
          trigger={['hover', 'focus']}
        >
          <div
            style={{ opacity: 0.4 }}
            onClick={prevent}
            onMouseEnter={prevent}
          >
            {' '}
            {children}
          </div>
        </OverlayTrigger>
      }
    </div>
  )
}

const renderPopover = (
  isDepositPanel: boolean,
  disabledWithdrawals: boolean,
  l1NetworkName: string
) => {
  const onClick = (e: any) => {
    e.preventDefault()
    window.open(window.location.origin + '#info')
  }
  return (
    <Popover id="popover-basic">
      <Popover.Title as="h3">Actions disabled</Popover.Title>
      <Popover.Content>
        {disabledWithdrawals ? (
          'Withdrawals not supported on old testnet; connect to new Arbitrum testnet.'
        ) : isDepositPanel ? (
          <div>
            To enable these actions, connect to L1 ({l1NetworkName})
            <a onClick={onClick} href="">
              {' '}
              Learn how.
            </a>{' '}
          </div>
        ) : (
          <div style={{ fontSize: 12 }}>
            <div>
              To enable these actions, connect to an Arbitrum node via custom
              RPC.{' '}
              <a onClick={onClick} href="">
                {' '}
                Learn how.
              </a>
            </div>
          </div>
        )}
      </Popover.Content>
    </Popover>
  )
}

export default PanelWrapper
