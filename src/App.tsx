import { useState, useEffect, useCallback } from 'react';
import { Zap, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ImageUpload } from '@/components/ImageUpload';
import { GenerationPanel } from '@/components/GenerationPanel';
import { ComfyUIClient } from '@/lib/comfyui-client';
import type { GenerationStatus } from '@/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ui/theme-provider'; // Corrected path
import './globals.css';

const DEFAULT_COMFY_BASE_URL = 'http://localhost:8188';
const COMFY_BASE_URL_STORAGE_KEY = 'comfyui_base_url';

function App() {
  const [comfyBaseUrl, setComfyBaseUrl] = useState<string>(() => {
    return localStorage.getItem(COMFY_BASE_URL_STORAGE_KEY) || DEFAULT_COMFY_BASE_URL;
  });
  const [client, setClient] = useState<ComfyUIClient | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('a man playing guitar in the street');
  const [status, setStatus] = useState<GenerationStatus>({ type: 'idle' });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  useEffect(() => {
    if (client) {
      client.disconnect();
    }

    console.log(`Initializing ComfyUIClient with base URL: ${comfyBaseUrl}`);
    const newClient = new ComfyUIClient(comfyBaseUrl);
    setClient(newClient);

    newClient.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      if (newStatus.type === 'error' && newStatus.message) {
        toast.error('Error', { description: newStatus.message });
      } else if (newStatus.type === 'completed' && newStatus.message) {
        toast.success('Success', { description: newStatus.message });
      }
    };

    newClient.onImageGenerated = (imageUrl) => {
      setGeneratedImage(imageUrl);
    };

    return () => {
      console.log('Disconnecting ComfyUIClient');
      newClient.disconnect();
    };
  }, [comfyBaseUrl]);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleSaveBaseUrl = (newUrl: string) => {
    localStorage.setItem(COMFY_BASE_URL_STORAGE_KEY, newUrl);
    setComfyBaseUrl(newUrl);
    toast.success('Settings Saved', {
      description: `ComfyUI Base URL updated to: ${newUrl}`,
    });
  };

  const handleGenerate = async () => {
    if (!client) {
      toast.error('Client Error', { description: 'ComfyUI client not initialized.' });
      return;
    }
    if (!selectedFile) {
      toast.error('Missing Image', {
        description: 'Please upload an image first',
      });
      return;
    }

    if (!prompt.trim()) {
      toast.error('Missing Prompt', {
        description: 'Please enter a text prompt',
      });
      return;
    }

    try {
      const imageName = await client.uploadImage(selectedFile);
      await client.generateImage(prompt, imageName);
    } catch (error) {
      console.error('Generation failed:', error);
      // Status will be updated by client.onStatusChange
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const a = document.createElement('a');
      a.href = generatedImage;
      a.download = 'generated-image.png';
      a.click();
    }
  };

  const isLoading = status.type === 'uploading' || status.type === 'generating';

  return (
    <ThemeProvider defaultTheme="dark" storageKey="comfyui-theme">
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in relative">
            <h1 className="text-5xl font-bold text-white mb-4">
              ComfyUI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
                DreamO
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Transform your images with AI-powered creativity. Upload an image, describe your vision, and watch the magic happen.
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsPanelOpen(true)}
              className="absolute top-0 right-0 text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Open settings"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Panel */}
          <div className="glass rounded-3xl p-8 transition-all duration-300 hover:shadow-xl animate-slide-up">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-pink-400" />
              Create Your Vision
            </h2>

            {/* Image Upload */}
            <ImageUpload onImageSelect={handleImageSelect} className="mb-6" />

            {/* Text Prompt */}
            <div className="mb-6">
              <label htmlFor="prompt" className="block text-white/90 text-sm font-medium mb-3">
                Describe your vision
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400 resize-none"
                placeholder="a man playing guitar in the street..."
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none h-auto"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {status.type === 'uploading' ? 'Uploading...' : 'Generating...'}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Generate Image
                </span>
              )}
            </Button>
          </div>

          {/* Output Panel */}
          <div className="glass rounded-3xl p-8 transition-all duration-300 hover:shadow-xl animate-slide-up">
            <GenerationPanel
              status={status}
              generatedImage={generatedImage}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </div>
      <Toaster richColors />
      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        currentBaseUrl={comfyBaseUrl}
        onSaveBaseUrl={handleSaveBaseUrl}
      />
      </div>
    </ThemeProvider>
  );
}

export default App;
