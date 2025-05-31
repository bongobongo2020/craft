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
