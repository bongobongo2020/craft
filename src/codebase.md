# App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

# App.tsx

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, Bug, Settings as SettingsIcon } from 'lucide-react';
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

  const handleDebug = async () => {
    if (!clientRef.current) {
      toast.error('Connection Error', {
        description: 'ComfyUI client not initialized',
      });
      return;
    }

    toast.info('Debug Check', {
      description: 'Checking ComfyUI setup - see console for details',
    });
    await clientRef.current.debugComfyUISetup();
  };

  const handleTestSimpleGeneration = async () => {
    if (!clientRef.current) {
      toast.error('Connection Error', {
        description: 'ComfyUI client not initialized',
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
      // Test without uploading an image first (empty string for imageName)
      await clientRef.current.generateImage(prompt, '');
    } catch (error) {
      console.error('Simple generation failed:', error);
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
              ComfyUI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
                DreamO
              </span>
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

            {/* Debug Section */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white/90 font-medium mb-3 flex items-center">
                <Bug className="w-4 h-4 mr-2" />
                Debug Tools
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleDebug}
                  disabled={!clientRef.current}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Check ComfyUI Setup
                </Button>
                <Button
                  onClick={handleTestSimpleGeneration}
                  disabled={isLoading || !clientRef.current}
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
```

# assets/react.svg

This is a file of the type: SVG Image

# components/GenerationPanel.tsx

```tsx
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

```

# components/ImageUpload.tsx

```tsx
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
```

# components/SettingsPanel.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Save, RotateCcw, Globe, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: ComfyUISettings) => void;
  currentSettings: ComfyUISettings;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface ComfyUISettings {
  baseUrl: string;
  wsUrl: string;
  cfAccessClientId?: string;
  cfAccessClientSecret?: string;
  useCloudflareAccess: boolean;
}

export function SettingsPanel({ 
  isOpen, 
  onClose, 
  onSettingsChange, 
  currentSettings,
  connectionStatus 
}: SettingsProps) {
  const [settings, setSettings] = useState<ComfyUISettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
    setHasChanges(false);
  }, [currentSettings, isOpen]);

  const handleInputChange = (field: keyof ComfyUISettings, value: string | boolean) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);

    // Auto-update WebSocket URL when base URL changes
    if (field === 'baseUrl' && typeof value === 'string') {
      const wsUrl = value.replace('http://', 'ws://').replace('https://', 'wss://');
      newSettings.wsUrl = wsUrl;
      setSettings(newSettings);
    }
  };

  const handleSave = () => {
    onSettingsChange(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultSettings: ComfyUISettings = {
      baseUrl: 'http://localhost:8188',
      wsUrl: 'ws://localhost:8188',
      cfAccessClientId: '',
      cfAccessClientSecret: '',
      useCloudflareAccess: false
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'disconnected': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="relative glass rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SettingsIcon className="w-6 h-6 mr-3 text-pink-400" />
            <h2 className="text-2xl font-bold text-white">ComfyUI Settings</h2>
          </div>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white/90 font-medium">Connection Status</span>
            <div className={`flex items-center ${getStatusColor()}`}>
              <Wifi className="w-4 h-4 mr-2" />
              {getStatusText()}
            </div>
          </div>
        </div>

        {/* Server Configuration */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-400" />
              Server Configuration
            </h3>
            
            {/* Base URL */}
            <div className="mb-4">
              <label htmlFor="baseUrl" className="block text-white/90 text-sm font-medium mb-2">
                ComfyUI Base URL
              </label>
              <Input
                id="baseUrl"
                type="url"
                value={settings.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                placeholder="https://your-comfyui-server.com"
              />
              <p className="text-white/60 text-xs mt-1">
                The HTTP/HTTPS URL where your ComfyUI server is running
              </p>
            </div>

            {/* WebSocket URL */}
            <div className="mb-4">
              <label htmlFor="wsUrl" className="block text-white/90 text-sm font-medium mb-2">
                WebSocket URL
              </label>
              <Input
                id="wsUrl"
                type="url"
                value={settings.wsUrl}
                onChange={(e) => handleInputChange('wsUrl', e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                placeholder="wss://your-comfyui-server.com"
              />
              <p className="text-white/60 text-xs mt-1">
                The WebSocket URL for real-time communication (usually same as base URL with ws:// or wss://)
              </p>
            </div>
          </div>

          {/* Cloudflare Access */}
          <div>
            <div className="flex items-center mb-4">
              <input
                id="useCloudflareAccess"
                type="checkbox"
                checked={settings.useCloudflareAccess}
                onChange={(e) => handleInputChange('useCloudflareAccess', e.target.checked)}
                className="mr-3 w-4 h-4 text-pink-600 bg-white/10 border-white/30 rounded focus:ring-pink-500 focus:ring-2"
              />
              <label htmlFor="useCloudflareAccess" className="text-white/90 font-medium">
                Use Cloudflare Access Authentication
              </label>
            </div>

            {settings.useCloudflareAccess && (
              <div className="space-y-4 ml-7">
                <div>
                  <label htmlFor="cfClientId" className="block text-white/90 text-sm font-medium mb-2">
                    Client ID
                  </label>
                  <Input
                    id="cfClientId"
                    type="text"
                    value={settings.cfAccessClientId || ''}
                    onChange={(e) => handleInputChange('cfAccessClientId', e.target.value)}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="your-cloudflare-access-client-id"
                  />
                </div>

                <div>
                  <label htmlFor="cfClientSecret" className="block text-white/90 text-sm font-medium mb-2">
                    Client Secret
                  </label>
                  <Input
                    id="cfClientSecret"
                    type="password"
                    value={settings.cfAccessClientSecret || ''}
                    onChange={(e) => handleInputChange('cfAccessClientSecret', e.target.value)}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="your-cloudflare-access-client-secret"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preset URLs */}
          <div>
            <h4 className="text-white/90 font-medium mb-3">Quick Presets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  setSettings({
                    ...settings,
                    baseUrl: 'http://localhost:8188',
                    wsUrl: 'ws://localhost:8188',
                    useCloudflareAccess: false
                  });
                  setHasChanges(true);
                }}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Local Development
              </Button>
              
              <Button
                onClick={() => {
                  setSettings({
                    ...settings,
                    baseUrl: 'https://craft.jeera.us',
                    wsUrl: 'wss://craft.jeera.us',
                    useCloudflareAccess: true
                  });
                  setHasChanges(true);
                }}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                craft.jeera.us
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button
            onClick={handleReset}
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-medium",
                !hasChanges && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-blue-200 text-sm">
            <strong>Note:</strong> Changes will take effect immediately and the connection will be re-established. 
            Make sure your ComfyUI server is running and accessible at the specified URL.
          </p>
        </div>
      </div>
    </div>
  );
}
```

# components/ui/button.tsx

```tsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

# components/ui/card.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```

# components/ui/input.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```

# components/ui/progress.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}

export { Progress }
```

# components/ui/sonner.tsx

```tsx
import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

```

# components/ui/textarea.tsx

```tsx

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```

# components/ui/theme-provider.tsx

```tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
```

# globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* Tailwind 4 compatible CSS variables */
@theme {
  --color-background: 240 10% 3.9%;
  --color-foreground: 0 0% 98%;
  --color-card: 240 10% 3.9%;
  --color-card-foreground: 0 0% 98%;
  --color-popover: 240 10% 3.9%;
  --color-popover-foreground: 0 0% 98%;
  --color-primary: 0 0% 98%;
  --color-primary-foreground: 240 5.9% 10%;
  --color-secondary: 240 3.7% 15.9%;
  --color-secondary-foreground: 0 0% 98%;
  --color-muted: 240 3.7% 15.9%;
  --color-muted-foreground: 240 5% 64.9%;
  --color-accent: 240 3.7% 15.9%;
  --color-accent-foreground: 0 0% 98%;
  --color-destructive: 0 62.8% 30.6%;
  --color-destructive-foreground: 0 0% 98%;
  --color-border: 240 3.7% 15.9%;
  --color-input: 240 3.7% 15.9%;
  --color-ring: 240 4.9% 83.9%;
  --radius: 0.5rem;
}

/* Light mode overrides */
@media (prefers-color-scheme: light) {
  @theme {
    --color-background: 0 0% 100%;
    --color-foreground: 240 10% 3.9%;
    --color-card: 0 0% 100%;
    --color-card-foreground: 240 10% 3.9%;
    --color-popover: 0 0% 100%;
    --color-popover-foreground: 240 10% 3.9%;
    --color-primary: 240 5.9% 10%;
    --color-primary-foreground: 0 0% 98%;
    --color-secondary: 240 4.8% 95.9%;
    --color-secondary-foreground: 240 5.9% 10%;
    --color-muted: 240 4.8% 95.9%;
    --color-muted-foreground: 240 3.8% 46.1%;
    --color-accent: 240 4.8% 95.9%;
    --color-accent-foreground: 240 5.9% 10%;
    --color-destructive: 0 84.2% 60.2%;
    --color-destructive-foreground: 0 0% 98%;
    --color-border: 240 5.9% 90%;
    --color-input: 240 5.9% 90%;
    --color-ring: 240 10% 3.9%;
  }
}

/* Custom styles for the ComfyUI app */
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.shimmer-effect {
  position: relative;
  overflow: hidden;
}

.shimmer-effect::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

# index.css

```css
@import "tailwindcss";
```

# lib/comfyui-client.ts

```ts
import axios from 'axios';
import type { GenerationStatus } from '@/types';
import type { ComfyUISettings } from '@/components/SettingsPanel';

export class ComfyUIClient {
  private settings: ComfyUISettings;
  private clientId: string;
  private ws: WebSocket | null = null;
  private currentPromptId: string | null = null;
  private headers: Record<string, string>;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number | null = null;
  private isConnecting: boolean = false;
  private isDisconnected: boolean = false;
  
  public onStatusChange?: (status: GenerationStatus) => void;
  public onImageGenerated?: (imageUrl: string) => void;

  constructor(initialSettings?: ComfyUISettings) {
    this.settings = initialSettings || this.getDefaultSettings();
    this.clientId = this.generateClientId();
    this.updateHeaders();
    
    console.log('🔍 Base URL:', this.settings.baseUrl);
    console.log('🔍 WebSocket URL:', this.settings.wsUrl);
    console.log('🔍 Client ID:', this.clientId);
    
    // Connect with initial delay to prevent rapid connections
    setTimeout(() => this.connectWebSocket(), 1000);
  }

  private getDefaultSettings(): ComfyUISettings {
    return {
      baseUrl: import.meta.env.VITE_COMFYUI_BASE_URL || 'http://localhost:8188',
      wsUrl: import.meta.env.VITE_COMFYUI_WS_URL || 'ws://localhost:8188',
      cfAccessClientId: import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
      cfAccessClientSecret: import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
      useCloudflareAccess: !!(import.meta.env.VITE_CF_ACCESS_CLIENT_ID && import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET)
    };
  }

  public updateSettings(newSettings: ComfyUISettings) {
    const settingsChanged = JSON.stringify(this.settings) !== JSON.stringify(newSettings);
    
    if (settingsChanged) {
      console.log('⚙️ Updating ComfyUI settings:', newSettings);
      
      // Disconnect existing connection
      this.disconnect();
      
      // Update settings
      this.settings = { ...newSettings };
      this.updateHeaders();
      
      // Reset connection state
      this.reconnectAttempts = 0;
      this.isDisconnected = false;
      this.isConnecting = false;
      
      // Reconnect with new settings
      setTimeout(() => this.connectWebSocket(), 1000);
    }
  }

  public getCurrentSettings(): ComfyUISettings {
    return { ...this.settings };
  }

  private updateHeaders() {
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Cloudflare headers if enabled and not connecting to local development server
    if (this.settings.useCloudflareAccess && 
        this.settings.cfAccessClientId && 
        this.settings.cfAccessClientSecret && 
        !this.isLocalDevelopment()) {
      this.headers['CF-Access-Client-Id'] = this.settings.cfAccessClientId;
      this.headers['CF-Access-Client-Secret'] = this.settings.cfAccessClientSecret;
    }
  }

  private isLocalDevelopment(): boolean {
    return this.settings.baseUrl.includes('localhost') || 
           this.settings.baseUrl.includes('127.0.0.1') || 
           this.settings.baseUrl.includes('192.168.') || 
           this.settings.baseUrl.includes('10.0.') ||
           this.settings.baseUrl.includes('172.16.');
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private connectWebSocket() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting || this.isDisconnected) {
      console.log('🚫 WebSocket connection attempt prevented (already connecting or disconnected)');
      return;
    }

    // Prevent too many reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🚫 Max reconnection attempts reached');
      this.onStatusChange?.({
        type: 'error',
        message: `Failed to connect to ComfyUI after ${this.maxReconnectAttempts} attempts. Please check your settings and server status.`
      });
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = `${this.settings.wsUrl}/ws?clientId=${this.clientId}`;
      console.log('🔗 Connecting to WebSocket:', wsUrl, `(attempt ${this.reconnectAttempts + 1})`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.onStatusChange?.({ type: 'connected', message: 'Connected to ComfyUI' });
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);
        this.handleWebSocketMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
        this.reconnectAttempts++;
        
        this.onStatusChange?.({
          type: 'error',
          message: `WebSocket connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}). Check server settings and connectivity.`
        });
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        
        if (this.isDisconnected) {
          console.log('🛑 WebSocket was intentionally disconnected');
          return;
        }
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          // Not a normal closure and we haven't exceeded max attempts
          this.onStatusChange?.({
            type: 'error',
            message: `Connection lost. Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
          });
          
          // Clear any existing timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s
          const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts), 48000);
          this.reconnectTimeout = window.setTimeout(() => {
            this.connectWebSocket();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.onStatusChange?.({
            type: 'error',
            message: 'Unable to maintain connection to ComfyUI. Please check your settings and server status.'
          });
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      this.onStatusChange?.({
        type: 'error',
        message: 'Failed to establish WebSocket connection'
      });
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'status':
        console.log('📊 Status update:', data.data);
        break;
      case 'progress':
        if (data.data.prompt_id === this.currentPromptId) {
          const progress = Math.round((data.data.value / data.data.max) * 100);
          this.onStatusChange?.({
            type: 'generating',
            message: `Generating... ${progress}%`
          });
        }
        break;
      case 'executing':
        if (data.data.node === null && data.data.prompt_id === this.currentPromptId) {
          // Execution finished
          console.log('✨ Generation completed, fetching image...');
          this.getGeneratedImage();
        }
        break;
      default:
        console.log('📩 Unknown WebSocket message type:', data.type);
    }
  }

  async uploadImage(file: File): Promise<string> {
    this.onStatusChange?.({ type: 'uploading', message: 'Uploading image...' });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'input');
    formData.append('overwrite', 'true');

    try {
      const uploadHeaders: Record<string, string> = {};
      
      // Add Cloudflare headers for upload if enabled
      if (this.settings.useCloudflareAccess && 
          this.settings.cfAccessClientId && 
          this.settings.cfAccessClientSecret && 
          !this.isLocalDevelopment()) {
        uploadHeaders['CF-Access-Client-Id'] = this.settings.cfAccessClientId;
        uploadHeaders['CF-Access-Client-Secret'] = this.settings.cfAccessClientSecret;
      }

      const uploadUrl = `${this.settings.baseUrl}/upload/image`;
      console.log('📤 Uploading to:', uploadUrl);

      const response = await axios.post(uploadUrl, formData, {
        headers: uploadHeaders,
        timeout: 30000 // 30 second timeout
      });

      console.log('✅ Upload successful:', response.data);
      return response.data.name;
    } catch (error) {
      console.error('❌ Upload error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
        
        let errorMessage = 'Failed to upload image';
        if (error.response?.status === 404) {
          errorMessage = 'ComfyUI server not found. Check your server URL in settings.';
        } else if (error.response?.status === 403) {
          errorMessage = 'Upload forbidden. Check authentication credentials in settings.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to ComfyUI server. Check your server URL in settings.';
        } else if (error.code === 'TIMEOUT') {
          errorMessage = 'Upload timed out. The file might be too large.';
        }
        
        this.onStatusChange?.({
          type: 'error',
          message: errorMessage
        });
      } else {
        this.onStatusChange?.({
          type: 'error',
          message: 'Unknown upload error occurred'
        });
      }
      throw new Error('Failed to upload image');
    }
  }

  async generateImage(prompt: string, imageName: string): Promise<void> {
    this.onStatusChange?.({ type: 'generating', message: 'Preparing generation...' });

    try {
      const workflow = this.createWorkflow(prompt, imageName);
      
      // Log the workflow for debugging
      console.log('🔧 Generated workflow:', JSON.stringify(workflow, null, 2));
      
      const promptUrl = `${this.settings.baseUrl}/prompt`;
      console.log('🎨 Sending prompt to:', promptUrl);
      
      const response = await axios.post(promptUrl, {
        prompt: workflow,
        client_id: this.clientId
      }, {
        headers: this.headers,
        timeout: 30000 // 30 second timeout
      });

      this.currentPromptId = response.data.prompt_id;
      console.log('✅ Prompt queued with ID:', this.currentPromptId);
      
      this.onStatusChange?.({ 
        type: 'generating', 
        message: 'Generation started...' 
      });
    } catch (error) {
      console.error('❌ Generation error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        
        // Parse and display specific error details
        if (error.response?.data?.error) {
          const errorData = error.response.data;
          console.error('🚨 ComfyUI Error Details:');
          console.error('Full Error Object:', JSON.stringify(errorData, null, 2));
          
          let errorMessage = 'Generation failed: ';
          
          // Handle main error
          if (errorData.error) {
            console.error('Main Error:', errorData.error);
            if (typeof errorData.error === 'string') {
              errorMessage += errorData.error;
            } else if (errorData.error.message) {
              errorMessage += errorData.error.message;
            } else {
              errorMessage += JSON.stringify(errorData.error);
            }
          }
          
          // Handle node errors
          if (errorData.node_errors) {
            console.error('Node Errors:', errorData.node_errors);
            const nodeErrors = Object.entries(errorData.node_errors).map(([nodeId, nodeError]: [string, any]) => {
              console.error(`Node ${nodeId} Error:`, nodeError);
              
              let nodeMsg = `Node ${nodeId}`;
              if (nodeError.class_type) {
                nodeMsg += ` (${nodeError.class_type})`;
              }
              
              if (nodeError.errors && Array.isArray(nodeError.errors) && nodeError.errors.length > 0) {
                const errorDetails = nodeError.errors.map((err: any) => {
                  if (typeof err === 'string') return err;
                  if (err.message) return err.message;
                  return JSON.stringify(err);
                }).join(', ');
                nodeMsg += `: ${errorDetails}`;
              } else if (nodeError.message) {
                nodeMsg += `: ${nodeError.message}`;
              } else {
                nodeMsg += ': Unknown error';
              }
              
              return nodeMsg;
            }).join(' | ');
            
            if (nodeErrors) {
              errorMessage += ` | Node Issues: ${nodeErrors}`;
            }
          }
          
          this.onStatusChange?.({
            type: 'error',
            message: errorMessage
          });
          return;
        } else {
          let errorMessage = 'Failed to generate image';
          if (error.response?.status === 404) {
            errorMessage = 'ComfyUI server not found. Check your server URL in settings.';
          } else if (error.response?.status === 403) {
            errorMessage = 'Generation forbidden. Check authentication credentials in settings.';
          } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to ComfyUI server. Check your server URL in settings.';
          } else if (error.code === 'TIMEOUT') {
            errorMessage = 'Generation request timed out.';
          }
          
          this.onStatusChange?.({
            type: 'error',
            message: errorMessage
          });
        }
      } else {
        this.onStatusChange?.({
          type: 'error',
          message: 'Unknown generation error occurred'
        });
      }
      throw error;
    }
  }

  private async getGeneratedImage(): Promise<void> {
    try {
      const historyUrl = `${this.settings.baseUrl}/history/${this.currentPromptId}`;
      console.log('📜 Fetching history from:', historyUrl);
      
      const response = await axios.get(historyUrl, {
        headers: this.headers,
        timeout: 10000 // 10 second timeout
      });
      const history = response.data;
      
      console.log('📊 History response:', history);
      
      const outputs = history[this.currentPromptId!]?.outputs;
      if (outputs && outputs["9"]?.images?.[0]) {
        const imageInfo = outputs["9"].images[0];
        const imageUrl = `${this.settings.baseUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`;
        
        console.log('🖼️ Generated image URL:', imageUrl);
        
        this.onStatusChange?.({ type: 'completed', message: 'Image generated successfully!' });
        this.onImageGenerated?.(imageUrl);
      } else {
        console.error('❌ No image found in outputs:', outputs);
        this.onStatusChange?.({
          type: 'error',
          message: 'Generated image not found in output'
        });
      }
    } catch (error) {
      console.error('❌ Error getting generated image:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      this.onStatusChange?.({
        type: 'error',
        message: 'Failed to retrieve generated image'
      });
    }
  }

  private createWorkflow(prompt: string, imageName: string) {
    // Use the full DreamO workflow based on your working example
    return this.createDreamOWorkflow(prompt, imageName);
  }

  // Minimal workflow for testing - using GGUF loader
  private createMinimalWorkflow(prompt: string) {
    return {
      "39": {
        "inputs": {
          "clip_name1": "t5xxl_fp16.safetensors",
          "clip_name2": "clip_l.safetensors",
          "type": "flux",
          "device": "default"
        },
        "class_type": "DualCLIPLoader"
      },
      "40": {
        "inputs": {
          "vae_name": "ae.sft"
        },
        "class_type": "VAELoader"
      },
      "57": {
        "inputs": {
          "unet_name": "flux1-dev-Q8_0.gguf"
        },
        "class_type": "UnetLoaderGGUF"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["39", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "33": {
        "inputs": {
          "text": "",
          "clip": ["39", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "35": {
        "inputs": {
          "guidance": 3.5,
          "conditioning": ["6", 0]
        },
        "class_type": "FluxGuidance"
      },
      "27": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptySD3LatentImage"
      },
      "31": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": 12,
          "cfg": 1,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["57", 0],
          "positive": ["35", 0],
          "negative": ["33", 0],
          "latent_image": ["27", 0]
        },
        "class_type": "KSampler"
      },
      "8": {
        "inputs": {
          "samples": ["31", 0],
          "vae": ["40", 0]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  // Full DreamO workflow based on your working example
  private createDreamOWorkflow(prompt: string, imageName: string) {
    return {
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["39", 0]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Positive Prompt)"
        }
      },
      "8": {
        "inputs": {
          "samples": ["31", 0],
          "vae": ["40", 0]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      },
      "27": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptySD3LatentImage",
        "_meta": {
          "title": "EmptySD3LatentImage"
        }
      },
      "31": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": 12,
          "cfg": 1,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["50", 0],
          "positive": ["35", 0],
          "negative": ["33", 0],
          "latent_image": ["27", 0]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "33": {
        "inputs": {
          "text": "",
          "clip": ["39", 0]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative Prompt)"
        }
      },
      "35": {
        "inputs": {
          "guidance": 3.5,
          "conditioning": ["6", 0]
        },
        "class_type": "FluxGuidance",
        "_meta": {
          "title": "FluxGuidance"
        }
      },
      "39": {
        "inputs": {
          "clip_name1": "t5xxl_fp16.safetensors",
          "clip_name2": "clip_l.safetensors",
          "type": "flux",
          "device": "default"
        },
        "class_type": "DualCLIPLoader",
        "_meta": {
          "title": "DualCLIPLoader"
        }
      },
      "40": {
        "inputs": {
          "vae_name": "ae.sft"
        },
        "class_type": "VAELoader",
        "_meta": {
          "title": "Load VAE"
        }
      },
      "41": {
        "inputs": {
          "lora_name": "flux-turbo.safetensors",
          "strength_model": 1,
          "model": ["57", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {
          "title": "LoraLoaderModelOnly"
        }
      },
      "42": {
        "inputs": {
          "lora_name": "dreamo_comfyui.safetensors",
          "strength_model": 1,
          "model": ["41", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {
          "title": "LoraLoaderModelOnly"
        }
      },
      "43": {
        "inputs": {
          "lora_name": "dreamo_cfg_distill_comfyui.safetensors",
          "strength_model": 1,
          "model": ["42", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {
          "title": "LoraLoaderModelOnly"
        }
      },
      "44": {
        "inputs": {
          "lora_name": "dreamo_quality_lora_pos_comfyui.safetensors",
          "strength_model": 0.15,
          "model": ["43", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {
          "title": "LoraLoaderModelOnly"
        }
      },
      "45": {
        "inputs": {
          "lora_name": "dreamo_quality_lora_neg_comfyui.safetensors",
          "strength_model": -0.8,
          "model": ["44", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {
          "title": "LoraLoaderModelOnly"
        }
      },
      "46": {
        "inputs": {},
        "class_type": "DreamOProcessorLoader",
        "_meta": {
          "title": "DreamO Processor Loader"
        }
      },
      "50": {
        "inputs": {
          "model": ["45", 0],
          "ref1": imageName ? ["55", 0] : null
        },
        "class_type": "ApplyDreamO",
        "_meta": {
          "title": "Apply DreamO"
        }
      },
      ...(imageName ? {
        "52": {
          "inputs": {
            "image": imageName
          },
          "class_type": "LoadImage",
          "_meta": {
            "title": "Load Image"
          }
        },
        "55": {
          "inputs": {
            "ref_task": "ip",
            "pixels": ["52", 0],
            "vae": ["40", 0],
            "dreamo_processor": ["46", 0]
          },
          "class_type": "DreamORefEncode",
          "_meta": {
            "title": "DreamO Ref Image Encode"
          }
        },
        "56": {
          "inputs": {
            "images": ["55", 1]
          },
          "class_type": "PreviewImage",
          "_meta": {
            "title": "Preview Image"
          }
        }
      } : {}),
      "57": {
        "inputs": {
          "unet_name": "flux1-dev-Q8_0.gguf"
        },
        "class_type": "UnetLoaderGGUF",
        "_meta": {
          "title": "Unet Loader (GGUF)"
        }
      }
    };
  }

  // Debug method to check what's available on your ComfyUI instance
  async debugComfyUISetup(): Promise<void> {
    try {
      console.log('🔍 Checking ComfyUI setup...');
      console.log('📡 Current settings:', this.settings);
      
      // First, check if we can reach the server at all
      try {
        const healthUrl = `${this.settings.baseUrl}/system_stats`;
        console.log('🏥 Checking server health:', healthUrl);
        const healthResponse = await axios.get(healthUrl, { 
          headers: this.headers,
          timeout: 5000
        });
        console.log('✅ Server is reachable. System stats:', healthResponse.data);
      } catch (healthError) {
        console.error('❌ Cannot reach ComfyUI server:', healthError);
        if (axios.isAxiosError(healthError)) {
          if (healthError.code === 'ECONNREFUSED') {
            console.error('🔥 Connection refused - ComfyUI is not running on the specified URL');
          } else if (healthError.response?.status === 404) {
            console.error('🔥 404 - The /system_stats endpoint is not available, but server might be running');
          }
        }
      }
      
      // Check object info (available nodes)
      try {
        const objectInfoUrl = `${this.settings.baseUrl}/object_info`;
        const objectInfoResponse = await axios.get(objectInfoUrl, { 
          headers: this.headers,
          timeout: 10000
        });
        console.log('📋 Available Node Types:', Object.keys(objectInfoResponse.data).sort());
        
        // Check for specific nodes we need
        const requiredNodes = ['CheckpointLoaderSimple', 'CLIPTextEncode', 'KSampler', 'EmptyLatentImage', 'VAEDecode', 'SaveImage'];
        const dreamONodes = ['DreamOProcessorLoader', 'ApplyDreamO', 'DreamORefEncode', 'FluxGuidance', 'UNETLoader', 'DualCLIPLoader'];
        
        console.log('✅ Basic Nodes Available:', requiredNodes.filter(node => node in objectInfoResponse.data));
        console.log('🎨 DreamO Nodes Available:', dreamONodes.filter(node => node in objectInfoResponse.data));
        console.log('❌ Missing Nodes:', [...requiredNodes, ...dreamONodes].filter(node => !(node in objectInfoResponse.data)));
      } catch (err) {
        console.error('❌ Failed to get object info:', err);
      }
      
      // Check queue status
      try {
        const queueUrl = `${this.settings.baseUrl}/queue`;
        const queueResponse = await axios.get(queueUrl, { 
          headers: this.headers,
          timeout: 5000
        });
        console.log('🎯 Queue Status:', queueResponse.data);
      } catch (err) {
        console.log('ℹ️ Could not fetch queue status (this is normal for some setups)');
      }
      
    } catch (error) {
      console.error('❌ Debug check failed:', error);
    }
  }

  disconnect() {
    this.isDisconnected = true;
    
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect'); // Normal closure
      this.ws = null;
    }
  }
}
        
```

# lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

# main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

# types/env.d.ts

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMFYUI_BASE_URL: string
  readonly VITE_COMFYUI_WS_URL: string
  readonly VITE_CF_ACCESS_CLIENT_ID: string
  readonly VITE_CF_ACCESS_CLIENT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

# types/index.ts

```ts

export interface GenerationStatus {
  type: 'idle' | 'uploading' | 'generating' | 'completed' | 'error' | 'connected';
  message?: string;
}

```

# vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

