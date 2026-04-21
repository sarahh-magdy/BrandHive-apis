/**
 * Shipping Fee Calculator
 *
 * Strategy:
 *  - Base fee per governorate zone
 *  - Extra fee per kg above threshold
 *  - Free shipping above a total threshold
 */

export interface ShippingCalculationInput {
  governorate: string;
  totalWeight?: number; // in kg, optional
  subtotal: number;
}

export interface ShippingResult {
  fee: number;
  isFreeShipping: boolean;
  zone: string;
}

/** Free shipping threshold in EGP */
const FREE_SHIPPING_THRESHOLD = 500;

/** Zone definitions */
const ZONE_MAP: Record<string, { zone: string; baseFee: number }> = {
  Cairo: { zone: 'zone-1', baseFee: 25 },
  Giza: { zone: 'zone-1', baseFee: 25 },
  Alexandria: { zone: 'zone-2', baseFee: 35 },
  Dakahlia: { zone: 'zone-2', baseFee: 35 },
  Sharqia: { zone: 'zone-2', baseFee: 35 },
  Qalyubia: { zone: 'zone-2', baseFee: 35 },
  Monufia: { zone: 'zone-2', baseFee: 35 },
  Gharbia: { zone: 'zone-2', baseFee: 35 },
  Beheira: { zone: 'zone-2', baseFee: 35 },
  Kafr_El_Sheikh: { zone: 'zone-2', baseFee: 35 },
  Ismailia: { zone: 'zone-3', baseFee: 45 },
  Suez: { zone: 'zone-3', baseFee: 45 },
  Port_Said: { zone: 'zone-3', baseFee: 45 },
  Fayoum: { zone: 'zone-3', baseFee: 45 },
  Beni_Suef: { zone: 'zone-3', baseFee: 45 },
  Minya: { zone: 'zone-4', baseFee: 55 },
  Assiut: { zone: 'zone-4', baseFee: 55 },
  Sohag: { zone: 'zone-4', baseFee: 55 },
  Qena: { zone: 'zone-4', baseFee: 55 },
  Luxor: { zone: 'zone-4', baseFee: 55 },
  Aswan: { zone: 'zone-5', baseFee: 65 },
  'Red Sea': { zone: 'zone-5', baseFee: 65 },
  'South Sinai': { zone: 'zone-5', baseFee: 65 },
  'North Sinai': { zone: 'zone-5', baseFee: 65 },
  Matrouh: { zone: 'zone-5', baseFee: 65 },
  'New Valley': { zone: 'zone-5', baseFee: 65 },
};

const DEFAULT_ZONE = { zone: 'zone-5', baseFee: 65 };
const WEIGHT_EXTRA_FEE_PER_KG = 5; // EGP per kg above 5kg
const WEIGHT_THRESHOLD_KG = 5;

export function calculateShippingFee(input: ShippingCalculationInput): ShippingResult {
  // Free shipping check
  if (input.subtotal >= FREE_SHIPPING_THRESHOLD) {
    return { fee: 0, isFreeShipping: true, zone: 'free' };
  }

  const zoneInfo = ZONE_MAP[input.governorate] ?? DEFAULT_ZONE;
  let fee = zoneInfo.baseFee;

  // Weight surcharge
  if (input.totalWeight && input.totalWeight > WEIGHT_THRESHOLD_KG) {
    const extraKg = input.totalWeight - WEIGHT_THRESHOLD_KG;
    fee += Math.ceil(extraKg) * WEIGHT_EXTRA_FEE_PER_KG;
  }

  return {
    fee: parseFloat(fee.toFixed(2)),
    isFreeShipping: false,
    zone: zoneInfo.zone,
  };
}

/** Preview shipping fees for all zones (used in checkout UI) */
export function getShippingZonePreviews(): { zone: string; fee: number }[] {
  const seen = new Set<string>();
  const result: { zone: string; fee: number }[] = [];

  for (const info of Object.values(ZONE_MAP)) {
    if (!seen.has(info.zone)) {
      seen.add(info.zone);
      result.push({ zone: info.zone, fee: info.baseFee });
    }
  }

  return result.sort((a, b) => a.fee - b.fee);
}