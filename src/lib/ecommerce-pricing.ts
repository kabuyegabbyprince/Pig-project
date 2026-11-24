export type DiscountableProduct = {
  price: number | string | { toString(): string };
  discountPercent?: number | string | { toString(): string } | null;
  discountPrice?: number | string | { toString(): string } | null;
  discountLabel?: string | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
};

export type EffectivePriceResult = {
  originalPrice: number;
  effectivePrice: number;
  discountAmountPerUnit: number;
  discountPercentApplied: number;
  hasActiveDiscount: boolean;
  discountLabel: string | null;
  discountEndsAt: string | null;
};

function toNum(value: number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(typeof value === "object" ? value.toString() : value);
  return Number.isFinite(n) ? n : 0;
}

export function getEffectiveProductPrice(
  product: DiscountableProduct,
  now: Date = new Date()
): EffectivePriceResult {
  const originalPrice = Math.max(0, toNum(product.price));
  const startsAt = product.discountStartsAt ? new Date(product.discountStartsAt) : null;
  const endsAt = product.discountEndsAt ? new Date(product.discountEndsAt) : null;

  const isStarted = !startsAt || Number.isNaN(startsAt.getTime()) || now >= startsAt;
  const isNotEnded = !endsAt || Number.isNaN(endsAt.getTime()) || now <= endsAt;
  const windowActive = isStarted && isNotEnded;

  const rawDiscountPrice = toNum(product.discountPrice);
  const rawDiscountPercent = toNum(product.discountPercent);

  let effectivePrice = originalPrice;
  let discountPercentApplied = 0;
  let hasActiveDiscount = false;

  if (windowActive && originalPrice > 0) {
    if (rawDiscountPrice > 0 && rawDiscountPrice < originalPrice) {
      effectivePrice = Math.round(rawDiscountPrice * 100) / 100;
      discountPercentApplied = Math.round(((originalPrice - effectivePrice) / originalPrice) * 100);
      hasActiveDiscount = true;
    } else if (rawDiscountPercent > 0 && rawDiscountPercent <= 90) {
      effectivePrice = Math.round(originalPrice * (1 - rawDiscountPercent / 100));
      discountPercentApplied = Math.round(rawDiscountPercent);
      hasActiveDiscount = effectivePrice < originalPrice;
    }
  }

  return {
    originalPrice,
    effectivePrice,
    discountAmountPerUnit: Math.max(0, Math.round((originalPrice - effectivePrice) * 100) / 100),
    discountPercentApplied,
    hasActiveDiscount,
    discountLabel: hasActiveDiscount ? product.discountLabel || null : null,
    discountEndsAt:
      hasActiveDiscount && endsAt && !Number.isNaN(endsAt.getTime())
        ? endsAt.toISOString()
        : null,
  };
}
