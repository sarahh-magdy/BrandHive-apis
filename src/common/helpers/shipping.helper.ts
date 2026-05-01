const SHIPPING_RATES: Record<string, number> = {
  cairo: 30,
  giza: 30,
  alexandria: 40,
  default: 60,
};

const FREE_SHIPPING_THRESHOLD = 500;

export function calculateShippingFee(subtotal: number, governorate: string): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const key = governorate.toLowerCase().trim();
  return SHIPPING_RATES[key] ?? SHIPPING_RATES.default;
}

export function calculateTax(_subtotal: number): number {
  return 0; // 0% — عدّل لو محتاج
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BH-${y}${m}${day}-${rand}`;
}