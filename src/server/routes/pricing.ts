import { ApiError, requireNonNegativeInteger } from "./http.js";

export type PricingInput = {
  marked_price?: number;
  listed_price?: number;
  target_price?: number;
  floor_price?: number;
  max_discount_percent?: number;
};

// Converts API pricing names to schema fields without allowing cost_price to be changed.
export function parsePricing(input: PricingInput) {
  const pricing: {
    markedPrice?: number;
    listedPrice?: number;
    targetPrice?: number;
    floorPrice?: number;
    maxDiscountPercent?: number;
  } = {};

  if (input.marked_price !== undefined) pricing.markedPrice = requireNonNegativeInteger(input.marked_price, "marked_price");
  if (input.listed_price !== undefined) pricing.listedPrice = requireNonNegativeInteger(input.listed_price, "listed_price");
  if (input.target_price !== undefined) pricing.targetPrice = requireNonNegativeInteger(input.target_price, "target_price");
  if (input.floor_price !== undefined) pricing.floorPrice = requireNonNegativeInteger(input.floor_price, "floor_price");
  if (input.max_discount_percent !== undefined) {
    pricing.maxDiscountPercent = requireNonNegativeInteger(input.max_discount_percent, "max_discount_percent");
    if (pricing.maxDiscountPercent > 100) {
      throw new ApiError(400, "Invalid pricing", "max_discount_percent cannot exceed 100.");
    }
  }

  if (Object.keys(pricing).length === 0) {
    throw new ApiError(400, "Invalid pricing", "At least one pricing field is required.");
  }
  return pricing;
}
