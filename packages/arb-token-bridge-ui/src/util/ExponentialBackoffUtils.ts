import { backOff as _backOff, BackoffOptions } from 'exponential-backoff'

const backoffOptions: BackoffOptions = {
  startingDelay: 1_000
}

export function backOff<T>(request: () => Promise<T>): Promise<T> {
  return _backOff(request, backoffOptions)
}
