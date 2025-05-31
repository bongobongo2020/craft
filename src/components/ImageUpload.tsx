import React, { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  className?: string;
}

export function ImageUpload({ onImageSelect, className }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);

    onImageSelect(file);
  }, [onImageSelect]);

  const clearImage = useCallback(() => {
    setPreview(null);
    setFileName('');
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-medium text-white/90">
        Reference Image
      </label>
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer",
          "bg-white/5 hover:bg-white/10",
          dragActive 
            ? "border-pink-400 bg-white/10" 
            : "border-white/30 hover:border-pink-400"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-48 mx-auto rounded-lg shadow-lg"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors duration-200"
            >
              <X size={16} />
            </button>
            <p className="text-white/80 mt-2 text-sm">{fileName}</p>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-12 w-12 text-white/60 mb-4" />
            <p className="text-white/80 mb-2">
              Drop your image here, or{' '}
              <span className="text-pink-400 font-medium">browse</span>
            </p>
            <p className="text-white/60 text-sm">PNG, JPG up to 10MB</p>
          </div>
        )}
      </div>
      
      <input
        id="fileInput"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}