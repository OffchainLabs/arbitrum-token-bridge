
export function assertNever(x: never, message = 'Unexpected object'): never {
  console.error(message, x)
  throw new Error('see console ' + message)
}
