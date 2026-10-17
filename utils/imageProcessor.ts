
/**
 * Utility to compress and resize images on the client side before uploading to storage.
 * This helps reduce bandwidth usage and ensures compatibility with storage limits.
 */

export const compressImage = (
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * HTML5 Canvas Image Resizer
 * Resizes and crops an image on the frontend to exactly 200x200 pixels in JPEG format with quality 0.7.
 * Converts and returns the result as a Base64 string ('data:image/jpeg;base64,...').
 * 
 * Perfect for Firestore storage (lightweight ~6-12KB) and instant local rendering without Storage bucket latency.
 */
export const resizeImageToBase64 = (
  file: File | Blob,
  targetWidth: number = 200,
  targetHeight: number = 200,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get HTML5 Canvas 2D context'));
          return;
        }

        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background for PNG/WebP alpha transparency conversion to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Center cover crop calculations
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const sourceAspect = sourceWidth / sourceHeight;
        const targetAspect = targetWidth / targetHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = sourceWidth;
        let sHeight = sourceHeight;

        if (sourceAspect > targetAspect) {
          // Wider: crop sides
          sWidth = sourceHeight * targetAspect;
          sx = (sourceWidth - sWidth) / 2;
        } else {
          // Taller: crop top & bottom
          sHeight = sourceWidth / targetAspect;
          sy = (sourceHeight - sHeight) / 2;
        }

        // Draw cropped and centered image onto the 200x200 canvas
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        // Convert to Base64 JPEG with requested 0.7 quality
        try {
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        } catch (conversionErr) {
          reject(conversionErr);
        }
      };
      img.onerror = (err) => reject(new Error('Falha ao carregar a imagem selecionada: ' + err));
    };
    reader.onerror = (err) => reject(new Error('Falha ao ler o arquivo de imagem: ' + err));
  });
};

