import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, DollarSign, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

interface FinancialOverview {
  total_revenue: number;
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  net_benefit: number;
  currency: string;
}

interface Stats {
  totalClients: number;
  totalResellers: number;
  totalRestaurants: number;
  totalMenus: number;
}

export default function AdminOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [financialOverview, setFinancialOverview] = useState<FinancialOverview | null>(null);
  const [stats, setStats] = useState<Stats>({ totalClients: 0, totalResellers: 0, totalRestaurants: 0, totalMenus: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();

      // Refresh data every 30 seconds to show latest database values
      const interval = setInterval(() => {
        fetchData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchData = async () => {
    try {
      const [financialRes, profilesRes, restaurantsRes, menusRes] = await Promise.all([
        supabase.rpc('get_admin_financial_overview'),
        supabase.rpc('get_all_user_profiles'),
        supabase.rpc('get_all_restaurants'),
        supabase.rpc('get_admin_all_menus')
      ]);

      console.log('Financial data:', financialRes);
      console.log('Profiles data:', profilesRes);
      console.log('Restaurants data:', restaurantsRes);
      console.log('Menus data:', menusRes);

      if (financialRes.error) {
        console.error('Financial overview error:', financialRes.error);
        // If error, show zero values
        setFinancialOverview({
          total_revenue: 0,
          total_commissions: 0,
          pending_commissions: 0,
          paid_commissions: 0,
          net_benefit: 0,
          currency: 'eur'
        });
      }

      // The function returns JSONB directly, not an array
      if (financialRes.data) {
        console.log('Setting financial overview:', financialRes.data);
        // Convert cents to euros - ensure we have valid numbers
        const revenue = Number(financialRes.data.total_revenue) || 0;
        const totalComm = Number(financialRes.data.total_commissions) || 0;
        const pendingComm = Number(financialRes.data.pending_commissions) || 0;
        const paidComm = Number(financialRes.data.paid_commissions) || 0;
        const netBenefit = Number(financialRes.data.net_benefit) || 0;

        setFinancialOverview({
          total_revenue: revenue / 100,
          total_commissions: totalComm / 100,
          pending_commissions: pendingComm / 100,
          paid_commissions: paidComm / 100,
          net_benefit: netBenefit / 100,
          currency: financialRes.data.currency || 'eur'
        });
      } else {
        console.log('No financial data');
        // Set default values if no data
        setFinancialOverview({
          total_revenue: 0,
          total_commissions: 0,
          pending_commissions: 0,
          paid_commissions: 0,
          net_benefit: 0,
          currency: 'eur'
        });
      }

      if (profilesRes.data) {
        const clients = profilesRes.data.filter((p: any) => p.role === 'client');
        const resellers = profilesRes.data.filter((p: any) => p.role === 'reseller');
        setStats(prev => ({
          ...prev,
          totalClients: clients.length,
          totalResellers: resellers.length
        }));
      }

      if (restaurantsRes.data) {
        setStats(prev => ({ ...prev, totalRestaurants: restaurantsRes.data.length }));
      }

      if (menusRes.data !== null && menusRes.data !== undefined) {
        setStats(prev => ({ ...prev, totalMenus: Number(menusRes.data) }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Overview of platform metrics and finances</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()} (Auto-refreshes every 30s)
            </p>
          )}
        </div>

        {/* Financial Overview Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {financialOverview?.currency === 'eur' ? '€' : '$'}
                    {financialOverview?.total_revenue.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Commissions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {financialOverview?.currency === 'eur' ? '€' : '$'}
                    {financialOverview?.pending_commissions.toFixed(2) || '0.00'}
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Paid Out</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {financialOverview?.currency === 'eur' ? '€' : '$'}
                    {financialOverview?.paid_commissions.toFixed(2) || '0.00'}
                  </p>
                </div>
                <Wallet className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Benefit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {financialOverview?.currency === 'eur' ? '€' : '$'}
                    {financialOverview?.net_benefit.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Platform Statistics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => navigate('/admin/clients')}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/resellers')}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Resellers</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalResellers}</p>
                </div>
                <Users className="w-12 h-12 text-green-500" />
              </div>
            </button>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Restaurants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalRestaurants}</p>
                </div>
                <Users className="w-12 h-12 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Menus</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalMenus}</p>
                </div>
                <Users className="w-12 h-12 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
