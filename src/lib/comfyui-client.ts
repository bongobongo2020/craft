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
    
    // CRITICAL FIX: Ensure HTTP URLs are converted to HTTPS when not localhost
    this.baseUrl = this.ensureProperProtocol(this.baseUrl, 'https');
    this.wsUrl = this.ensureProperProtocol(this.wsUrl, 'wss');
    
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
    console.log('🔍 Is Local Development:', this.isLocalDevelopment());
    
    this.connectWebSocket();
  }

  /**
   * Ensures URLs use the proper protocol (HTTPS/WSS) for non-local connections
   */
  private ensureProperProtocol(url: string, secureProtocol: 'https' | 'wss'): string {
    if (this.isLocalDevelopment(url)) {
      return url; // Keep original protocol for local development
    }
    
    // Convert HTTP to HTTPS, WS to WSS for remote connections
    if (secureProtocol === 'https' && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    } else if (secureProtocol === 'wss' && url.startsWith('ws://')) {
      return url.replace('ws://', 'wss://');
    }
    
    return url;
  }

  private isLocalDevelopment(url?: string): boolean {
    const checkUrl = url || this.baseUrl;
    return checkUrl.includes('localhost') || 
           checkUrl.includes('127.0.0.1') || 
           checkUrl.includes('192.168.') || 
           checkUrl.includes('10.0.') ||
           checkUrl.includes('172.16.');
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
      
      // Add Cloudflare Access headers if needed
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
        headers: uploadHeaders,
        timeout: 30000, // 30 second timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('✅ Upload successful:', response.data);
      return response.data.name;
    } catch (error) {
      console.error('❌ Upload error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
        
        // Handle specific error cases
        if (error.code === 'ERR_NETWORK') {
          this.onStatusChange?.({
            type: 'error',
            message: 'Network error. Check if ComfyUI is running and accessible.'
          });
        } else if (error.response?.status === 404) {
          this.onStatusChange?.({
            type: 'error',
            message: 'Upload endpoint not found. Check ComfyUI configuration.'
          });
        } else if (error.response?.status === 413) {
          this.onStatusChange?.({
            type: 'error',
            message: 'File too large. Try a smaller image.'
          });
        } else {
          this.onStatusChange?.({
            type: 'error',
            message: `Upload failed: ${error.message}`
          });
        }
      } else {
        this.onStatusChange?.({
          type: 'error',
          message: 'Failed to upload image. Check console for details.'
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
      
      const promptUrl = `${this.baseUrl}/prompt`;
      console.log('🎨 Sending prompt to:', promptUrl);
      
      const response = await axios.post(promptUrl, {
        prompt: workflow,
        client_id: this.clientId
      }, {
        headers: this.headers,
        timeout: 30000, // 30 second timeout
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
        } else if (error.code === 'ERR_NETWORK') {
          this.onStatusChange?.({
            type: 'error',
            message: 'Network error. Check if ComfyUI is running and accessible.'
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
        headers: this.headers,
        timeout: 30000,
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
        const objectInfoResponse = await axios.get(objectInfoUrl, { 
          headers: this.headers,
          timeout: 10000,
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
      
      // Check basic connectivity
      try {
        const systemStatsUrl = `${this.baseUrl}/system_stats`;
        const systemStatsResponse = await axios.get(systemStatsUrl, { 
          headers: this.headers,
          timeout: 10000,
        });
        console.log('📊 System Stats:', systemStatsResponse.data);
      } catch (err) {
        console.log('ℹ️ Could not fetch system stats');
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