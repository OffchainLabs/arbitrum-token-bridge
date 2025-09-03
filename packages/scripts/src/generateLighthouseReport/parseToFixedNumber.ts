export function parseToFixedNumber(num: number, fractionDigits: number) {
  return Number(num.toFixed(fractionDigits));
}
