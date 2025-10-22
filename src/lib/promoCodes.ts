import { supabase } from './supabase';

export interface PromoCode {
  id: string;
  reseller_id: string;
  promo_code_stripe_id: string;
  promo_code_text: string;
  coupon_id: string;
  discount_percent: number | null;
  discount_amount: number | null;
  currency: string | null;
  is_active: boolean;
  usage_count: number;
  total_discount_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeUsageStats {
  promo_code_text: string;
  total_uses: number;
  total_discount_amount: number;
  currency: string | null;
  unique_users: number;
  first_used_at: string | null;
  last_used_at: string | null;
  users: Array<{
    user_id: string;
    full_name: string;
    applied_at: string;
    discount_amount: number;
  }>;
}

export interface ResellerCommission {
  id: string;
  reseller_id: string;
  reseller_name: string;
  user_id: string;
  client_name: string;
  subscription_id: string;
  promo_code_text: string;
  commission_amount: number;
  commission_rate: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  period_start: string;
  period_end: string;
  created_at: string;
  paid_at: string | null;
}

export interface CreatePromoCodeParams {
  reseller_id: string;
  promo_code_text?: string;
  coupon_id?: string;
  discount_percent?: number;
  discount_amount?: number;
  currency?: string;
}

export async function getResellerPromoCodes(resellerId?: string): Promise<PromoCode[]> {
  const { data, error } = await supabase.rpc('get_reseller_promo_codes', {
    target_reseller_id: resellerId || null,
  });

  if (error) {
    console.error('Error fetching promo codes:', error);
    throw error;
  }

  return data || [];
}

export async function getPromoCodeUsageStats(promoCodeId: string): Promise<PromoCodeUsageStats | null> {
  const { data, error } = await supabase.rpc('get_promo_code_usage_stats', {
    target_promo_code_id: promoCodeId,
  });

  if (error) {
    console.error('Error fetching promo code usage stats:', error);
    throw error;
  }

  return data?.[0] || null;
}

export async function getResellerCommissions(
  resellerId?: string,
  statusFilter?: 'pending' | 'paid' | 'cancelled'
): Promise<ResellerCommission[]> {
  const { data, error } = await supabase.rpc('get_reseller_commissions', {
    target_reseller_id: resellerId || null,
    commission_status_filter: statusFilter || null,
  });

  if (error) {
    console.error('Error fetching reseller commissions:', error);
    throw error;
  }

  return data || [];
}

export async function createResellerPromoCode(params: CreatePromoCodeParams): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reseller-promo-code`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create promo code');
  }

  return await response.json();
}

export async function deactivatePromoCode(promoCodeId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('deactivate_promo_code', {
    target_promo_code_id: promoCodeId,
  });

  if (error) {
    console.error('Error deactivating promo code:', error);
    throw error;
  }

  return data;
}

export async function getAllPromoCodesWithStats(): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_all_promo_codes_with_stats');

  if (error) {
    console.error('Error fetching all promo codes with stats:', error);
    throw error;
  }

  return data || [];
}
