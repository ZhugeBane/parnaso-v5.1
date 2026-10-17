import React, { useRef, useState } from 'react';
import { resizeImageToBase64 } from '../../utils/imageProcessor';

interface ImagePickerProps {
  currentImage?: string | null;
  onImageSelected: (base64: string) => void | Promise<void>;
  onImageRemoved?: () => void;
  label?: string;
  shape?: 'circle' | 'rounded';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  fallbackColor?: string;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  currentImage,
  onImageSelected,
  onImageRemoved,
  label,
  shape = 'circle',
  size = 'md',
  fallbackText,
  fallbackColor = '#14b8a6',
  disabled = false,
  helperText = 'Redimensionado automaticamente para 200x200 (JPEG 0.7)',
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-28 h-28 text-3xl',
    xl: 'w-36 h-36 text-4xl'
  }[size];

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    // Reset input value so re-selecting the same file triggers change
    e.target.value = '';

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // HTML5 Canvas 200x200 JPEG quality 0.7
      const base64 = await resizeImageToBase64(file, 200, 200, 0.7);
      await onImageSelected(base64);
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
      setErrorMsg('Não foi possível processar a imagem. Tente outro arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex flex-col items-center sm:items-start gap-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="flex items-center gap-4">
        {/* Image Preview & Clickable Container */}
        <div
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
          className={`relative group ${sizeClasses} ${roundedClass} flex-shrink-0 cursor-pointer overflow-hidden border-2 border-slate-200/80 bg-slate-100 shadow-sm transition-all hover:border-teal-400 hover:shadow-md ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title={disabled ? undefined : 'Clique para escolher ou alterar a imagem'}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt="Preview"
              className={`w-full h-full object-cover ${roundedClass} ${isProcessing ? 'opacity-40' : ''}`}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center font-black text-white ${roundedClass}`}
              style={{ backgroundColor: fallbackColor }}
            >
              {fallbackText?.trim().charAt(0).toUpperCase() || '📷'}
            </div>
          )}

          {/* Hover Overlay with Camera Icon */}
          {!disabled && !isProcessing && (
            <div className={`absolute inset-0 bg-slate-900/40 ${roundedClass} opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}

          {/* Processing Loading Spinner */}
          {isProcessing && (
            <div className={`absolute inset-0 bg-white/70 ${roundedClass} flex items-center justify-center`}>
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={disabled || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{isProcessing ? 'Processando...' : currentImage ? 'Alterar Imagem' : 'Escolher Imagem'}</span>
            </button>

            {currentImage && onImageRemoved && !disabled && (
              <button
                type="button"
                onClick={onImageRemoved}
                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Remover
              </button>
            )}
          </div>

          {helperText && (
            <p className="text-[11px] text-slate-400 leading-tight">
              {helperText}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-500 font-medium">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
