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
import React, { useState, useEffect } from 'react';
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
  const [client] = useState(() => new ComfyUIClient());
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
    await (client as any).debugComfyUISetup?.();
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
            ComfyUI{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
              DreamO
            </span>
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
```

# assets/react.svg

This is a file of the type: SVG Image

# components/GenerationPanel.tsx

```tsx
import React from 'react';
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
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

```

# components/ui/sonner.tsx

```tsx
import { useTheme } from "@/components/ui/theme-provider"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
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
```

# index.css

```css
@import "tailwindcss";
```

# lib/comfyui-client.ts

```ts

import axios from 'axios';
import type { GenerationStatus } from '@/types';

export class ComfyUIClient {
  private baseUrl: string;
  private wsUrl: string;
  private clientId: string;
  private ws: WebSocket | null = null;
  private currentPromptId: string | null = null;
  private headers: Record<string, string>;
  
  public onStatusChange?: (status: GenerationStatus) => void;
  public onImageGenerated?: (imageUrl: string) => void;

  constructor() {
    // Get URLs from environment variables with fallbacks
    const rawBaseUrl = import.meta.env.VITE_COMFYUI_BASE_URL || 'http://localhost:8188';
    const rawWsUrl = import.meta.env.VITE_COMFYUI_WS_URL || 'ws://localhost:8188';
    
    // Clean URLs by removing trailing slashes
    this.baseUrl = rawBaseUrl.replace(/\/+$/, '');
    this.wsUrl = rawWsUrl.replace(/\/+$/, '');
    
    this.clientId = this.generateClientId();
    
    // Set up headers with Cloudflare Access if credentials are provided
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    const cfClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID;
    const cfClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET;
    
    // Only add Cloudflare headers if not connecting to local development server
    if (cfClientId && cfClientSecret && !this.isLocalDevelopment()) {
      this.headers['CF-Access-Client-Id'] = cfClientId;
      this.headers['CF-Access-Client-Secret'] = cfClientSecret;
    }
    
    console.log('🔍 Base URL:', this.baseUrl);
    console.log('🔍 WebSocket URL:', this.wsUrl);
    console.log('🔍 Client ID:', this.clientId);
    
    this.connectWebSocket();
  }

  private isLocalDevelopment(): boolean {
    return this.baseUrl.includes('localhost') || 
           this.baseUrl.includes('127.0.0.1') || 
           this.baseUrl.includes('192.168.') || 
           this.baseUrl.includes('10.0.') ||
           this.baseUrl.includes('172.16.');
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private connectWebSocket() {
    try {
      const wsUrl = `${this.wsUrl}/ws?clientId=${this.clientId}`;
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.onStatusChange?.({ type: 'connected', message: 'Connected to ComfyUI' });
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);
        this.handleWebSocketMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.onStatusChange?.({
          type: 'error',
          message: `WebSocket connection failed. Make sure ComfyUI is running at ${this.baseUrl}`
        });
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) { // Not a normal closure
          this.onStatusChange?.({
            type: 'error',
            message: 'WebSocket connection lost. Attempting to reconnect...'
          });
          // Attempt to reconnect after 3 seconds
          setTimeout(() => this.connectWebSocket(), 3000);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
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
      
      if (!this.isLocalDevelopment()) {
        const cfClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID;
        const cfClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET;
        
        if (cfClientId && cfClientSecret) {
          uploadHeaders['CF-Access-Client-Id'] = cfClientId;
          uploadHeaders['CF-Access-Client-Secret'] = cfClientSecret;
        }
      }

      const uploadUrl = `${this.baseUrl}/upload/image`;
      console.log('📤 Uploading to:', uploadUrl);

      const response = await axios.post(uploadUrl, formData, {
        headers: uploadHeaders
      });

      console.log('✅ Upload successful:', response.data);
      return response.data.name;
    } catch (error) {
      console.error('❌ Upload error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
      }
      this.onStatusChange?.({
        type: 'error',
        message: 'Failed to upload image. Check console for details.'
      });
      throw new Error('Failed to upload image');
    }
  }

  async generateImage(prompt: string, imageName: string): Promise<void> {
    this.onStatusChange?.({ type: 'generating', message: 'Preparing generation...' });

    try {
      const workflow = this.createWorkflow(prompt, imageName);
      
      // Log the workflow for debugging
      console.log('🔧 Generated workflow:', JSON.stringify(workflow, null, 2));
      
      const promptUrl = `${this.baseUrl}/prompt`;
      console.log('🎨 Sending prompt to:', promptUrl);
      
      const response = await axios.post(promptUrl, {
        prompt: workflow,
        client_id: this.clientId
      }, {
        headers: this.headers
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
        }
      }
      this.onStatusChange?.({
        type: 'error',
        message: 'Failed to generate image. Please check the console for details.'
      });
      throw error;
    }
  }

  private async getGeneratedImage(): Promise<void> {
    try {
      const historyUrl = `${this.baseUrl}/history/${this.currentPromptId}`;
      console.log('📜 Fetching history from:', historyUrl);
      
      const response = await axios.get(historyUrl, {
        headers: this.headers
      });
      const history = response.data;
      
      console.log('📊 History response:', history);
      
      const outputs = history[this.currentPromptId!]?.outputs;
      if (outputs && outputs["9"]?.images?.[0]) {
        const imageInfo = outputs["9"].images[0];
        const imageUrl = `${this.baseUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`;
        
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
          "ref1": ["55", 0]
        },
        "class_type": "ApplyDreamO",
        "_meta": {
          "title": "Apply DreamO"
        }
      },
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
      },
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
      
      // Check object info (available nodes)
      try {
        const objectInfoUrl = `${this.baseUrl}/object_info`;
        const objectInfoResponse = await axios.get(objectInfoUrl, { headers: this.headers });
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
      
      // Check available models
      try {
        const checkpointsUrl = `${this.baseUrl}/api/v1/models/checkpoints`;
        const checkpointsResponse = await axios.get(checkpointsUrl, { headers: this.headers });
        console.log('🎯 Available Checkpoints:', checkpointsResponse.data);
      } catch (err) {
        // Try alternative endpoint
        try {
          const systemStatsUrl = `${this.baseUrl}/system_stats`;
          const systemStatsResponse = await axios.get(systemStatsUrl, { headers: this.headers });
          console.log('📊 System Stats:', systemStatsResponse.data);
        } catch (err2) {
          console.log('ℹ️ Could not fetch model list (this is normal)');
        }
      }
      
    } catch (error) {
      console.error('❌ Debug check failed:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

# lib/utils.ts

```ts
import { type ClassValue, clsx } from "clsx"
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
  type: 'idle' | 'uploading' | 'generating' | 'completed' | 'error';
  message?: string;
}
```

# vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

