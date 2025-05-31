
export interface GenerationStatus {
  type: 'idle' | 'uploading' | 'generating' | 'completed' | 'error' | 'connected';
  message?: string;
}
