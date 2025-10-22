import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SubscriptionStatus } from '../components/stripe/SubscriptionStatus';
import { RestaurantForm } from '../components/RestaurantForm';
import { MenuList } from '../components/MenuList';
import { MenuForm } from '../components/MenuForm';
import { CategoryForm } from '../components/CategoryForm';
import { ItemList } from '../components/ItemList';
import { ItemForm } from '../components/ItemForm';
import { Plus, Settings, Eye, Palette, Globe, Phone, Mail, MapPin, Instagram, Facebook, Linkedin, ExternalLink, LogOut } from 'lucide-react';
import type { Restaurant, Menu, MenuCategory, MenuItem } from '../types/database';

export function RestaurantDashboard() {
  const { user, signOut } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRestaurant(data);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <SubscriptionStatus />
          </div>
          <RestaurantForm onSuccess={fetchRestaurant} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="h-10 w-10 rounded-full mr-3"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
              <a
                href={`/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Public Menu
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <SubscriptionStatus />
        </div>
        
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Navigation</h3>
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab('menus')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                        activeTab === 'menus'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Menus
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                        activeTab === 'settings'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="inline h-4 w-4 mr-2" />
                      Settings
                    </button>
                  </nav>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {activeTab === 'menus' && (
                <MenuManagement
                  restaurant={restaurant}
                  onRestaurantUpdate={fetchRestaurant}
                />
              )}
              {activeTab === 'settings' && (
                <RestaurantSettings
                  restaurant={restaurant}
                  onUpdate={fetchRestaurant}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}