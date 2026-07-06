/** Opening amortized cost at origination — equals net disbursement (principal minus withheld fee). */
export function computeOpeningCarryingAmount(input: { net_disbursement: number }): number {
  return input.net_disbursement;
}
