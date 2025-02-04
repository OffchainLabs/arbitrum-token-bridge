import { ChainId } from '../types/ChainId'

const boldUpgrades: {
  [chainId: number]: {
    dateStart: Date
    dateEnd: Date
  }
} = {
  [ChainId.ArbitrumOne]: {
    dateStart: new Date('2025-02-05T15:00:00'),
    dateEnd: new Date('2025-02-12T15:00:00')
  },
  [ChainId.ArbitrumNova]: {
    dateStart: new Date('2025-02-05T15:00:00'),
    dateEnd: new Date('2025-02-12T15:00:00')
  }
}

type BoldUpgradeStatus =
  | {
      status: '1_not_scheduled'
    }
  | {
      status: '2_scheduled'
      dateStart: Date
      dateEnd: Date
    }
  | {
      status: '3_in_progress'
      dateStart: Date
      dateEnd: Date
      secondsRemaining: number
    }
  | {
      status: '4_done'
    }

export function getBoldUpgradeStatus(chainId: number): BoldUpgradeStatus {
  const upgrade = boldUpgrades[chainId]

  if (typeof upgrade === 'undefined') {
    return {
      status: '1_not_scheduled'
    }
  }

  const now = new Date()
  const { dateStart, dateEnd } = upgrade

  if (now < dateStart) {
    return {
      status: '2_scheduled',
      dateStart,
      dateEnd
    }
  }

  if (now <= dateEnd) {
    return {
      status: '3_in_progress',
      dateStart,
      dateEnd,
      secondsRemaining: getDifferenceInSeconds(now, dateEnd)
    }
  }

  return {
    status: '4_done'
  }
}

function getDifferenceInSeconds(date1: Date, date2: Date): number {
  return Math.abs((date1.getTime() - date2.getTime()) / 1000)
}
