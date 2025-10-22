import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, DollarSign, Tag, TrendingUp, Eye, Building2, Wallet } from 'lucide-react';
import SimpleCashoutModal from '../components/SimpleCashoutModal';
import AdminLayout from '../components/AdminLayout';

interface ResellerProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
  created_at: string;
  is_disabled: boolean;
}

interface PromoCode {
  id: string;
  promo_code_text: string;
  coupon_id: string;
  discount_percent: number | null;
  discount_amount: number | null;
  currency: string | null;
  is_active: boolean;
  usage_count: number;
  total_discount_amount: number;
  created_at: string;
  commission_rate: number;
}

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
  source: string;
  created_at: string;
  subscription_status?: string | null;
  restaurant_count?: number;
  menu_count?: number;
}

interface Cashout {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
}

interface EarningsBreakdown {
  total_earnings: number;
  paid_out: number;
  pending_earnings: number;
  currency: string;
  cashouts: Cashout[];
}

export default function ResellerDetail() {
  const { resellerId } = useParams<{ resellerId: string }>();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [reseller, setReseller] = useState<ResellerProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [earnings, setEarnings] = useState<EarningsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clients' | 'promoCodes' | 'cashouts'>('clients');
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<string>('');

  useEffect(() => {
    if (resellerId) {
      if (userRole === 'admin') {
        fetchResellerData();
      } else if (userRole) {
        console.log('Access denied: User role is', userRole, 'but admin required');
        setLoading(false);
      }
    }
  }, [resellerId, userRole]);

  const fetchResellerData = async () => {
    try {
      console.log('Fetching reseller data for ID:', resellerId);

      const [profileRes, emailRes, promoCodesRes, summaryRes, cashoutsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', resellerId)
          .maybeSingle(),
        supabase.rpc('get_user_email', {
          target_user_id: resellerId
        }),
        supabase.rpc('get_reseller_promo_codes', {
          target_reseller_id: resellerId
        }),
        supabase
          .from('reseller_earnings_summary')
          .select('*')
          .eq('reseller_id', resellerId)
          .maybeSingle(),
        supabase
          .from('reseller_cashouts')
          .select('*')
          .eq('reseller_id', resellerId)
          .order('created_at', { ascending: false })
      ]);

      if (profileRes.data) {
        setReseller({
          ...profileRes.data,
          email: emailRes.data || 'N/A'
        });
      }

      if (promoCodesRes.data) {
        setPromoCodes(promoCodesRes.data);
      }

      // Read earnings from pre-calculated summary table (for performance)
      const cashouts = cashoutsRes.data || [];
      const summary = summaryRes.data;

      setEarnings({
        total_earnings: summary ? Number(summary.total_commissions) / 100 : 0,
        paid_out: summary ? Number(summary.paid_out) / 100 : 0,
        pending_earnings: summary ? Number(summary.pending_commissions) / 100 : 0,
        currency: 'eur',
        cashouts: cashouts.map((c: any) => ({
          ...c,
          amount: c.amount / 100
        }))
      });

      const { data: clientsData, error: clientsError } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, source, created_at')
        .eq('reseller_id', resellerId);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      }

      if (clientsData && clientsData.length > 0) {
        const clientIds = clientsData.map(c => c.id);

        // Fetch all data in parallel with batch queries
        const [allSubscriptions, allRestaurants, emailResults] = await Promise.all([
          supabase.rpc('get_all_stripe_subscriptions'),
          supabase
            .from('restaurants')
            .select('id, user_id')
            .in('user_id', clientIds),
          Promise.all(
            clientIds.map(id =>
              supabase.rpc('get_user_email', { target_user_id: id })
            )
          )
        ]);

        // Fetch all menus in one query if we have restaurants
        let allMenus: any[] = [];
        if (allRestaurants.data && allRestaurants.data.length > 0) {
          const restaurantIds = allRestaurants.data.map(r => r.id);
          const { data: menusData } = await supabase
            .from('menus')
            .select('id, restaurant_id')
            .in('restaurant_id', restaurantIds);
          allMenus = menusData || [];
        }

        // Build lookup maps for O(1) access
        const subscriptionMap = new Map(
          (allSubscriptions.data || []).map((sub: any) => [sub.user_id, sub.subscription_status])
        );

        const restaurantMap = new Map<string, any[]>();
        (allRestaurants.data || []).forEach(restaurant => {
          if (!restaurantMap.has(restaurant.user_id)) {
            restaurantMap.set(restaurant.user_id, []);
          }
          restaurantMap.get(restaurant.user_id)!.push(restaurant);
        });

        const menuCountMap = new Map<string, number>();
        allMenus.forEach(menu => {
          const restaurant = (allRestaurants.data || []).find(r => r.id === menu.restaurant_id);
          if (restaurant) {
            menuCountMap.set(restaurant.user_id, (menuCountMap.get(restaurant.user_id) || 0) + 1);
          }
        });

        const emailMap = new Map(
          clientIds.map((id, index) => [id, emailResults[index].data || 'N/A'])
        );

        // Map clients with pre-fetched data
        const clientsWithDetails = clientsData.map(client => ({
          ...client,
          email: emailMap.get(client.id) || 'N/A',
          subscription_status: subscriptionMap.get(client.id) || null,
          restaurant_count: restaurantMap.get(client.id)?.length || 0,
          menu_count: menuCountMap.get(client.id) || 0
        }));

        setClients(clientsWithDetails);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching reseller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/admin');
  };

  const viewClientDetail = (clientId: string) => {
    navigate(`/admin/client/${clientId}`);
  };

  const handleCashout = async (amount: number, note: string) => {
    try {
      const { data, error } = await supabase.rpc('record_reseller_cashout', {
        p_reseller_id: resellerId,
        p_amount: amount,
        p_note: note || null
      });

      if (error) throw error;

      await fetchResellerData();
      alert('Cashout recorded successfully!');
    } catch (error: any) {
      console.error('Error recording cashout:', error);
      throw new Error(error.message || 'Failed to record cashout');
    }
  };

  const handleUpdateCommissionRate = async (promoCodeId: string, rate: number) => {
    try {
      const { error } = await supabase
        .from('reseller_promo_codes')
        .update({ commission_rate: rate })
        .eq('id', promoCodeId);

      if (error) throw error;

      await fetchResellerData();
      setEditingPromoCode(null);
      setNewCommissionRate('');
      alert('Commission rate updated successfully!');
    } catch (error: any) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate');
    }
  };

  const getSubscriptionBadge = (status: string | null | undefined) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          No Subscription
        </span>
      );
    }

    switch (status) {
      case 'active':
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Past Due
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Canceled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const toggleDisabledStatus = async () => {
    if (!reseller) return;

    const confirmMessage = reseller.is_disabled
      ? `Are you sure you want to enable ${reseller.full_name}? They will be able to log in to the dashboard.`
      : `Are you sure you want to disable ${reseller.full_name}? They will not be able to log in to the dashboard.`;

    if (!confirm(confirmMessage)) return;

    try {
      const { data, error } = await supabase.rpc('toggle_user_disabled_status', {
        target_user_id: reseller.id,
        disabled: !reseller.is_disabled
      });

      if (error) throw error;

      setReseller({ ...reseller, is_disabled: !reseller.is_disabled });
      alert(`Reseller ${reseller.is_disabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling disabled status:', error);
      alert('Failed to update reseller status');
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

  if (!reseller) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Reseller Not Found</h1>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{reseller.full_name}</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Reseller
              </span>
              {reseller.is_disabled && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Disabled
                </span>
              )}
            </div>
            <button
              onClick={toggleDisabledStatus}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reseller.is_disabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {reseller.is_disabled ? 'Enable Reseller' : 'Disable Reseller'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="font-medium text-gray-900">{reseller.email}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>
              <p className="font-medium text-gray-900">{reseller.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Joined:</span>
              <p className="font-medium text-gray-900">
                {new Date(reseller.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Promo Codes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {promoCodes.filter(p => p.is_active).length}
                </p>
              </div>
              <Tag className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-green-600">
                  {earnings ? formatCurrency(earnings.total_earnings) : '€0.00'}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Earnings</p>
                <p className="text-3xl font-bold text-orange-600">
                  {earnings ? formatCurrency(earnings.pending_earnings) : '€0.00'}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paid Out</p>
                <p className="text-3xl font-bold text-blue-600">
                  {earnings ? formatCurrency(earnings.paid_out) : '€0.00'}
                </p>
              </div>
              <Wallet className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {earnings && earnings.pending_earnings > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowCashoutModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium shadow-sm"
            >
              <Wallet className="w-5 h-5" />
              Process Cashout
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Clients ({clients.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('promoCodes')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'promoCodes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Promo Codes ({promoCodes.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('cashouts')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'cashouts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Cashout History ({earnings?.cashouts?.length || 0})
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'clients' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Client List</h2>
                {clients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No clients yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Restaurants
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Menus
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">{client.full_name}</div>
                                <div className="text-sm text-gray-500">{client.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getSubscriptionBadge(client.subscription_status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-gray-900">
                                <Building2 className="w-4 h-4" />
                                {client.restaurant_count || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.menu_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(client.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => viewClientDetail(client.id)}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'promoCodes' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Promo Codes</h2>
                {promoCodes.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No promo codes created yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promoCodes.map((promo) => (
                      <div
                        key={promo.id}
                        className={`border rounded-lg p-6 ${
                          promo.is_active
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {promo.promo_code_text}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              promo.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-semibold text-gray-900">
                              {promo.discount_percent
                                ? `${promo.discount_percent}%`
                                : `${promo.discount_amount} ${promo.currency?.toUpperCase()}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Times Used:</span>
                            <span className="font-semibold text-gray-900">
                              {promo.usage_count}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Discount:</span>
                            <span className="font-semibold text-gray-900">
                              €{(promo.total_discount_amount / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-gray-900">
                              {new Date(promo.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                            <span className="text-gray-600">Commission Rate:</span>
                            {editingPromoCode === promo.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={newCommissionRate}
                                  onChange={(e) => setNewCommissionRate(e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                  placeholder="10.00"
                                />
                                <button
                                  onClick={() => handleUpdateCommissionRate(promo.id, parseFloat(newCommissionRate))}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPromoCode(null);
                                    setNewCommissionRate('');
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {promo.commission_rate != null ? `${promo.commission_rate}%` : 'Not set'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingPromoCode(promo.id);
                                    setNewCommissionRate(promo.commission_rate != null ? promo.commission_rate.toString() : '10.00');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cashouts' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Cashout History</h2>
                {!earnings || earnings.cashouts.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No cashouts yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {earnings.cashouts.map((cashout) => (
                          <tr key={cashout.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(cashout.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-lg font-semibold text-green-600">
                                {formatCurrency(cashout.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {cashout.note || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {earnings && (
        <SimpleCashoutModal
          isOpen={showCashoutModal}
          onClose={() => setShowCashoutModal(false)}
          onConfirm={handleCashout}
          totalEarnings={earnings.total_earnings}
          paidOut={earnings.paid_out}
          pendingEarnings={earnings.pending_earnings}
          currency="eur"
        />
      )}
    </AdminLayout>
  );
}
