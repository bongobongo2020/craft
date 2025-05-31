import { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
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

// Local storage key for non-Electron specific settings
const OTHER_SETTINGS_STORAGE_KEY = 'comfyui-other-settings';

function App() {
  const clientRef = useRef<ComfyUIClient | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promptText, setPromptText] = useState('a man playing guitar in the street'); // Renamed to avoid conflict
  const [status, setStatus] = useState<GenerationStatus>({ type: 'idle' });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // For user-initiated settings
  const [showInitialSettingsModal, setShowInitialSettingsModal] = useState(false); // For first-time setup
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  const [currentSettings, setCurrentSettings] = useState<ComfyUISettings>(() => {
    let otherSettings = {};
    try {
      const saved = localStorage.getItem(OTHER_SETTINGS_STORAGE_KEY);
      if (saved) {
        otherSettings = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load other settings from localStorage:', error);
    }
    return {
      baseUrl: '', // Will be loaded from electron-store
      wsUrl: import.meta.env.VITE_COMFYUI_WS_URL || 'ws://localhost:8188',
      cfAccessClientId: import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
      cfAccessClientSecret: import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
      useCloudflareAccess: !!(import.meta.env.VITE_CF_ACCESS_CLIENT_ID && import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET),
      ...otherSettings,
    };
  });

  useEffect(() => {
    const initializeApp = async () => {
      if (window.electronAPI) {
        try {
          // In a real scenario, we might want a flag like 'isDefaultUrlConfirmedByUser' in electron-store
          // For now, 'isComfyUIUrlSet' could mean "it's not the compiled-in default" or "user has saved it at least once".
          // Let's assume the default from electron.js is 'http://127.0.0.1:8188'
          const storedUrl = await window.electronAPI.getComfyUIUrl();
          const isSetMeaningfully = storedUrl !== 'http://127.0.0.1:8188'; // A simple heuristic

          console.log('Electron API check: storedUrl', storedUrl, 'isSetMeaningfully', isSetMeaningfully);

          setCurrentSettings(prev => ({ ...prev, baseUrl: storedUrl || 'http://127.0.0.1:8188' }));

          if (!isSetMeaningfully) {
            console.log('Showing initial settings modal because URL is default or not meaningfully set.');
            setShowInitialSettingsModal(true);
          }
        } catch (e) {
          console.error("Error fetching ComfyUI URL from Electron main process:", e);
          toast.error("Configuration Error", { description: "Could not load ComfyUI server configuration." });
          setCurrentSettings(prev => ({ ...prev, baseUrl: 'http://127.0.0.1:8188' }));
          setShowInitialSettingsModal(true);
        }
      } else {
        console.warn('Electron API not found. Using default web settings.');
        const webBaseUrl = import.meta.env.VITE_COMFYUI_BASE_URL || 'http://localhost:8188';
        setCurrentSettings(prev => ({ ...prev, baseUrl: webBaseUrl }));
      }
      setIsInitialCheckDone(true);
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isInitialCheckDone || !currentSettings.baseUrl || showInitialSettingsModal) {
      // Don't initialize client until settings are loaded, confirmed, and initial modal is closed
      if (clientRef.current) { // If modal shown after client was created, disconnect
        console.log('Settings modal is open or initial check not done, disconnecting client if active.');
        clientRef.current.disconnect();
        clientRef.current = null; // Allow re-creation
        setStatus({type: 'idle'});
      }
      return;
    }

    if (!clientRef.current) {
        console.log('🚀 Creating new ComfyUIClient instance with settings:', currentSettings);
        clientRef.current = new ComfyUIClient(currentSettings);
    } else {
        console.log('♻️ Updating ComfyUIClient with new settings:', currentSettings);
        clientRef.current.updateSettings(currentSettings);
    }
      
    clientRef.current.onStatusChange = (newStatus) => {
        setStatus(newStatus);
        if (newStatus.type === 'error' && newStatus.message) {
          toast.error('Error', { description: newStatus.message });
        } else if (newStatus.type === 'completed' && newStatus.message) {
          toast.success('Success', { description: newStatus.message });
        } else if (newStatus.type === 'connected') {
          toast.success('Connected', { description: 'Successfully connected to ComfyUI' });
        }
      };

    clientRef.current.onImageGenerated = (imageUrl) => {
      setGeneratedImage(imageUrl);
    };
    
    // Attempt to connect if settings are valid
    clientRef.current.connect();


    return () => {
      if (clientRef.current) {
        console.log('🧹 Cleaning up ComfyUIClient instance on effect unmount/re-run.');
        clientRef.current.disconnect();
      }
    };
  }, [isInitialCheckDone, currentSettings, showInitialSettingsModal]);


  const handleSettingsChange = async (newSettings: ComfyUISettings) => {
    console.log('⚙️ Settings changed:', newSettings);
    
    if (window.electronAPI) {
      try {
        await window.electronAPI.setComfyUIUrl(newSettings.baseUrl);
        console.log('ComfyUI URL saved via Electron API');
        const { baseUrl, ...otherSettings } = newSettings; // baseUrl is now managed by electron-store
        localStorage.setItem(OTHER_SETTINGS_STORAGE_KEY, JSON.stringify(otherSettings));
      } catch (error) {
        console.error('Failed to save ComfyUI URL via Electron API:', error);
        toast.error('Save Error', { description: 'Could not save ComfyUI server URL.' });
      }
    } else {
      localStorage.setItem(OTHER_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    }
    
    setCurrentSettings(newSettings);
    
    setIsSettingsOpen(false);
    setShowInitialSettingsModal(false); 
    
    toast.success('Settings Updated', { description: 'ComfyUI connection will use new settings.' });
  };

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleGenerate = async () => {
    if (!clientRef.current || !clientRef.current.isConnected()) {
      toast.error('Connection Error', { description: 'ComfyUI client not connected or not initialized.' });
      return;
    }
    if (!selectedFile) {
      toast.error('Missing Image', { description: 'Please upload an image first.' });
      return;
    }
    if (!promptText.trim()) {
      toast.error('Missing Prompt', { description: 'Please enter a text prompt.' });
      return;
    }
    try {
      const imageName = await clientRef.current.uploadImage(selectedFile);
      await clientRef.current.generateImage(promptText, imageName);
    } catch (error) {
      console.error('Generation failed:', error);
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
  const effectiveBaseUrl = currentSettings.baseUrl;
  const isClientConnected = clientRef.current?.isConnected() && (status.type === 'connected' || status.type === 'completed' || status.type === 'generating' || status.type === 'uploading');

  const getConnectionStatusText = (): string => {
    if (!isInitialCheckDone && !showInitialSettingsModal) return "Initializing...";
    if (showInitialSettingsModal) return "Configure Server";
    if (!effectiveBaseUrl) return "Server URL not set";

    switch (status.type) {
      case 'connected':
      case 'completed':
      case 'generating':
      case 'uploading':
        try {
          return `Connected to ${new URL(effectiveBaseUrl).hostname}`;
        } catch { return 'Connected (Invalid URL)'; }
      case 'error': return 'Connection Error';
      case 'idle': return clientRef.current?.getSettings().baseUrl ? 'Connecting...' : 'Server URL not set';
      default: return 'Disconnected';
    }
  };
  
  const getConnectionIndicatorClass = (): string => {
    if (showInitialSettingsModal || (!isInitialCheckDone && !effectiveBaseUrl)) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (isClientConnected) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (status.type === 'error') return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  };

  const getConnectionDotClass = (): string => {
    if (showInitialSettingsModal || (!isInitialCheckDone && !effectiveBaseUrl)) return 'bg-yellow-400';
    if (isClientConnected) return 'bg-green-400';
    if (status.type === 'error') return 'bg-red-400';
    return 'bg-yellow-400';
  };

  if (!isInitialCheckDone && !showInitialSettingsModal) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="comfyui-theme">
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <div className="text-white text-xl">Loading application settings...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="comfyui-theme">
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex justify-center items-start mb-4 relative">
              <h1 className="text-5xl font-bold text-white">Craft</h1>
              <Button
                onClick={() => { setShowInitialSettingsModal(false); setIsSettingsOpen(true); }}
                variant="secondary" size="sm"
                className="ml-4 mt-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Transform your images with AI-powered creativity. Upload an image, describe your vision, and watch the magic happen.
            </p>
            <div className="mt-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getConnectionIndicatorClass()}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${getConnectionDotClass()}`} />
                {getConnectionStatusText()}
              </div>
            </div>
          </div>

          {!showInitialSettingsModal && isInitialCheckDone && effectiveBaseUrl && (
            <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              <div className="glass rounded-3xl p-8 transition-all duration-300 hover:shadow-xl animate-slide-up">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-pink-400" /> Create Your Vision
                </h2>
                <ImageUpload onImageSelect={handleImageSelect} className="mb-6" />
                <div className="mb-6">
                  <label htmlFor="promptText" className="block text-white/90 text-sm font-medium mb-3">
                    Describe your vision
                  </label>
                  <Textarea
                    id="promptText" value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={4}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400 resize-none"
                    placeholder="a man playing guitar in the street..."
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !isClientConnected || !effectiveBaseUrl}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none h-auto"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {status.type === 'uploading' ? 'Uploading...' : 'Generating...'}
                    </span>
                  ) : !isClientConnected || !effectiveBaseUrl ? (
                    <span className="flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
                      {!effectiveBaseUrl ? "Configure Server" : "Waiting for Connection..."}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Zap className="w-5 h-5 mr-2" /> Generate Image
                    </span>
                  )}
                </Button>
              </div>
              <div className="glass rounded-3xl p-8 transition-all duration-300 hover:shadow-xl animate-slide-up">
                <GenerationPanel status={status} generatedImage={generatedImage} onDownload={handleDownload} />
              </div>
            </div>
          )}
          
          {(showInitialSettingsModal || !effectiveBaseUrl && isInitialCheckDone) && !isSettingsOpen && (
             <div className="flex flex-col items-center justify-center text-white glass rounded-3xl p-8 max-w-md mx-auto">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">ComfyUI Server Configuration Needed</h2>
                <p className="text-center mb-6">Please set the ComfyUI server address in the settings to continue.</p>
                <Button onClick={() => { setShowInitialSettingsModal(false); setIsSettingsOpen(true); }} className="bg-pink-500 hover:bg-pink-600">
                    Open Settings
                </Button>
             </div>
          )}

        </div>
      
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
        currentSettings={currentSettings}
        connectionStatus={getConnectionStatusText()}
        isElectron={!!window.electronAPI}
        isInitialSetup={false} // This panel is for regular settings, not initial setup
      />
      
      <SettingsPanel // This is the one specifically for initial setup
        isOpen={showInitialSettingsModal && !isSettingsOpen} // Only show if regular settings isn't also open
        onClose={() => {
          setShowInitialSettingsModal(false);
          if (!currentSettings.baseUrl) {
             const fallbackUrl = 'http://127.0.0.1:8188';
             console.warn(`Initial settings modal closed without save, ComfyUI URL not set. Setting to ${fallbackUrl}`);
             setCurrentSettings(prev => ({...prev, baseUrl: fallbackUrl }));
          }
        }}
        onSettingsChange={handleSettingsChange}
        currentSettings={currentSettings}
        connectionStatus={getConnectionStatusText()}
        isInitialSetup={true}
        isElectron={!!window.electronAPI}
      />
      
      <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
