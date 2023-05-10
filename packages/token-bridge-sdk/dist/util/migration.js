export function getUniqueIdOrHashFromEvent(event) {
    const anyEvent = event;
    // Nitro
    if (anyEvent.hash) {
        return anyEvent.hash;
    }
    // Classic
    return anyEvent.uniqueId;
}
