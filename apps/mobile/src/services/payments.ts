import api from './api';
import type { PaymentMethod, Payment, PaginatedResponse } from '../types';

export interface AddPaymentMethodData {
  stripePaymentMethodId: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export const paymentsService = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get('/payments/methods');
    return data;
  },

  async addPaymentMethod(paymentData: AddPaymentMethodData): Promise<PaymentMethod> {
    const { data } = await api.post('/payments/methods', paymentData);
    return data;
  },

  async setDefaultPaymentMethod(id: string): Promise<PaymentMethod> {
    const { data } = await api.patch(`/payments/methods/${id}/default`);
    return data;
  },

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`/payments/methods/${id}`);
    return data;
  },

  async getPaymentHistory(page = 1, limit = 20): Promise<PaginatedResponse<Payment>> {
    const { data } = await api.get(`/payments/history?page=${page}&limit=${limit}`);
    return data;
  },
};
