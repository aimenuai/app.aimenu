import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, CreditCard, DollarSign, Calendar, AlertCircle, Tag, User, Globe, LogIn } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

interface Menu {
  id: string;
  name: string;
  slug: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  created_at: string;
}

interface ClientProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  source: 'website' | 'reseller' | 'admin';
  reseller_id?: string | null;
  reseller_email?: string | null;
  email?: string;
  created_at?: string;
}

interface SubscriptionData {
  user_id: string;
  subscription_id: string | null;
  customer_id: string | null;
  subscription_status: string | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  discount_amount: number | null;
  promo_code: string | null;
  price_id: string | null;
}

interface PromoCodeData {
  id: string;
  promo_code_text: string;
  reseller_id: string | null;
  discount_amount: number | null;
  discount_percent: number | null;
}

interface ResellerData {
  id: string;
  full_name: string;
}

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [promoCode, setPromoCode] = useState<PromoCodeData | null>(null);
  const [reseller, setReseller] = useState<ResellerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const [profileRes, emailRes, menusRes, subscriptionsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', clientId)
          .maybeSingle(),
        supabase.rpc('get_user_email', {
          target_user_id: clientId
        }),
        supabase.rpc('get_client_menus', {
          target_user_id: clientId
        }),
        supabase.rpc('get_all_stripe_subscriptions')
      ]);

      if (profileRes.data) {
        setClient({
          ...profileRes.data,
          email: emailRes.data || 'N/A'
        });

        if (profileRes.data.reseller_id) {
          const { data: resellerData } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('id', profileRes.data.reseller_id)
            .maybeSingle();

          if (resellerData) {
            setReseller(resellerData);
          }
        }
      }

      if (menusRes.data) {
        setMenus(menusRes.data);
      }

      if (subscriptionsRes.data) {
        const userSub = subscriptionsRes.data.find((s: SubscriptionData) => s.user_id === clientId);
        if (userSub) {
          setSubscription(userSub);

          if (userSub.promo_code) {
            const { data: promoData } = await supabase
              .from('promo_codes')
              .select('id, promo_code_text, reseller_id, discount_amount, discount_percent')
              .eq('promo_code_text', userSub.promo_code)
              .maybeSingle();

            if (promoData) {
              setPromoCode(promoData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (userRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/reseller');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-3">
            {menus.length > 0 && (
              <Link
                to={`/${menus[0].restaurant_slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                View Landing Page
              </Link>
            )}
            <a
              href={`/dashboard?impersonate=${clientId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Access Client Account
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{client.full_name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="font-medium text-gray-900">{client.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>
              <p className="font-medium text-gray-900">{client.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <p className="font-medium text-gray-900">
                {subscription ? (
                  <span>
                    {subscription.discount_amount ? (
                      <>€{((39900 - subscription.discount_amount) / 100).toFixed(2)}</>
                    ) : (
                      <>€399.00</>
                    )}
                  </span>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>
              <p className="font-medium text-gray-900">
                {client.source === 'website' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                    Website
                  </span>
                )}
                {client.source === 'reseller' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                    Reseller
                  </span>
                )}
                {client.source === 'admin' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Reseller:</span>
              <p className="font-medium text-gray-900">
                {reseller ? reseller.full_name : 'Website'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Joined:</span>
              <p className="font-medium text-gray-900">
                {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
          </div>

          {subscription ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Subscription Status</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {subscription.subscription_status === 'active' && (
                      <span className="text-green-600">Active</span>
                    )}
                    {subscription.subscription_status === 'trialing' && (
                      <span className="text-blue-600">Trialing</span>
                    )}
                    {subscription.subscription_status === 'past_due' && (
                      <span className="text-red-600">Past Due</span>
                    )}
                    {subscription.subscription_status === 'canceled' && (
                      <span className="text-orange-600">Canceled</span>
                    )}
                    {subscription.subscription_status === 'unpaid' && (
                      <span className="text-red-600">Unpaid</span>
                    )}
                    {!['active', 'trialing', 'past_due', 'canceled', 'unpaid'].includes(subscription.subscription_status || '') && (
                      <span className="text-gray-600">{subscription.subscription_status || 'Unknown'}</span>
                    )}
                  </p>
                </div>

                {subscription.payment_method_brand && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                    </p>
                  </div>
                )}

                {subscription.current_period_start && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Subscription Started</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.current_period_start * 1000).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {subscription.current_period_end && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Current Period Ends</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                    </p>
                    {subscription.cancel_at_period_end && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Cancels at period end</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {subscription.subscription_id && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer ID:</span>
                      <p className="font-mono text-gray-900">{subscription.customer_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Subscription ID:</span>
                      <p className="font-mono text-gray-900">{subscription.subscription_id}</p>
                    </div>
                    {subscription.price_id && (
                      <div>
                        <span className="text-gray-500">Price ID:</span>
                        <p className="font-mono text-gray-900">{subscription.price_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {promoCode && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Promo Code Applied</h3>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Code:</span>
                        <p className="text-lg font-bold text-green-700">{promoCode.promo_code_text}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Discount:</span>
                        <p className="text-lg font-semibold text-gray-900">
                          {promoCode.discount_percent
                            ? `${promoCode.discount_percent}%`
                            : `€${((promoCode.discount_amount || 0) / 100).toFixed(2)}`
                          }
                        </p>
                      </div>
                      {subscription.discount_amount && (
                        <div>
                          <span className="text-sm text-gray-600">Total Discount Applied:</span>
                          <p className="text-lg font-semibold text-gray-900">
                            €{(subscription.discount_amount / 100).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {reseller && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Reseller:</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {reseller.full_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No subscription data available</p>
            </div>
          )}

        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Menus ({menus.length})
              </h2>
            </div>
          </div>

          {menus.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No menus created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Menu Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {menu.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {menu.restaurant_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(menu.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/${menu.restaurant_slug}/${menu.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
