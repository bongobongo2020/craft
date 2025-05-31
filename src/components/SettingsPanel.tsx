import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Save, RotateCcw, Globe, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: ComfyUISettings) => void;
  currentSettings: ComfyUISettings;
  connectionStatus: string; // Changed to string to accept descriptive text
  isElectron?: boolean;
  isInitialSetup?: boolean;
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
  connectionStatus,
  isElectron = false, 
  isInitialSetup = false 
}: SettingsProps) {
  const [settings, setSettings] = useState<ComfyUISettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Update local state when currentSettings prop changes, typically when panel is opened
    // or when currentSettings are updated externally while panel is open (though less common for modals)
    setSettings(currentSettings);
    // Reset hasChanges when panel is opened with fresh currentSettings or currentSettings change
    setHasChanges(false); 
  }, [currentSettings, isOpen]); // Rerun if currentSettings or isOpen changes

  const handleInputChange = (field: keyof ComfyUISettings, value: string | boolean) => {
    const newSettings = { ...settings, [field]: value };
    
    if (field === 'baseUrl' && typeof value === 'string') {
      try {
        const url = new URL(value);
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        // Normalize pathname: remove trailing slashes from the original pathname
        let pathname = url.pathname;
        if (pathname !== '/') { // Avoid replacing a single slash if it's the entire path
          pathname = pathname.replace(/\/+$/, ''); 
        }
        // If, after stripping trailing slashes, the pathname became empty (e.g., from "///"),
        // and the original URL pathname did start with a slash (or was empty, implying root), treat it as root.
        if (pathname === '' && (url.pathname.startsWith('/') || url.pathname === '')) {
            pathname = '/'; // Default to root path
        }

        // Construct the WebSocket path part
        let wsPath;
        if (pathname === '/') {
            // If base URL is root (e.g., http://example.com or http://example.com/)
            // For a root base URL, the WebSocket path is typically also at root or /ws.
            // Given user feedback, for their case, a root base URL means a root WebSocket path.
            wsPath = ''; // Changed from '/ws' to empty string
        } else if (pathname.endsWith('/ws')) {
            // If base URL already specifies a path ending in /ws (e.g., http://example.com/api/ws)
            wsPath = pathname;
        } else {
            // For other paths (e.g., http://example.com/api), append /ws
            wsPath = pathname + '/ws';
        }
        
        newSettings.wsUrl = `${wsProtocol}//${url.host}${wsPath}`;
      } catch (e) {
        // If baseUrl is not a valid URL, wsUrl might become invalid.
        // For simplicity, we'll let it be, user might be typing.
        // Or, clear wsUrl if baseUrl is invalid: newSettings.wsUrl = '';
        console.warn("Invalid base URL, wsUrl might be incorrect.");
        newSettings.wsUrl = ''; // Clear or try to make a best guess
      }
    }
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(settings);
    setHasChanges(false); // Reset after save
  };

  const handleReset = () => {
    const defaultBaseUrl = 'http://localhost:8188';
    const defaultWsUrl = 'ws://localhost:8188/ws'; // Standard local ComfyUI WS path
    
    const defaultSettings: ComfyUISettings = {
      baseUrl: defaultBaseUrl,
      wsUrl: defaultWsUrl,
      cfAccessClientId: '',
      cfAccessClientSecret: '',
      useCloudflareAccess: false
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const getStatusColor = () => {
    const lowerStatus = connectionStatus.toLowerCase();
    if (lowerStatus.includes('connected')) return 'text-green-400';
    if (lowerStatus.includes('connecting') || lowerStatus.includes('initializing') || lowerStatus.includes('configure server')) return 'text-yellow-400';
    if (lowerStatus.includes('error') || lowerStatus.includes('not set') || lowerStatus.includes('invalid url')) return 'text-red-400';
    return 'text-gray-400'; // Disconnected or unknown
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative glass rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SettingsIcon className="w-6 h-6 mr-3 text-pink-400" />
            <h2 className="text-2xl font-bold text-white">
              {isInitialSetup ? 'Initial ComfyUI Setup' : 'ComfyUI Settings'}
            </h2>
          </div>
          <Button onClick={onClose} variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white/90 font-medium">Connection Status</span>
            <div className={`flex items-center ${getStatusColor()}`}>
              <Wifi className="w-4 h-4 mr-2" />
              {connectionStatus}
            </div>
          </div>
        </div>
        
        {isInitialSetup && (
          <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-blue-200 text-sm">
              Please confirm or enter the address of your ComfyUI backend server.
              This is typically <code className="bg-blue-400/20 px-1 py-0.5 rounded">http://127.0.0.1:8188</code> if running locally.
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-400" /> Server Configuration
            </h3>
            <div className="mb-4">
              <label htmlFor="baseUrl" className="block text-white/90 text-sm font-medium mb-2">ComfyUI Base URL</label>
              <Input
                id="baseUrl" type="url" value={settings.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                placeholder={isElectron ? "http://127.0.0.1:8188" : "https://your-comfyui-server.com"}
              />
              <p className="text-white/60 text-xs mt-1">HTTP/HTTPS URL of your ComfyUI server.</p>
            </div>
            <div className="mb-4">
              <label htmlFor="wsUrl" className="block text-white/90 text-sm font-medium mb-2">WebSocket URL</label>
              <Input
                id="wsUrl" type="url" value={settings.wsUrl}
                onChange={(e) => handleInputChange('wsUrl', e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                placeholder={isElectron ? "ws://127.0.0.1:8188/ws" : "wss://your-comfyui-server.com/ws"}
              />
              <p className="text-white/60 text-xs mt-1">WebSocket URL (auto-derived from Base URL if path is `/ws`).</p>
            </div>
          </div>

          {!isElectron && ( // Cloudflare settings only for non-Electron (web)
            <div>
              <div className="flex items-center mb-4">
                <input id="useCloudflareAccess" type="checkbox" checked={settings.useCloudflareAccess}
                  onChange={(e) => handleInputChange('useCloudflareAccess', e.target.checked)}
                  className="mr-3 w-4 h-4 text-pink-600 bg-white/10 border-white/30 rounded focus:ring-pink-500 focus:ring-2"
                />
                <label htmlFor="useCloudflareAccess" className="text-white/90 font-medium">Use Cloudflare Access</label>
              </div>
              {settings.useCloudflareAccess && (
                <div className="space-y-4 ml-7">
                  <div>
                    <label htmlFor="cfClientId" className="block text-white/90 text-sm font-medium mb-2">Client ID</label>
                    <Input id="cfClientId" type="text" value={settings.cfAccessClientId || ''}
                      onChange={(e) => handleInputChange('cfAccessClientId', e.target.value)}
                      className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="Cloudflare Access Client ID"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfClientSecret" className="block text-white/90 text-sm font-medium mb-2">Client Secret</label>
                    <Input id="cfClientSecret" type="password" value={settings.cfAccessClientSecret || ''}
                      onChange={(e) => handleInputChange('cfAccessClientSecret', e.target.value)}
                      className="w-full bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="Cloudflare Access Client Secret"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isElectron && (
             <div>
              <h4 className="text-white/90 font-medium mb-3">Quick Preset</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => {
                    const newBaseUrl = 'http://127.0.0.1:8188';
                    setSettings({
                      ...settings,
                      baseUrl: newBaseUrl,
                      wsUrl: newBaseUrl.replace('http://', 'ws://') + '/ws',
                      useCloudflareAccess: false 
                    });
                    setHasChanges(true);
                  }}
                  variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                > Default Local (127.0.0.1:8188) </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button onClick={handleReset} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges && !isInitialSetup} 
              className={cn(
                "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-medium",
                (!hasChanges && !isInitialSetup) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              {isInitialSetup ? 'Confirm & Save' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-blue-200 text-sm">
            <strong>Note:</strong> {isInitialSetup ? "After saving, the application will attempt to connect." : "Changes will take effect and the connection will be re-established."}
            Ensure your ComfyUI server is running and accessible.
          </p>
        </div>
      </div>
    </div>
  );
}
