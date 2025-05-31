import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // Assuming you have a Label component - Removed
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentBaseUrl: string;
  onSaveBaseUrl: (newUrl: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  currentBaseUrl,
  onSaveBaseUrl,
}) => {
  const [baseUrlInput, setBaseUrlInput] = useState(currentBaseUrl);

  useEffect(() => {
    setBaseUrlInput(currentBaseUrl);
  }, [currentBaseUrl, isOpen]);

  const handleSave = () => {
    onSaveBaseUrl(baseUrlInput);
    onClose(); // Optionally close panel on save
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="comfyui-base-url" className="block text-sm font-medium text-gray-300">
                ComfyUI Base URL
              </label>
              <Input
                id="comfyui-base-url"
                type="text"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder="e.g., http://localhost:8188"
                className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-pink-500 focus:border-pink-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                The address of your ComfyUI server.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
