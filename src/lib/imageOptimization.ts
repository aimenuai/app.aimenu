import imageCompression from 'browser-image-compression';

export interface OptimizedImages {
  optimized: File;
  thumbnail: File;
}

export const resizeAndConvertToWebP = async (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.85
): Promise<File> => {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: quality,
    };

    const compressedFile = await imageCompression(file, options);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const img = await createImageBitmap(compressedFile);

    const sourceRatio = img.width / img.height;
    const targetRatio = maxWidth / maxHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = img.width;
    let sourceHeight = img.height;

    if (sourceRatio > targetRatio) {
      sourceWidth = img.height * targetRatio;
      sourceX = (img.width - sourceWidth) / 2;
    } else {
      sourceHeight = img.width / targetRatio;
      sourceY = (img.height - sourceHeight) / 2;
    }

    canvas.width = maxWidth;
    canvas.height = maxHeight;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      maxWidth,
      maxHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
          });
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    });
  } catch (error) {
    console.error('Error in resizeAndConvertToWebP:', error);
    throw error;
  }
};

export const generateThumbnail = async (file: File): Promise<File> => {
  return resizeAndConvertToWebP(file, 80, 80, 0.75);
};

export const generateOptimizedImage = async (file: File): Promise<File> => {
  return resizeAndConvertToWebP(file, 300, 300, 0.85);
};

export const optimizeMenuItemImage = async (file: File): Promise<OptimizedImages> => {
  try {
    const [optimized, thumbnail] = await Promise.all([
      generateOptimizedImage(file),
      generateThumbnail(file),
    ]);

    return { optimized, thumbnail };
  } catch (error) {
    console.error('Error optimizing menu item image:', error);
    throw error;
  }
};
