import React from 'react'
import { useL1Network, useL2Network } from 'components/App/NetworkContext'

export default () => {
  const { name: l1NetworkName } = useL1Network()
  const { confirmPeriodBlocks } = useL2Network()
  return (
    <div
      style={{
        fontStyle: 'italic',
        fontFamily: 'Montserrat Light',
        fontSize: 12,
        marginTop: 10,
        marginBottom: 10
      }}
    >
      {' '}
      Note: for standard, bridge withdrawals, the withdrawal will be in a
      "pending" state during a "challenge period" roughly (~
      {confirmPeriodBlocks} blocks on {l1NetworkName}). After that, the funds
      will be available on layer 1 in your lockbox.{' '}
      <a
        href="https://medium.com/offchainlabs/optimizing-challenge-periods-in-rollup-b61378c87277"
        target="_blank"
        id="challenge-blog-link"
      >
        Learn more
      </a>
      .
    </div>
  )
}
