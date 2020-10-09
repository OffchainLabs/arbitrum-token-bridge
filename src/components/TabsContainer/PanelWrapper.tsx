import React, { useState, FunctionComponent, useMemo } from 'react'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Popover from 'react-bootstrap/Popover'

import { useIsDepositMode } from 'components/App/ModeContext'
import networks  from 'components/App/networks'

interface props {
  isDepositPanel: boolean
}

const ethNetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string
const arbNetworkUrl = process.env.REACT_APP_ARB_VALIDATOR_URL as string


const PanelWrapper: FunctionComponent<props> = ({
  isDepositPanel,
  children
}) => {
  const isDepositMode = useIsDepositMode()
  const isActive = isDepositMode === isDepositPanel
  if (isActive) {
    return <div> {children}</div>
  }

  const prevent = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  return (
    <div>
      {
        <OverlayTrigger
          placement="bottom"
          delay={{ show: 100, hide: 50 }}
          overlay={renderPopover(isDepositPanel)}
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

const renderPopover = (isDepositPanel: boolean) => (
  <Popover id="popover-basic">
    <Popover.Title as="h3">Actions disabled</Popover.Title>
    <Popover.Content>
      {isDepositPanel
        ? `To enable these actions, connect to L1 (${networks[+ethNetworkId].name})`
        : `To enable these actions, connect to Arbitrum: ${arbNetworkUrl} `}
    </Popover.Content>
  </Popover>
)

export default PanelWrapper
