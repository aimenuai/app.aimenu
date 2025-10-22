import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getProductByPriceId } from '../../stripe-config';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export function SubscriptionStatus() {
  const { effectiveUserId } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, [effectiveUserId]);

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Use effectiveUserId for impersonation support
      const userIdToCheck = effectiveUserId || user.id;

      const { data, error } = await supabase
        .from('stripe_subscriptions')
        .select('status, price_id, current_period_end, cancel_at_period_end')
        .eq('user_id', userIdToCheck)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else if (data) {
        setSubscription({
          subscription_status: data.status,
          price_id: data.price_id,
          current_period_end: data.current_period_end,
          cancel_at_period_end: data.cancel_at_period_end || false,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-gray-900">No Active Subscription</p>
            <p className="text-sm text-gray-500">Subscribe to access premium features</p>
          </div>
        </div>
      </div>
    );
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;
  const statusIcon = getStatusIcon(subscription.subscription_status);
  const statusColor = getStatusColor(subscription.subscription_status);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {statusIcon}
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {product?.name || 'Subscription'}
            </p>
            <p className={`text-sm ${statusColor}`}>
              {getStatusText(subscription.subscription_status)}
            </p>
          </div>
        </div>
        {subscription.current_period_end && (
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on
            </p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'trialing':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'canceled':
    case 'unpaid':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'trialing':
      return 'text-blue-600';
    case 'canceled':
    case 'unpaid':
      return 'text-red-600';
    default:
      return 'text-yellow-600';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial Period';
    case 'canceled':
      return 'Canceled';
    case 'unpaid':
      return 'Payment Failed';
    case 'past_due':
      return 'Past Due';
    case 'incomplete':
      return 'Incomplete';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}