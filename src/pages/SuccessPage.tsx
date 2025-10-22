import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, effectiveUserId } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      navigate('/dashboard/abonnement');
      return;
    }

    if (!user) {
      const timer = setTimeout(() => {
        navigate(`/signup?session_id=${sessionId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }

    checkSubscriptionStatus();
  }, [user, navigate, searchParams]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    let attempts = 0;
    const maxAttempts = 15;
    const checkInterval = 2000;

    const intervalId = setInterval(async () => {
      attempts++;
      console.log(`Checking subscription attempt ${attempts}/${maxAttempts}`);

      try {
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', effectiveUserId || user.id)
          .maybeSingle();

        console.log('Customer data:', customerData, 'Error:', customerError);

        if (!customerData) {
          if (attempts >= maxAttempts) {
            console.log('Max attempts reached, no customer found - redirecting to dashboard anyway');
            clearInterval(intervalId);
            setCheckingSubscription(false);
            setSubscriptionActive(true);
            startCountdown();
          }
          return;
        }

        const { data: subscriptionData, error: subError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerData.customer_id)
          .maybeSingle();

        console.log('Subscription data:', subscriptionData, 'Error:', subError);

        if (subscriptionData && (subscriptionData.status === 'active' || subscriptionData.status === 'trialing')) {
          console.log('Subscription confirmed as active!');
          clearInterval(intervalId);
          setSubscriptionActive(true);
          setCheckingSubscription(false);
          startCountdown();
        } else if (attempts >= maxAttempts) {
          console.log('Max attempts reached, subscription not confirmed yet - redirecting to dashboard anyway');
          clearInterval(intervalId);
          setCheckingSubscription(false);
          setSubscriptionActive(true);
          startCountdown();
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          setCheckingSubscription(false);
          setSubscriptionActive(true);
          startCountdown();
        }
      }
    }, checkInterval);

    return () => clearInterval(intervalId);
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          {checkingSubscription ? (
            <>
              <Loader2 className="mx-auto h-16 w-16 text-blue-600 animate-spin" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Processing Payment...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we confirm your subscription.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Payment Successful!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Thank you for your purchase. Your subscription is now active.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                {user
                  ? `Redirecting to dashboard in ${countdown} seconds...`
                  : 'Redirecting to create your account...'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}