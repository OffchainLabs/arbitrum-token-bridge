export function assertNever(x, message = 'Unexpected object') {
    console.error(message, x);
    throw new Error('see console ' + message);
}
