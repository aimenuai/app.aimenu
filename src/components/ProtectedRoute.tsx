import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowWithoutSubscription?: boolean;
  requiredRole?: 'admin' | 'reseller' | 'client';
}

export function ProtectedRoute({ children, allowWithoutSubscription = false, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userRole, effectiveUserId, isImpersonating } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [isDisabled, setIsDisabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      checkUserStatus();
    } else {
      setCheckingSubscription(false);
    }
  }, [user, userRole, allowWithoutSubscription, effectiveUserId, isImpersonating]);

  const checkUserStatus = async () => {
    if (!user) return;

    // If impersonating, skip disabled check for the admin
    // Check if the impersonated user is disabled instead
    const userIdToCheck = effectiveUserId || user.id;

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_disabled')
        .eq('id', userIdToCheck)
        .maybeSingle();

      if (profile?.is_disabled && !isImpersonating) {
        setIsDisabled(true);
        setCheckingSubscription(false);
        return;
      }
      setIsDisabled(false);
    } catch (error) {
      console.error('Error checking user disabled status:', error);
      setIsDisabled(false);
    }

    // Check subscription
    // If admin/reseller is impersonating, check the client's subscription
    // Otherwise use normal logic
    if ((userRole === 'admin' || userRole === 'reseller') && !isImpersonating) {
      setHasActiveSubscription(true);
      setCheckingSubscription(false);
    } else if (allowWithoutSubscription) {
      setHasActiveSubscription(true);
      setCheckingSubscription(false);
    } else {
      checkSubscription();
    }
  };

  const checkSubscription = async () => {
    if (!user) {
      setCheckingSubscription(false);
      return;
    }

    try {
      // Check subscription for the effective user (impersonated or actual)
      const userIdToCheck = effectiveUserId || user.id;

      const { data: subscriptionData } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('user_id', userIdToCheck)
        .maybeSingle();

      if (subscriptionData && (subscriptionData.status === 'active' || subscriptionData.status === 'trialing')) {
        setHasActiveSubscription(true);
      } else {
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Show loading state while checking auth and subscription
  // IMPORTANT: Also check if hasActiveSubscription is still null (not yet determined)
  if (loading || checkingSubscription || (hasActiveSubscription === null && !allowWithoutSubscription)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is disabled
  if (isDisabled) {
    // Sign them out and redirect to login
    supabase.auth.signOut();
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole && userRole !== requiredRole) {
    // Redirect based on user's actual role
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'reseller') {
      return <Navigate to="/reseller" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Redirect to subscription page before rendering any content if no subscription
  if (hasActiveSubscription === false && !allowWithoutSubscription) {
    return <Navigate to="/dashboard/abonnement?new_user=true" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute