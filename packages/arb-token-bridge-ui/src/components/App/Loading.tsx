import Loader from 'react-loader-spinner'

import { ExternalLink } from '../common/ExternalLink'
import { HeaderContent } from '../common/Header'
import { HeaderNetworkLoadingIndicator } from '../common/HeaderNetworkLoadingIndicator'

function ConnectionFallbackContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-8">
      {children}
      <ExternalLink href="https://metamask.io/download">
        <img
          className="sm:w-[420px]"
          src="/images/arbinaut-playing-cards.png"
          alt="Illustration of an Alien and an Arbinaut playing cards"
        />
      </ExternalLink>
    </div>
  )
}

export function Loading() {
  return (
    <>
      <HeaderContent>
        <HeaderNetworkLoadingIndicator />
      </HeaderContent>

      <ConnectionFallbackContainer>
        <Loader type="TailSpin" color="white" height={44} width={44} />
      </ConnectionFallbackContainer>
    </>
  )
}
