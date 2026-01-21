/**
 * Delays execution for the specified number of milliseconds.
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
