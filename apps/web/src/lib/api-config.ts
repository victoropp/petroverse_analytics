/**
 * Dynamic API Configuration with automatic fallback
 * This ensures the frontend can always connect to the backend
 * regardless of port conflicts or CORS issues
 */

class APIConfig {
  private apiUrls: string[] = [];
  private currentUrlIndex = 0;
  private baseURL: string | null = null;

  constructor() {
    // Primary API URL from environment
    const primaryUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003';
    this.apiUrls.push(primaryUrl);

    // Add fallback URLs
    const fallbacks = [
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_1,
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_2,
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_3,
      'http://localhost:8003',
      'http://127.0.0.1:8003',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:8001',
      'http://127.0.0.1:8001',
      'http://localhost:8002',
      'http://127.0.0.1:8002',
    ].filter(Boolean) as string[];

    // Remove duplicates
    const uniqueUrls = new Set([...this.apiUrls, ...fallbacks]);
    this.apiUrls = Array.from(uniqueUrls);
    
    // Set initial base URL
    this.baseURL = this.apiUrls[0];
  }

  /**
   * Get the current API URL
   */
  getAPIUrl(): string {
    return this.baseURL || this.apiUrls[0];
  }

  /**
   * Test connectivity to an API URL
   */
  private async testConnection(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      return response?.ok || false;
    } catch {
      return false;
    }
  }

  /**
   * Find a working API URL by testing each one
   */
  async findWorkingUrl(): Promise<string> {
    console.log('🔍 Finding working API URL...');
    
    for (const url of this.apiUrls) {
      console.log(`Testing ${url}...`);
      const isWorking = await this.testConnection(url);
      
      if (isWorking) {
        console.log(`✅ Found working API at ${url}`);
        this.baseURL = url;
        return url;
      }
    }

    // If no URL works, return the primary one anyway
    console.warn('⚠️ No working API URL found, using default:', this.apiUrls[0]);
    return this.apiUrls[0];
  }

  /**
   * Switch to next API URL (for manual fallback)
   */
  switchToNextUrl(): string {
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.apiUrls.length;
    this.baseURL = this.apiUrls[this.currentUrlIndex];
    console.log(`Switched to API URL: ${this.baseURL}`);
    return this.baseURL;
  }

  /**
   * Get all available API URLs
   */
  getAllUrls(): string[] {
    return [...this.apiUrls];
  }
}

// Create singleton instance
const apiConfig = new APIConfig();

// Auto-detect working URL on initialization (browser only)
if (typeof window !== 'undefined') {
  apiConfig.findWorkingUrl().catch(console.error);
}

export default apiConfig;