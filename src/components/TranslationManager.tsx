import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Plus, Trash2, Loader2, Languages, Edit2, Check, X } from 'lucide-react';

interface Translation {
  id: string;
  language_code: string;
  name: string;
}

interface TranslationManagerProps {
  menuId: string;
  baseLanguage: string;
  baseName: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function TranslationManager({ menuId, baseLanguage, baseName }: TranslationManagerProps) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translating, setTranslating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadTranslations();
  }, [menuId]);

  const loadTranslations = async () => {
    const { data } = await supabase
      .from('menu_translations')
      .select('*')
      .eq('menu_id', menuId);

    if (data) {
      setTranslations(data);
    }
    setLoading(false);
  };

  const translateAllContent = async (targetLanguage: string) => {
    setTranslating(true);
    try {
      const { data: categories } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('menu_id', menuId);

      if (!categories) throw new Error('No categories found');

      const menuNameResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            text: baseName,
            targetLanguage,
            context: 'a restaurant menu name',
          }),
        }
      );

      if (!menuNameResponse.ok) throw new Error('Menu translation failed');
      const { translation: menuTranslation } = await menuNameResponse.json();

      await supabase.from('menu_translations').insert({
        menu_id: menuId,
        language_code: targetLanguage,
        name: menuTranslation,
      });

      for (const category of categories) {
        const catNameResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              text: category.name,
              targetLanguage,
              context: 'a menu category name',
            }),
          }
        );

        if (catNameResponse.ok) {
          const { translation: catNameTrans } = await catNameResponse.json();

          let catDescTrans = null;
          if (category.description) {
            const catDescResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  text: category.description,
                  targetLanguage,
                  context: 'a menu category description',
                }),
              }
            );
            if (catDescResponse.ok) {
              const { translation } = await catDescResponse.json();
              catDescTrans = translation;
            }
          }

          await supabase.from('category_translations').insert({
            category_id: category.id,
            language_code: targetLanguage,
            name: catNameTrans,
            description: catDescTrans,
          });
        }

        const { data: items } = await supabase
          .from('menu_items')
          .select('*')
          .eq('category_id', category.id);

        if (items) {
          for (const item of items) {
            const itemNameResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  text: item.name,
                  targetLanguage,
                  context: 'a menu item name (food or drink)',
                }),
              }
            );

            if (itemNameResponse.ok) {
              const { translation: itemNameTrans } = await itemNameResponse.json();

              let itemDescTrans = null;
              if (item.description) {
                const itemDescResponse = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                      text: item.description,
                      targetLanguage,
                      context: 'a menu item description (ingredients)',
                    }),
                  }
                );
                if (itemDescResponse.ok) {
                  const { translation } = await itemDescResponse.json();
                  itemDescTrans = translation;
                }
              }

              await supabase.from('item_translations').insert({
                item_id: item.id,
                language_code: targetLanguage,
                name: itemNameTrans,
                description: itemDescTrans,
              });
            }
          }
        }
      }

      await loadTranslations();
      setShowAddLanguage(false);
      setSelectedLanguage('');
      alert('Traduction terminée avec succès !');
    } catch (error) {
      console.error('Translation error:', error);
      alert('Échec de la traduction. Veuillez réessayer.');
    } finally {
      setTranslating(false);
    }
  };

  const deleteLanguage = async (translation: Translation) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les traductions ${translation.name} ?`)) return;

    try {
      const { data: categories } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('menu_id', menuId);

      if (categories) {
        const categoryIds = categories.map(c => c.id);

        await supabase
          .from('category_translations')
          .delete()
          .eq('language_code', translation.language_code)
          .in('category_id', categoryIds);

        const { data: items } = await supabase
          .from('menu_items')
          .select('id')
          .in('category_id', categoryIds);

        if (items) {
          const itemIds = items.map(i => i.id);
          await supabase
            .from('item_translations')
            .delete()
            .eq('language_code', translation.language_code)
            .in('item_id', itemIds);
        }
      }

      await supabase
        .from('menu_translations')
        .delete()
        .eq('id', translation.id);

      await loadTranslations();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const availableLanguages = LANGUAGES.filter(
    lang => lang.code !== baseLanguage && !translations.some(t => t.language_code === lang.code)
  );

  if (loading) {
    return <div className="text-center py-4">Chargement des traductions...</div>;
  }

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Langues du Menu</h3>
        </div>
        {availableLanguages.length > 0 && (
          <button
            onClick={() => setShowAddLanguage(!showAddLanguage)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            disabled={translating}
          >
            <Plus className="w-4 h-4" />
            Ajouter une langue
          </button>
        )}
      </div>

      {showAddLanguage && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <Languages className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Traduction automatique complète
              </p>
              <p className="text-xs text-blue-700">
                Toutes les catégories et tous les plats seront automatiquement traduits. Vous pourrez les modifier ensuite dans l'onglet de la langue.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              disabled={translating}
            >
              <option value="">-- Choisir une langue --</option>
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => translateAllContent(selectedLanguage)}
              disabled={!selectedLanguage || translating}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {translating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traduction en cours...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  Traduire tout
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowAddLanguage(false);
                setSelectedLanguage('');
              }}
              disabled={translating}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {translations.map((translation) => {
          const lang = LANGUAGES.find(l => l.code === translation.language_code);
          const isEditing = editingId === translation.id;

          return (
            <div
              key={translation.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-3xl">{lang?.flag}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-2">{lang?.name}</div>
                  {isEditing ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nom du Menu
                      </label>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Nom du Menu</div>
                      <div className="text-sm font-medium text-gray-800">{translation.name}</div>
                      <div className="text-xs text-gray-600 mt-2">
                        Cliquez sur l'onglet "{lang?.name}" dans le menu pour modifier les catégories et plats
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('menu_translations')
                          .update({ name: editValue })
                          .eq('id', translation.id);
                        if (!error) {
                          await loadTranslations();
                          setEditingId(null);
                          setEditValue('');
                        }
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Enregistrer"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditValue('');
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Annuler"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(translation.id);
                        setEditValue(translation.name);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Modifier le nom du menu"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteLanguage(translation)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer cette langue"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {translations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Languages className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Aucune langue ajoutée</p>
          <p className="text-sm">Ajoutez une langue pour traduire automatiquement tout votre menu</p>
        </div>
      )}
    </div>
  );
}
