import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, DollarSign, TrendingUp, Wallet, LogOut, Menu as MenuIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientWithDetails {
  client_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  subscription_status: string | null;
  restaurant_names: string[];
  created_at: string;
}

interface ResellerEarnings {
  total_commissions: number;
  pending_commissions: number;
  paid_out: number;
}

interface CashoutRecord {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
}

export default function ResellerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithDetails[]>([]);
  const [earnings, setEarnings] = useState<ResellerEarnings>({ total_commissions: 0, pending_commissions: 0, paid_out: 0 });
  const [cashouts, setCashouts] = useState<CashoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, dateFrom, dateTo, currentPage, itemsPerPage]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      const [clientsRes, earningsRes, cashoutsRes] = await Promise.all([
        supabase.rpc('get_reseller_clients_with_details'),
        supabase
          .from('reseller_earnings_summary')
          .select('*')
          .eq('reseller_id', user.id)
          .maybeSingle(),
        supabase.rpc('get_reseller_cashouts')
      ]);

      if (clientsRes.error) {
        console.error('Error fetching clients:', clientsRes.error);
      } else if (clientsRes.data) {
        setClients(clientsRes.data);
      }

      if (earningsRes.error) {
        console.error('Error fetching earnings:', earningsRes.error);
      } else if (earningsRes.data) {
        const summary = earningsRes.data;
        setEarnings({
          total_commissions: (Number(summary.total_commissions) || 0) / 100,
          pending_commissions: (Number(summary.pending_commissions) || 0) / 100,
          paid_out: (Number(summary.paid_out) || 0) / 100
        });
      }

      if (cashoutsRes.error) {
        console.error('Error fetching cashouts:', cashoutsRes.error);
      } else if (cashoutsRes.data) {
        setCashouts(cashoutsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.full_name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term) ||
        client.restaurant_names.some(name => name.toLowerCase().includes(term))
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(client =>
        new Date(client.created_at) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter(client =>
        new Date(client.created_at) <= new Date(dateTo)
      );
    }

    setFilteredClients(filtered);
  };

  const addNewClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newClientEmail.trim() || !newClientEmail.includes('@')) {
      alert('Valid email address is required');
      return;
    }

    setIsInviting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newClientEmail.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to invite client');
      }

      alert(`Success! A magic link has been sent to ${newClientEmail}`);
      setNewClientEmail('');
      setShowAddClient(false);
      fetchData();
    } catch (error: any) {
      console.error('Error inviting client:', error);
      alert(error.message || 'Failed to invite client');
    } finally {
      setIsInviting(false);
    }
  };


  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getSubscriptionBadge = (status: string | null) => {
    if (!status) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">No Subscription</span>;
    }
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Active</span>;
    }
    if (status === 'trialing') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Trial</span>;
    }
    if (status === 'canceled') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Canceled</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
  };

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Aimenu.svg"
              alt="AI Menu Logo"
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Reseller Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage your client accounts and track your earnings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <Users className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">€{earnings.total_commissions.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending Commissions</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">€{earnings.pending_commissions.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Paid Out</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">€{earnings.paid_out.toFixed(2)}</p>
              </div>
              <Wallet className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Client Accounts</h2>
              <button
                onClick={() => setShowAddClient(!showAddClient)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Client
              </button>
            </div>

            {showAddClient && (
              <form onSubmit={addNewClient} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      required
                      disabled={isInviting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      A magic link will be sent to this email address. The client will be automatically linked to your account.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddClient(false)}
                    disabled={isInviting}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:col-span-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From date"
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To date"
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
              </p>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Client
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Contact
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Restaurant
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Subscription
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-sm sm:text-base text-gray-500">
                      No clients found. Try adjusting your filters or add your first client.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => (
                    <tr key={client.client_id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-sm sm:text-base font-medium text-gray-900">{client.full_name}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm text-gray-900">{client.email}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{client.phone || 'No phone'}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {client.restaurant_names.length > 0 ? (
                            client.restaurant_names.join(', ')
                          ) : (
                            <span className="text-gray-500">No restaurant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {getSubscriptionBadge(client.subscription_status)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="hidden sm:flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <span className="sm:hidden text-xs text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {cashouts.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-4 sm:mt-8">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Cashout History</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Your payment history</p>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cashouts.map((cashout) => (
                    <tr key={cashout.id}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {new Date(cashout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-green-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: cashout.currency.toUpperCase(),
                        }).format(cashout.amount / 100)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {cashout.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
