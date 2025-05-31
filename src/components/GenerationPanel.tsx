import { Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GenerationStatus } from '@/types';

interface GenerationPanelProps {
  status: GenerationStatus;
  generatedImage: string | null;
  onDownload?: () => void;
  className?: string;
}

export function GenerationPanel({ 
  status, 
  generatedImage, 
  onDownload, 
  className 
}: GenerationPanelProps) {
  const isLoading = status.type === 'uploading' || status.type === 'generating';

  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-2xl font-bold text-white flex items-center">
        <Sparkles className="w-6 h-6 mr-2 text-yellow-400" />
        Generated Result
      </h2>

      <div className="relative">
        {/* Placeholder */}
        {!generatedImage && !isLoading && (
          <div className="flex flex-col items-center justify-center h-96 bg-white/5 rounded-xl border-2 border-dashed border-white/20">
            <ImageIcon className="h-16 w-16 text-white/40 mb-4" />
            <p className="text-white/60 text-lg">Your generated image will appear here</p>
            <p className="text-white/40 text-sm mt-2">Upload an image and add a prompt to get started</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="h-96 bg-white/5 rounded-xl flex items-center justify-center shimmer-effect">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <Sparkles className="h-16 w-16 text-pink-400 mx-auto animate-spin" />
              </div>
              <p className="text-white text-lg font-medium">
                {status.type === 'uploading' ? 'Uploading image...' : 'Creating your image...'}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {status.message || 'This may take a few moments'}
              </p>
            </div>
          </div>
        )}

        {/* Result Image */}
        {generatedImage && (
          <div className="animate-fade-in">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full rounded-xl shadow-2xl"
            />
            <div className="mt-4 flex justify-between items-center">
              <p className="text-white/80 text-sm">Generation complete!</p>
              {onDownload && (
                <Button 
                  onClick={onDownload}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
