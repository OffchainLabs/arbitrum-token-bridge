import React, { useState, FunctionComponent, useMemo } from 'react'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Button from 'react-bootstrap/Button'
import Popover from 'react-bootstrap/Popover'

import { useIsDepositMode } from 'components/App/ModeContext'

interface props {
  isDepositPanel: boolean
}
const {
    REACT_APP_ETH_NETWORK_ID: ethNetworkId,
    REACT_APP_ARB_NETWORK_ID: arbNetworkId
  } = process.env

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
          trigger={["hover", "focus"]}
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
        ? `To enable these actions, connect to L1 (chain ID ${ethNetworkId})`
        : `To enable these actions, connect to L2 (chain ID ${arbNetworkId})`}
    </Popover.Content>
  </Popover>
)

export default PanelWrapper
