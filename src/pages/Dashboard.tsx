import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import AnalyticsChart from '../components/AnalyticsChart';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Eye, TrendingUp, QrCode, MapPin as GoogleBusiness, Facebook, Instagram, Linkedin } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';

interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  sourceBreakdown: Record<string, number>;
  trendData: { date: string; visits: number; sources: Record<string, number> }[];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const location = useLocation();
  const { userRole, effectiveUserId } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVisits: 0,
    todayVisits: 0,
    weekVisits: 0,
    monthVisits: 0,
    sourceBreakdown: {},
    trendData: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | '180' | '365'>('30');
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const impersonateId = params.get('impersonate');

    if (impersonateId && (userRole === 'admin' || userRole === 'reseller')) {
      localStorage.setItem('impersonating_user_id', impersonateId);
      window.location.href = '/dashboard';
    }
  }, [location.search, userRole]);

  useEffect(() => {
    if (effectiveUserId) {
      loadAnalytics();
    }
  }, [effectiveUserId, timeRange]);

  useEffect(() => {
    if (restaurant?.slug) {
      generateQRCode();
    }
  }, [restaurant]);

  const generateQRCode = () => {
    if (!restaurant?.slug || !qrRef.current) return;

    const url = `${window.location.origin}/${restaurant.slug}?ref=QR`;

    if (qrCodeRef.current) {
      qrCodeRef.current.update({
        data: url,
      });
    } else {
      qrCodeRef.current = new QRCodeStyling({
        width: 220,
        height: 220,
        data: url,
        margin: 5,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H',
        },
        dotsOptions: {
          color: '#000000',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          type: 'dot',
        },
      });

      qrCodeRef.current.append(qrRef.current);
    }
  };

  const loadAnalytics = async () => {
    if (!effectiveUserId) return;

    try {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (!restaurantData) {
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const rangeStartDate = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
      const rangeStart = rangeStartDate.toISOString().split('T')[0];

      const { data: dailyAnalytics } = await supabase
        .from('restaurant_analytics_daily')
        .select('date, total_visits, source_breakdown')
        .eq('restaurant_id', restaurantData.id)
        .gte('date', rangeStart)
        .order('date', { ascending: true });

      const { data: allTimeAnalytics } = await supabase
        .from('restaurant_analytics_daily')
        .select('total_visits')
        .eq('restaurant_id', restaurantData.id);

      const totalVisits = allTimeAnalytics?.reduce((sum, day) => sum + day.total_visits, 0) || 0;

      const todayData = dailyAnalytics?.find(day => day.date === today);
      const todayVisits = todayData?.total_visits || 0;

      const rangeVisits = dailyAnalytics?.reduce((sum, day) => sum + day.total_visits, 0) || 0;

      const sourceBreakdown: Record<string, number> = {};
      dailyAnalytics?.forEach((day) => {
        const sources = day.source_breakdown as Record<string, number>;
        Object.entries(sources).forEach(([source, count]) => {
          sourceBreakdown[source] = (sourceBreakdown[source] || 0) + count;
        });
      });

      const trendData = dailyAnalytics?.map(day => ({
        date: day.date,
        visits: day.total_visits,
        sources: day.source_breakdown as Record<string, number>,
      })) || [];

      setAnalytics({
        totalVisits,
        todayVisits,
        weekVisits: rangeVisits,
        monthVisits: rangeVisits,
        sourceBreakdown,
        trendData,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const qrScans = analytics.sourceBreakdown['QR'] || 0;
  const gmbVisits = analytics.sourceBreakdown['GMB'] || 0;
  const fbShares = analytics.sourceBreakdown['FB'] || 0;
  const igShares = analytics.sourceBreakdown['IG'] || 0;
  const liShares = analytics.sourceBreakdown['LI'] || 0;
  const ttShares = analytics.sourceBreakdown['TT'] || 0;
  const totalViews = analytics.weekVisits;

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      QR: '#3b82f6',
      GMB: '#10b981',
      FB: '#1877f2',
      IG: '#e4405f',
      LI: '#0077b5',
      TT: '#000000',
    };
    return colors[source] || '#6b7280';
  };

  const getSourceLabel = (source: string) => {
    const labels = t.dashboard.sourceLabels as Record<string, string>;
    return labels[source] || source;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.dashboard.welcomeTitle}</h1>
          <p className="text-gray-600">{t.dashboard.welcomeDescription}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{qrScans}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.qrScans}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      {(() => {
                        const todayQR = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['QR'] || 0), 0);
                        return todayQR > 0 ? `${todayQR} ${todayQR > 1 ? t.dashboard.scansToday : t.dashboard.scanToday}` : t.dashboard.noScanToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                    <QrCode className="w-6 h-6" style={{ color: '#3b82f6' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{gmbVisits}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.gmbVisits}</p>
                    <p className="text-xs mt-2" style={{ color: '#10b981' }}>
                      {(() => {
                        const todayGMB = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['GMB'] || 0), 0);
                        return todayGMB > 0 ? `${todayGMB} ${t.dashboard.visitsGmbToday}` : t.dashboard.noVisitGmbToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#d1fae5' }}>
                    <GoogleBusiness className="w-6 h-6" style={{ color: '#10b981' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{fbShares}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.fbShares}</p>
                    <p className="text-xs mt-2" style={{ color: '#1877f2' }}>
                      {(() => {
                        const todayFB = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['FB'] || 0), 0);
                        return todayFB > 0 ? `${todayFB} ${todayFB > 1 ? t.dashboard.sharesToday : t.dashboard.shareToday}` : t.dashboard.noShareToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#dbeefe' }}>
                    <Facebook className="w-6 h-6" style={{ color: '#1877f2' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{igShares}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.igShares}</p>
                    <p className="text-xs mt-2" style={{ color: '#e4405f' }}>
                      {(() => {
                        const todayIG = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['IG'] || 0), 0);
                        return todayIG > 0 ? `${todayIG} ${todayIG > 1 ? t.dashboard.sharesToday : t.dashboard.shareToday}` : t.dashboard.noShareToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#fce7f3' }}>
                    <Instagram className="w-6 h-6" style={{ color: '#e4405f' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{liShares}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.liShares}</p>
                    <p className="text-xs mt-2" style={{ color: '#0077b5' }}>
                      {(() => {
                        const todayLI = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['LI'] || 0), 0);
                        return todayLI > 0 ? `${todayLI} ${todayLI > 1 ? t.dashboard.sharesToday : t.dashboard.shareToday}` : t.dashboard.noShareToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                    <Linkedin className="w-6 h-6" style={{ color: '#0077b5' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{ttShares}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t.dashboard.ttShares}</p>
                    <p className="text-xs mt-2" style={{ color: '#000000' }}>
                      {(() => {
                        const todayTT = analytics.trendData
                          .filter(d => new Date(d.date).toDateString() === new Date().toDateString())
                          .reduce((sum, d) => sum + (d.sources['TT'] || 0), 0);
                        return todayTT > 0 ? `${todayTT} ${todayTT > 1 ? t.dashboard.sharesToday : t.dashboard.shareToday}` : t.dashboard.noShareToday;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#e5e7eb' }}>
                    <div className="w-6 h-6 flex items-center justify-center text-xs font-bold" style={{ color: '#000000' }}>TT</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
            <div ref={qrRef} className="mb-6"></div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{totalViews}</div>
              <div className="text-sm font-medium text-gray-600 mb-1">{t.dashboard.totalViews}</div>
              <div className="text-xs text-gray-500">
                {qrScans + gmbVisits + fbShares + igShares + liShares + ttShares} {t.dashboard.visitsThisMonthCount}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t.dashboard.visitsEvolution}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.dashboard.comparisonByAccess}</p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7' | '30' | '90' | '180' | '365')}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="7">{t.dashboard.last7Days}</option>
              <option value="30">{t.dashboard.last30Days}</option>
              <option value="90">{t.dashboard.last90Days || 'Last 90 Days'}</option>
              <option value="180">{t.dashboard.last180Days || 'Last 6 Months'}</option>
              <option value="365">{t.dashboard.last365Days || 'Last Year'}</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : analytics.trendData.length > 0 ? (
            <AnalyticsChart
              trendData={analytics.trendData}
              getSourceColor={getSourceColor}
              getSourceLabel={getSourceLabel}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              {t.dashboard.noData || 'No data available'}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
