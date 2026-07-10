export function generateReference(): string {
    return `ref_${crypto.randomUUID()}`;
}
