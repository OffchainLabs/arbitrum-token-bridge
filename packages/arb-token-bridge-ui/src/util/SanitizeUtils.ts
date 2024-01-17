export enum AmountQueryParamEnum {
  MAX = 'max'
}

export const isMaxAmount = (amount: string | undefined) =>
  amount?.toLowerCase() === AmountQueryParamEnum.MAX

/**
 * Sanitise amount value
 * @param amount - transfer amount value from the input field or from the URL
 * @returns sanitised value
 */
export const sanitizeAmount = (amount: string) => {
  // no need to process empty string
  if (amount.length === 0) {
    return amount
  }

  const parsedAmount = amount.replace(/[,]/g, '.').toLowerCase()

  // console.log('parsedAmount?', parsedAmount)
  // add 0 to values starting with .
  if (parsedAmount.startsWith('.')) {
    return `0${parsedAmount}`
  }

  // to catch strings like `amount=asdf` from the URL
  if (isNaN(Number(parsedAmount))) {
    // return original string if the string is `max` (case-insensitive)
    // it doesn't show on the input[type=number] field because it isn't in the allowed chars
    return isMaxAmount(parsedAmount) ? parsedAmount : ''
  }

  // to reach here they must be a number
  // check for negative sign at first char
  if (parsedAmount.startsWith('-')) {
    return String(Math.abs(Number(parsedAmount)))
  }

  // replace leading zeros
  // this regex finds 1 or more 0s before any digits including 0
  // but the digits are not captured into the result string
  return parsedAmount.replace(/^0+(?=\d)/, '')
}
