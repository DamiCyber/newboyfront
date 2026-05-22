/** Parse naira amounts from listing price strings (e.g. "₦320 / night", "₦875,000"). */
export function parseListingPrice(property) {
  if (!property) return { amount: 0, unit: 'sale', label: '' }

  if (property.priceNumeric != null && Number.isFinite(Number(property.priceNumeric))) {
    return {
      amount: Number(property.priceNumeric),
      unit: property.priceUnit || (property.type === 'Rent' ? 'night' : 'sale'),
      label: property.price ?? '',
    }
  }

  const priceStr = String(property.price ?? '')
  const lower = priceStr.toLowerCase()
  const match = priceStr.match(/[€₦]?\s*([\d.,]+)/)
  if (!match) {
    return {
      amount: 0,
      unit: property.type === 'Rent' ? 'night' : 'sale',
      label: priceStr,
    }
  }

  let numStr = match[1]
  if (numStr.includes(',') && numStr.includes('.')) {
    numStr = numStr.replace(/\./g, '').replace(',', '.')
  } else if (numStr.includes(',')) {
    const [, frac] = numStr.split(',')
    numStr = frac?.length === 3 ? numStr.replace(/,/g, '') : numStr.replace(',', '.')
  } else if (/^\d{1,3}\.\d{3}$/.test(numStr)) {
    numStr = numStr.replace('.', '')
  }

  const amount = parseFloat(numStr) || 0
  let unit = 'sale'
  if (lower.includes('night')) unit = 'night'
  else if (lower.includes('month')) unit = 'month'
  else if (property.type === 'Rent') unit = 'night'

  return { amount, unit, label: priceStr }
}

/** Format amounts as Nigerian Naira (NGN). */
export function formatNaira(amount, { decimals = 0 } = {}) {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return '₦0'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Build line items and total for checkout.
 * @param {{ intent: 'rent'|'buy', nights?: number, months?: number }} opts
 */
export function computeCheckoutQuote(property, opts = {}) {
  const intent = opts.intent ?? (property?.type === 'Rent' ? 'rent' : 'buy')
  const isRent = intent === 'rent'
  const { amount, unit, label } = parseListingPrice(property)
  const nights = Math.max(1, Number(opts.nights) || 3)
  const months = Math.max(1, Number(opts.months) || 1)

  if (isRent) {
    let subtotal
    let rateDetail
    if (unit === 'month') {
      subtotal = amount * months
      rateDetail = `${formatNaira(amount)} × ${months} month${months > 1 ? 's' : ''}`
    } else {
      subtotal = amount * nights
      rateDetail = `${formatNaira(amount)} × ${nights} night${nights > 1 ? 's' : ''}`
    }

    return {
      intent: 'rent',
      unit,
      rateLabel: label || formatNaira(amount),
      lines: [
        {
          key: 'stay',
          label: unit === 'month' ? 'Monthly rent' : 'Accommodation',
          detail: rateDetail,
          value: subtotal,
        },
      ],
      subtotal,
      total: subtotal,
      nights: unit === 'night' ? nights : undefined,
      months: unit === 'month' ? months : undefined,
    }
  }

  return {
    intent: 'buy',
    unit: 'sale',
    rateLabel: label || formatNaira(amount),
    lines: [
      { key: 'list', label: 'List price', detail: label, value: amount },
    ],
    subtotal: amount,
    total: amount,
  }
}