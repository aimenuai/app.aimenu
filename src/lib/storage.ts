import { supabase } from './supabase';
import { optimizeMenuItemImage } from './imageOptimization';

export interface UploadedImages {
  photoUrl: string;
  thumbnailUrl: string;
}

export const uploadMenuItemPhoto = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('menu-items')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-items')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
};

export const uploadOptimizedMenuItemPhoto = async (
  file: File,
  userId: string
): Promise<UploadedImages | null> => {
  try {
    const { optimized, thumbnail } = await optimizeMenuItemImage(file);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const optimizedFileName = `${userId}/optimized/${timestamp}-${randomStr}.webp`;
    const thumbnailFileName = `${userId}/thumbnails/${timestamp}-${randomStr}.webp`;

    const [optimizedUpload, thumbnailUpload] = await Promise.all([
      supabase.storage
        .from('menu-items')
        .upload(optimizedFileName, optimized, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp',
        }),
      supabase.storage
        .from('menu-items')
        .upload(thumbnailFileName, thumbnail, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp',
        }),
    ]);

    if (optimizedUpload.error) {
      console.error('Error uploading optimized photo:', optimizedUpload.error);
      return null;
    }

    if (thumbnailUpload.error) {
      console.error('Error uploading thumbnail:', thumbnailUpload.error);
      await supabase.storage.from('menu-items').remove([optimizedFileName]);
      return null;
    }

    const { data: { publicUrl: photoUrl } } = supabase.storage
      .from('menu-items')
      .getPublicUrl(optimizedUpload.data.path);

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('menu-items')
      .getPublicUrl(thumbnailUpload.data.path);

    return { photoUrl, thumbnailUrl };
  } catch (error) {
    console.error('Error uploading optimized menu item photo:', error);
    return null;
  }
};

export const deleteMenuItemPhoto = async (
  photoUrl: string,
  thumbnailUrl?: string | null
): Promise<boolean> => {
  try {
    if (!photoUrl) return true;

    const filesToDelete: string[] = [];

    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/menu-items/');
    if (pathParts.length >= 2) {
      filesToDelete.push(pathParts[1]);
    }

    if (thumbnailUrl) {
      const thumbnailUrlObj = new URL(thumbnailUrl);
      const thumbnailPathParts = thumbnailUrlObj.pathname.split('/menu-items/');
      if (thumbnailPathParts.length >= 2) {
        filesToDelete.push(thumbnailPathParts[1]);
      }
    }

    if (filesToDelete.length === 0) return false;

    const { error } = await supabase.storage
      .from('menu-items')
      .remove(filesToDelete);

    if (error) {
      console.error('Error deleting photos:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting photos:', error);
    return false;
  }
};

export const uploadFile = async (
  file: File,
  bucket: string,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};
