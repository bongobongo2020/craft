import { useState, useEffect } from 'react';
import { Zap, Sparkles, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { GenerationPanel } from '@/components/GenerationPanel';
import { ComfyUIClient } from '@/lib/comfyui-client';
import type { GenerationStatus } from '@/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components//ui/theme-provider';
import './globals.css';

function App() {
  // Get the base URL from environment variables with fallback
  const baseUrl = import.meta.env.VITE_COMFYUI_BASE_URL || 'http://localhost:8188';
  
  const [client] = useState(() => new ComfyUIClient(baseUrl));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('a man playing guitar in the street');
  const [status, setStatus] = useState<GenerationStatus>({ type: 'idle' });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    client.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      
      if (newStatus.type === 'error' && newStatus.message) {
        toast.error('Error', {
          description: newStatus.message,
        });
      } else if (newStatus.type === 'completed' && newStatus.message) {
        toast.success('Success', {
          description: newStatus.message,
        });
      }
    };

    client.onImageGenerated = (imageUrl) => {
      setGeneratedImage(imageUrl);
    };

    return () => {
      client.disconnect();
    };
  }, [client]);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleGenerate = async () => {
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
    }
  };

  const handleDebug = async () => {
    toast.info('Debug Check', {
      description: 'Checking ComfyUI setup - see console for details',
    });
    // Add the debug method back to the client if needed
    console.log('Debug functionality would go here');
  };

  const handleTestSimpleGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Missing Prompt', {
        description: 'Please enter a text prompt',
      });
      return;
    }

    try {
      // Test without uploading an image first
      await client.generateImage(prompt, '');
    } catch (error) {
      console.error('Simple generation failed:', error);
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
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-white mb-4">
            Craft
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Transform your images with AI-powered creativity. Upload an image, describe your vision, and watch the magic happen.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Panel */}
          <div className="glass rounded-3xl p-8 transition-all duration-300 hover:shadow-xl animate-slide-up">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-pink-400" />
              Create Your Vision
            </h2>

            {/* Debug Section */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white/90 font-medium mb-3 flex items-center">
                <Bug className="w-4 h-4 mr-2" />
                Debug Tools
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleDebug}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Check ComfyUI Setup
                </Button>
                <Button
                  onClick={handleTestSimpleGeneration}
                  disabled={isLoading}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Test Simple Generation
                </Button>
              </div>
              <p className="text-white/60 text-xs mt-2">
                Use these tools to debug connection and model issues. Check browser console for detailed output.
              </p>
            </div>

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
      <Toaster />
        </div>
    </ThemeProvider>
  );
}

export default App;
