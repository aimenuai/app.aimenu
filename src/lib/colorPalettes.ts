export const COLOR_PALETTES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#d97706',
      background: '#f9fafb',
      text: '#111827'
    }
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    colors: {
      primary: '#7c3aed',
      secondary: '#a78bfa',
      accent: '#ec4899',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  fresh: {
    id: 'fresh',
    name: 'Fresh',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    colors: {
      primary: '#dc2626',
      secondary: '#f87171',
      accent: '#fb923c',
      background: '#fffbeb',
      text: '#991b1b'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0891b2',
      secondary: '#06b6d4',
      accent: '#3b82f6',
      background: '#f0fdfa',
      text: '#134e4a'
    }
  }
};

export type ColorPaletteId = keyof typeof COLOR_PALETTES;

export const getColorPalette = (paletteId: string | null) => {
  if (!paletteId || !(paletteId in COLOR_PALETTES)) {
    return COLOR_PALETTES.classic;
  }
  return COLOR_PALETTES[paletteId as ColorPaletteId];
};
