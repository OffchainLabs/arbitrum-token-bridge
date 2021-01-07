import React, { useState, FunctionComponent, useMemo } from 'react'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Popover from 'react-bootstrap/Popover'

import { useIsDepositMode } from 'components/App/ModeContext'
import networks from 'components/App/networks'
import copy from 'media/images/copy.jpg'
import arb from 'media/gifs/l2.gif'

interface props {
  isDepositPanel: boolean
  disabledWithdrawals?: boolean
}

const ethNetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string

const PanelWrapper: FunctionComponent<props> = ({
  isDepositPanel,
  disabledWithdrawals=false,
  children
}) => {
  const isDepositMode = useIsDepositMode()
  const isActive = !disabledWithdrawals && (isDepositMode === isDepositPanel)
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
          delay={{ show: 100, hide: 2000 }}
          overlay={renderPopover(isDepositPanel,disabledWithdrawals)}
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

const renderPopover = (isDepositPanel: boolean, disabledWithdrawals: boolean) => {
  const onClick = (e: any) => {
    e.preventDefault()
    window.open(window.location.origin + '#info')
  }
  return (
    <Popover id="popover-basic">
      <Popover.Title as="h3">Actions disabled</Popover.Title>
      <Popover.Content>
        {
        disabledWithdrawals ? "Withdrawals not supported on old testnet; connect to new Arbitrum testnet." : 
        isDepositPanel ? (
          <div>
            To enable these actions, connect to L1 (
            {networks[+ethNetworkId].name})
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
