import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Edit2, Check, X, Trash2 } from 'lucide-react';

interface Translation {
  id: string;
  language_code: string;
  name: string;
  description?: string;
}

interface ItemTranslationManagerProps {
  itemId: string;
  baseName: string;
  baseDescription?: string;
  availableLanguages: string[];
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function ItemTranslationManager({
  itemId,
  baseName,
  baseDescription,
  availableLanguages,
}: ItemTranslationManagerProps) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadTranslations();
  }, [itemId]);

  const loadTranslations = async () => {
    const { data } = await supabase
      .from('item_translations')
      .select('*')
      .eq('item_id', itemId);

    if (data) {
      setTranslations(data);
    }
    setLoading(false);
  };

  const translateContent = async (targetLanguage: string) => {
    setTranslating(true);
    try {
      const nameResponse = await fetch(
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
            context: 'a menu item name (food or drink)',
          }),
        }
      );

      if (!nameResponse.ok) throw new Error('Translation failed');
      const { translation: translatedName } = await nameResponse.json();

      let translatedDescription = null;
      if (baseDescription) {
        const descResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              text: baseDescription,
              targetLanguage,
              context: 'a menu item description (ingredients and details)',
            }),
          }
        );

        if (descResponse.ok) {
          const { translation } = await descResponse.json();
          translatedDescription = translation;
        }
      }

      const { error } = await supabase
        .from('item_translations')
        .insert({
          item_id: itemId,
          language_code: targetLanguage,
          name: translatedName,
          description: translatedDescription,
        });

      if (error) throw error;
      await loadTranslations();
    } catch (error) {
      console.error('Translation error:', error);
      alert('Failed to translate. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const deleteTranslation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;

    const { error } = await supabase
      .from('item_translations')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadTranslations();
    }
  };

  const startEdit = (translation: Translation) => {
    setEditingId(translation.id);
    setEditName(translation.name);
    setEditDescription(translation.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('item_translations')
      .update({
        name: editName,
        description: editDescription || null,
      })
      .eq('id', id);

    if (!error) {
      await loadTranslations();
      cancelEdit();
    }
  };

  const missingLanguages = availableLanguages.filter(
    lang => !translations.some(t => t.language_code === lang)
  );

  if (loading) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="space-y-2">
        {translations.map((translation) => {
          const lang = LANGUAGES.find(l => l.code === translation.language_code);
          const isEditing = editingId === translation.id;

          return (
            <div
              key={translation.id}
              className="flex items-start gap-2 p-2 bg-gray-50 rounded"
            >
              <span className="text-base mt-0.5">{lang?.flag}</span>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Name"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Description (optional)"
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-xs text-gray-900">{translation.name}</div>
                    {translation.description && (
                      <div className="text-xs text-gray-600 mt-0.5">{translation.description}</div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(translation.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(translation)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTranslation(translation.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {missingLanguages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {missingLanguages.map((langCode) => {
              const lang = LANGUAGES.find(l => l.code === langCode);
              return (
                <button
                  key={langCode}
                  onClick={() => translateContent(langCode)}
                  disabled={translating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-sm">{lang?.flag}</span>
                  {translating && <Loader2 className="w-3 h-3 animate-spin" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
