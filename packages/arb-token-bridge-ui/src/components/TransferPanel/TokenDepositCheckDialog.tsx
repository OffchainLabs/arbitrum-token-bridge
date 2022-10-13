import { useMemo } from 'react'

import { UnreachableCaseError } from '../../util'
import { Dialog, UseDialogProps } from '../common/Dialog'

export type TokenDepositCheckDialogType = 'user-added-token' | 'new-token'

export type TokenDepositCheckDialogProps = UseDialogProps & {
  type: TokenDepositCheckDialogType
  symbol: string
}

export function TokenDepositCheckDialog(props: TokenDepositCheckDialogProps) {
  const { type, symbol } = props

  const textContent = useMemo(() => {
    switch (type) {
      case 'user-added-token':
        return (
          <>
            You are about to deposit {symbol} to Arbitrum 🎉 <br />
            <br />
            <span className="text-red-600">Do not bridge</span> if your token
            does something non-standard like generates passive interest or is a
            rebasing stablecoin. <br />
            <br />
            Not sure if your token is compatible?
            <ul>
              <li>
                •{' '}
                <a
                  href="https://developer.offchainlabs.com/docs/bridging_assets#the-arbitrum-generic-custom-gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Check the docs</u>
                </a>
              </li>
              <li>
                {' '}
                •{' '}
                <a
                  href="https://discord.gg/ZpZuw7p"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Join Discord and ask</u>
                </a>
              </li>
            </ul>
            <br />
          </>
        )

      case 'new-token':
        return (
          <>
            You are the first to bridge {symbol} to Arbitrum 🎉 <br />
            <br />
            <b>Important facts</b>
            <ol>
              <li>1. Some tokens are not compatible with the bridge</li>
              <li>
                2. The initial bridge is more expensive than following ones
              </li>
            </ol>
            <br />
            <span className="text-red-600">Do not bridge</span> if your token
            does something non-standard like generates passive interest or is a
            rebasing stablecoin. <br />
            <br />
            Not sure if your token is compatible?
            <ul>
              <li>
                •{' '}
                <a
                  href="https://developer.offchainlabs.com/docs/bridging_assets#the-arbitrum-generic-custom-gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Check the docs</u>
                </a>
              </li>
              <li>
                {' '}
                •{' '}
                <a
                  href="https://discord.gg/ZpZuw7p"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <u>Join Discord and ask</u>
                </a>
              </li>
            </ul>
            <br />
          </>
        )
      default:
        throw new UnreachableCaseError(type)
    }
  }, [type, symbol])

  const title = useMemo(() => {
    switch (type) {
      case 'user-added-token':
        return `Depositing ${symbol} to Arbitrum`

      case 'new-token':
        return 'New Token Detected'

      default:
        throw new UnreachableCaseError(type)
    }
  }, [type, symbol])

  return (
    <Dialog {...props} title={title}>
      <p>{textContent}</p>
    </Dialog>
  )
}
