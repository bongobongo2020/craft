import { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { GenerationPanel } from '@/components/GenerationPanel';
import { SettingsPanel, type ComfyUISettings } from '@/components/SettingsPanel';
import { ComfyUIClient } from '@/lib/comfyui-client';
import type { GenerationStatus } from '@/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components//ui/theme-provider';
import './globals.css';

// Local storage key for settings persistence
const SETTINGS_STORAGE_KEY = 'comfyui-settings';

function App() {
  // Use useRef to persist the client instance across re-renders
  const clientRef = useRef<ComfyUIClient | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('a man playing guitar in the street');
  const [status, setStatus] = useState<GenerationStatus>({ type: 'idle' });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<ComfyUISettings>(() => {
    // Load settings from localStorage or use defaults
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    
    // Return default settings
    return {
      baseUrl: import.meta.env.VITE_COMFYUI_BASE_URL || 'http://localhost:8188',
      wsUrl: import.meta.env.VITE_COMFYUI_WS_URL || 'ws://localhost:8188',
      cfAccessClientId: import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
      cfAccessClientSecret: import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
      useCloudflareAccess: !!(import.meta.env.VITE_CF_ACCESS_CLIENT_ID && import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET)
    };
  });

  useEffect(() => {
    // Only create client if it doesn't exist
    if (!clientRef.current) {
      console.log('🚀 Creating new ComfyUIClient instance');
      clientRef.current = new ComfyUIClient(currentSettings);
      
      clientRef.current.onStatusChange = (newStatus) => {
        setStatus(newStatus);
        
        if (newStatus.type === 'error' && newStatus.message) {
          toast.error('Error', {
            description: newStatus.message,
          });
        } else if (newStatus.type === 'completed' && newStatus.message) {
          toast.success('Success', {
            description: newStatus.message,
          });
        } else if (newStatus.type === 'connected') {
          toast.success('Connected', {
            description: 'Successfully connected to ComfyUI',
          });
        }
      };

      clientRef.current.onImageGenerated = (imageUrl) => {
        setGeneratedImage(imageUrl);
      };
    }

    // Cleanup function
    return () => {
      if (clientRef.current) {
        console.log('🧹 Cleaning up ComfyUIClient instance');
        clientRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array ensures this only runs once

  const handleSettingsChange = (newSettings: ComfyUISettings) => {
    console.log('⚙️ Settings changed:', newSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      toast.error('Storage Error', {
        description: 'Could not save settings. Changes may not persist.',
      });
    }
    
    // Update current settings
    setCurrentSettings(newSettings);
    
    // Update client with new settings
    if (clientRef.current) {
      clientRef.current.updateSettings(newSettings);
    }
    
    // Close settings panel
    setIsSettingsOpen(false);
    
    toast.success('Settings Updated', {
      description: 'Connection will be re-established with new settings',
    });
  };

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleGenerate = async () => {
    if (!clientRef.current) {
      toast.error('Connection Error', {
        description: 'ComfyUI client not initialized',
      });
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
      const imageName = await clientRef.current.uploadImage(selectedFile);
      await clientRef.current.generateImage(prompt, imageName);
    } catch (error) {
      console.error('Generation failed:', error);
      // Error handling is done in the client's onStatusChange callback
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
  const isConnected = status.type === 'connected' || status.type === 'completed' || status.type === 'generating' || status.type === 'uploading';

  const getConnectionStatus = (): 'connected' | 'connecting' | 'disconnected' | 'error' => {
    switch (status.type) {
      case 'connected':
      case 'completed':
      case 'generating':
      case 'uploading':
        return 'connected';
      case 'error':
        return 'error';
      case 'idle':
        return 'connecting';
      default:
        return 'disconnected';
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="comfyui-theme">
      <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center items-start mb-4 relative">
            <h1 className="text-5xl font-bold text-white">
              Craft
            </h1>
            
            {/* Settings Button */}
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="secondary"
              size="sm"
              className="ml-4 mt-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Transform your images with AI-powered creativity. Upload an image, describe your vision, and watch the magic happen.
          </p>
          
          {/* Connection Status Indicator */}
          <div className="mt-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : status.type === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-400' : status.type === 'error' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
              {isConnected ? `Connected to ${new URL(currentSettings.baseUrl).hostname}` : status.type === 'error' ? 'Connection Error' : 'Connecting...'}
            </div>
          </div>
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
              disabled={isLoading || !isConnected}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none h-auto"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {status.type === 'uploading' ? 'Uploading...' : 'Generating...'}
                </span>
              ) : !isConnected ? (
                <span className="flex items-center justify-center">
                  <div className="animate-pulse rounded-full h-5 w-5 bg-white/50 mr-2"></div>
                  Waiting for Connection...
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
      
      {/* Settings Modal */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
        currentSettings={currentSettings}
        connectionStatus={getConnectionStatus()}
      />
      
      <Toaster />
        </div>
    </ThemeProvider>
  );
}

export default App;
