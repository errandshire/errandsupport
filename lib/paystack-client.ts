import { getCurrentUserId } from './utils';

export async function paystackProxy(action: string, params: Record<string, any> = {}) {
  const response = await fetch('/api/payments/paystack', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getCurrentUserId()
    },
    body: JSON.stringify({ action, ...params })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Paystack request failed');
  }

  return data.data;
}
