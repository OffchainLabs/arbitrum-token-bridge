import React from 'react'

export default () => (
  <div
    style={{
      fontStyle: 'italic',
      fontSize: 12,
      marginTop: 10,
      marginBottom: 10
    }}
  >
    {' '}
    Note: when withdrawing, the withdrawal will be in a "pending" state during a
    "challenge period" of 830 blocks (30 - 120 minutes on Kovan). After that, the funds will be
    available on layer 1 in your lockbox.{' '}
    <a
      href="https://medium.com/offchainlabs/optimizing-challenge-periods-in-rollup-b61378c87277"
      target="_blank"
      id='challenge-blog-link'
    >
      Learn more
    </a>
    .
  </div>
)
