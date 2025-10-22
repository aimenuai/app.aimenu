import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Menu as MenuType } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, GripVertical, Eye, EyeOff, Edit, Trash2, Image as ImageIcon } from 'lucide-react';

export default function Menu() {
  const { t } = useLanguage();
  const { user, effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState<MenuType[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showNewMenuForm, setShowNewMenuForm] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (effectiveUserId) {
      loadRestaurantAndMenus();
    }
  }, [effectiveUserId]);

  const loadRestaurantAndMenus = async () => {
    if (!effectiveUserId) return;

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (restaurant) {
      setRestaurantId(restaurant.id);
      loadMenus(restaurant.id);
    } else {
      setLoading(false);
    }
  };

  const loadMenus = async (restId: string) => {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restId)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setMenus(data);
    }
    setLoading(false);
  };

  const handleCreateMenu = async () => {
    if (!restaurantId || !newMenuName.trim()) return;
    setSaving(true);

    try {
      const maxOrder = menus.length > 0 ? Math.max(...menus.map(m => m.display_order)) : -1;

      const { error } = await supabase
        .from('menus')
        .insert({
          restaurant_id: restaurantId,
          name: newMenuName.trim(),
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      await loadMenus(restaurantId);
      setShowNewMenuForm(false);
      setNewMenuName('');
    } catch (error) {
      console.error('Error creating menu:', error);
      alert('Error creating menu');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (menu: MenuType) => {
    const { error } = await supabase
      .from('menus')
      .update({ is_visible: !menu.is_visible })
      .eq('id', menu.id);

    if (!error && restaurantId) {
      loadMenus(restaurantId);
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm(t.menu.confirmDelete || 'Are you sure you want to delete this menu?')) return;

    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (!error && restaurantId) {
      loadMenus(restaurantId);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMenus = [...menus];
    const draggedItem = newMenus[draggedIndex];
    newMenus.splice(draggedIndex, 1);
    newMenus.splice(index, 0, draggedItem);

    setMenus(newMenus);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    const updates = menus.map((menu, index) => ({
      id: menu.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from('menus')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }

    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{t.common.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.menu.noRestaurant}</h2>
          <p className="text-gray-600 mb-6">{t.menu.createRestaurantFirst}</p>
          <button
            onClick={() => navigate('/dashboard/visual-identity')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t.menu.goToVisualIdentity}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.nav.myMenus}</h1>
          {!showNewMenuForm && (
            <button
              onClick={() => setShowNewMenuForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              {t.menu.createMenu}
            </button>
          )}
        </div>

        {showNewMenuForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.menu.createNewMenu}</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
                placeholder={t.menu.menuNamePlaceholder}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateMenu}
                  disabled={saving || !newMenuName.trim()}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {saving ? t.common.saving : t.common.create}
                </button>
                <button
                  onClick={() => {
                    setShowNewMenuForm(false);
                    setNewMenuName('');
                  }}
                  className="flex-1 sm:flex-initial px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {menus.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.menu.noMenus}</h3>
            <p className="text-gray-600 mb-6">{t.menu.createFirstMenu}</p>
            <button
              onClick={() => setShowNewMenuForm(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.menu.createMenu}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {t.menu.menuName}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {t.menu.status}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {t.menu.visibility}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {menus.map((menu, index) => (
                    <tr
                      key={menu.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-move"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                          <div
                            className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 cursor-pointer"
                            onClick={() => navigate(`/dashboard/menu/${menu.id}`)}
                          >
                            {menu.photo_url ? (
                              <img
                                src={menu.photo_url}
                                alt={menu.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/dashboard/menu/${menu.id}`)}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {menu.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                          {t.menu.published}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleVisibility(menu)}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            menu.is_visible ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={menu.is_visible}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 flex items-center justify-center ${
                              menu.is_visible ? 'translate-x-9' : 'translate-x-1'
                            }`}
                          >
                            {menu.is_visible && (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {menus.map((menu) => (
                <div key={menu.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0"
                      onClick={() => navigate(`/dashboard/menu/${menu.id}`)}
                    >
                      {menu.photo_url ? (
                        <img
                          src={menu.photo_url}
                          alt={menu.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/dashboard/menu/${menu.id}`)}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left mb-2"
                      >
                        {menu.name}
                      </button>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {t.menu.published}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t.menu.visibility}</span>
                        <button
                          onClick={() => toggleVisibility(menu)}
                          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ${
                            menu.is_visible ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={menu.is_visible}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                              menu.is_visible ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
