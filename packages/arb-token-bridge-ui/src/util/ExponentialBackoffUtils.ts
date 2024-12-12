import { backOff as _backOff, BackoffOptions } from 'exponential-backoff'

const backoffOptions: BackoffOptions = {
  startingDelay: 1_000,
  timeMultiple: 1.5
}

export function backOff<T>(request: () => Promise<T>): Promise<T> {
  return _backOff(request, backoffOptions)
}

export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
