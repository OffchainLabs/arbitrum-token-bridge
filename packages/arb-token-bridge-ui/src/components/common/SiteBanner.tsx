import arbitrumStatusJson from '../../../public/__auto-generated-status.json'

type ArbitrumStatusResponse = {
  meta: {
    timestamp: string
  }
  content: {
    page?: {
      name: string
      url: string
      status: string
    }
    activeIncidents?: {
      name: string
      started: string
      status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED'
      impact: string
      url: string
    }[]
    activeMaintenances?: {
      name: string
      start: string
      status: string
      duration: string
      url: string
    }[]
  }
}

const arbitrumStatus = (arbitrumStatusJson as ArbitrumStatusResponse).content

export const SiteBanner = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const activeIncidentMessage = arbitrumStatus.activeIncidents?.[0]?.name

  return (
    <div
      className="bg-atmosphere-blue px-4 py-[8px] text-center text-sm font-normal text-white"
      {...props}
    >
      {activeIncidentMessage ?? children}
    </div>
  )
}
