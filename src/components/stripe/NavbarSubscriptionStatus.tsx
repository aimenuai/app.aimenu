import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getProductByPriceId } from '../../stripe-config';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export function NavbarSubscriptionStatus() {
  const { effectiveUserId } = useAuth();
  const { t, language } = useLanguage();
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
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
        <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
        <AlertCircle className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-600">{t.subscription.noSubscription}</span>
      </div>
    );
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;
  const statusIcon = getStatusIcon(subscription.subscription_status);

  const getLocale = () => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      fr: 'fr-FR',
      es: 'es-ES',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ko: 'ko-KR',
      ar: 'ar-SA',
    };
    return localeMap[language] || 'en-US';
  };

  return (
    <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-xs font-medium text-gray-900">
          {product?.name || t.subscription.subscription}
        </span>
      </div>
      {subscription.current_period_end && (
        <div className="flex items-center gap-1 text-xs text-gray-600 border-l border-gray-300 pl-3">
          <span className="text-gray-500">
            {subscription.cancel_at_period_end ? t.subscription.expires : t.subscription.renews}
          </span>
          <span className="font-medium">
            {new Date(subscription.current_period_end * 1000).toLocaleDateString(getLocale(), {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
      )}
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'trialing':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'canceled':
    case 'unpaid':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  }
}
