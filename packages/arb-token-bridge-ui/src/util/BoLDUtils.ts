import { ChainId } from '../types/ChainId'

const boldUpgrades: {
  [chainId: number]: {
    dateStart: Date
    dateEnd: Date
  }
} = {
  [ChainId.ArbitrumOne]: {
    dateStart: new Date('2025-02-05T14:00:00Z'),
    dateEnd: new Date('2025-02-12T14:00:00Z')
  },
  [ChainId.ArbitrumNova]: {
    dateStart: new Date('2025-02-05T14:00:00Z'),
    dateEnd: new Date('2025-02-12T14:00:00Z')
  }
}

export enum BoldUpgradeStatus {
  NotScheduled = 1,
  Scheduled,
  InProgress,
  Done
}

export type BoldUpgradeInfo =
  | {
      status: BoldUpgradeStatus.NotScheduled
    }
  | {
      status: BoldUpgradeStatus.Scheduled
      dateStart: Date
      dateEnd: Date
    }
  | {
      status: BoldUpgradeStatus.InProgress
      dateStart: Date
      dateEnd: Date
      secondsRemaining: number
    }
  | {
      status: BoldUpgradeStatus.Done
    }

export function getBoldUpgradeInfo(chainId: number): BoldUpgradeInfo {
  const upgrade = boldUpgrades[chainId]

  // Skip this logic entirely in tests
  if (process.env.NODE_ENV === 'test') {
    return {
      status: BoldUpgradeStatus.NotScheduled
    }
  }

  if (typeof upgrade === 'undefined') {
    return {
      status: BoldUpgradeStatus.NotScheduled
    }
  }

  const now = new Date()
  const { dateStart, dateEnd } = upgrade

  if (now < dateStart) {
    return {
      status: BoldUpgradeStatus.Scheduled,
      dateStart,
      dateEnd
    }
  }

  if (now <= dateEnd) {
    return {
      status: BoldUpgradeStatus.InProgress,
      dateStart,
      dateEnd,
      secondsRemaining: getDifferenceInSeconds(now, dateEnd)
    }
  }

  return {
    status: BoldUpgradeStatus.Done
  }
}

function getDifferenceInSeconds(date1: Date, date2: Date): number {
  return Math.abs((date1.getTime() - date2.getTime()) / 1000)
}
