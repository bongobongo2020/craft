
import axios from 'axios';
import type { GenerationStatus } from '@/types';
import type { ComfyUISettings } from '@/components/SettingsPanel';

export class ComfyUIClient {
  private settings: ComfyUISettings;
  private clientId: string;
  private ws: WebSocket | null = null;
  private currentPromptId: string | null = null;
  private headers: Record<string, string> = {};
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
    
    // Do not auto-connect on instantiation. Let App.tsx control connection.
    // setTimeout(() => this.connectWebSocket(), 1000); 
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
      
      // Reconnect with new settings if it was previously connected or trying to connect
      // For now, updateSettings will just set the new settings, and App.tsx will manage calling connect().
      // setTimeout(() => this.connectWebSocket(), 1000); 
    }
  }

  public getSettings(): ComfyUISettings { // Renamed from getCurrentSettings
    return { ...this.settings };
  }

  public connect(): void {
    if (this.settings.baseUrl) { // Only connect if a base URL is set
      this.isDisconnected = false; // Reset intentional disconnect flag
      this.connectWebSocket();
    } else {
      console.warn("Cannot connect: ComfyUI base URL is not set.");
      this.onStatusChange?.({ type: 'error', message: 'ComfyUI server URL is not configured.' });
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && !this.isConnecting && !this.isDisconnected;
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

  // Helper function to normalize URL paths
  private normalizeUrl(baseUrl: string, path: string): string {
    // Remove trailing slash from base URL
    const cleanBase = baseUrl.replace(/\/+$/, '');
    // Remove leading slash from path
    const cleanPath = path.replace(/^\/+/, '');
    // Join with single slash
    return `${cleanBase}/${cleanPath}`;
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
      // Fix the double slash issue by using normalizeUrl
      const wsUrl = this.normalizeUrl(this.settings.wsUrl, `ws?clientId=${this.clientId}`);
      console.log('🔗 Connecting to WebSocket:', wsUrl, `(attempt ${this.reconnectAttempts + 1})`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.onStatusChange?.({ type: 'connected', message: 'Connected to ComfyUI' });
      };
      
      this.ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data);
            this.handleWebSocketMessage(data);
          } else {
            console.warn('📦 Received non-string WebSocket message:', event.data);
          }
        } catch (e) {
          console.error('❌ Error parsing WebSocket message JSON:', e);
          console.error('Raw WebSocket message data:', event.data);
          this.onStatusChange?.({
            type: 'error',
            message: 'Received malformed data from ComfyUI server.'
          });
        }
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

      const uploadUrl = this.normalizeUrl(this.settings.baseUrl, 'upload/image');
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
      
      const promptUrl = this.normalizeUrl(this.settings.baseUrl, 'prompt');
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
      const historyUrl = this.normalizeUrl(this.settings.baseUrl, `history/${this.currentPromptId}`);
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
        const imageUrl = this.normalizeUrl(this.settings.baseUrl, `view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`);
        
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
        const healthUrl = this.normalizeUrl(this.settings.baseUrl, 'system_stats');
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
        const objectInfoUrl = this.normalizeUrl(this.settings.baseUrl, 'object_info');
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
        const queueUrl = this.normalizeUrl(this.settings.baseUrl, 'queue');
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
