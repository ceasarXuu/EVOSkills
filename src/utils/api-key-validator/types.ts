export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: {
    provider: string;
    model?: string;
    error?: string;
  };
}
