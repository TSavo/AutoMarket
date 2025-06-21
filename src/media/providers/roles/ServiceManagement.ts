/**
 * ServiceManagement Interface
 * 
 * Base interface for providers that manage services (like Docker providers).
 * Provides common service lifecycle management methods.
 */

/**
 * Base service management interface for providers that manage services (like Docker providers)
 */
export interface ServiceManagement {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }>;
}
