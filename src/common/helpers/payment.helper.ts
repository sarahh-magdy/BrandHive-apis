export enum PaymentGateway {
  PAYMOB = 'paymob',
  FAWRY = 'fawry',
}

export interface PaymentInitResult {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  paid: boolean;
  transactionId?: string;
}

// ─── Paymob Placeholder ───────────────────────────────────────────
// TODO: استبدل بـ Paymob SDK لما تجيب الـ credentials
export async function initPaymobPayment(order: any): Promise<PaymentInitResult> {
  console.log(`[PAYMOB] Init for order: ${order.orderNumber}`);
  return {
    success: true,
    paymentUrl: `https://accept.paymob.com/api/acceptance/iframes/ID?payment_token=PLACEHOLDER`,
    transactionId: `PAYMOB-${Date.now()}`,
  };
}

// ─── Fawry Placeholder ────────────────────────────────────────────
// TODO: استبدل بـ Fawry SDK لما تجيب الـ credentials
export async function initFawryPayment(order: any): Promise<PaymentInitResult> {
  console.log(`[FAWRY] Init for order: ${order.orderNumber}`);
  return {
    success: true,
    paymentUrl: `https://www.atfawry.com/ECommerceWeb/Fawry/payments/charge`,
    transactionId: `FAWRY-${Date.now()}`,
  };
}

export async function verifyPayment(
  gateway: PaymentGateway,
  transactionId: string,
): Promise<PaymentVerifyResult> {
  console.log(`[${gateway.toUpperCase()}] Verify: ${transactionId}`);
  return { success: true, paid: true, transactionId };
}