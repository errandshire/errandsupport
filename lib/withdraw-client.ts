import { ApiService } from './api';

export function requestWithdrawOtp(userId: string) {
  return ApiService.request<{ maskedEmail?: string }>('/wallet/withdraw/request-otp', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function submitWithdrawal(params: {
  userId: string;
  amountInNaira: number;
  bankAccountId: string;
  otp: string;
  feeAmount?: number;
}) {
  return ApiService.request<{ reference: string; message?: string }>('/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
