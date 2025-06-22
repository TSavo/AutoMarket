import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Configuration for a Docker Compose service
 */
export interface DockerComposeConfig {
  serviceName: string;
  composeFile: string;
  containerName: string;
  healthCheckUrl?: string;
  workingDirectory?: string;
}

/**
 * Generic Docker Compose Service Manager
 * 
 * Handles docker-compose operations for any service in a DRY way.
 * Services can delegate their Docker management to this service.
 */
export class DockerComposeService {
  private config: DockerComposeConfig;

  constructor(config: DockerComposeConfig) {
    this.config = config;
  }

  /**
   * Start the service using docker-compose up and wait for it to be healthy
   */
  async startService(): Promise<boolean> {
    try {
      console.log(`🐳 Starting ${this.config.serviceName} service with docker-compose...`);

      // Check if already running and healthy
      const status = await this.getServiceStatus();
      if (status.running && status.health === 'healthy') {
        console.log(`✅ ${this.config.serviceName} service is already running and healthy`);
        return true;
      }

      // Build the docker-compose command - bring up all services
      const composeCmd = this.buildComposeCommand('up', '-d');

      console.log(`🚀 Running: ${composeCmd}`);
      await this.executeCommand(composeCmd);

      // Wait for service to become healthy according to Docker
      console.log(`⏳ Waiting for ${this.config.serviceName} to become healthy...`);
      const isHealthy = await this.waitForHealthy(60000); // 60 second timeout

      if (isHealthy) {
        console.log(`✅ ${this.config.serviceName} service started and is healthy`);
        return true;
      } else {
        console.error(`❌ ${this.config.serviceName} service started but failed to become healthy`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Failed to start ${this.config.serviceName} service:`, error);
      return false;
    }
  }

  /**
   * Stop the service using docker-compose stop
   */
  async stopService(): Promise<boolean> {
    try {
      console.log(`🛑 Stopping ${this.config.serviceName} service with docker-compose...`);

      // Stop all services in the compose file
      const composeCmd = this.buildComposeCommand('stop');

      console.log(`🛑 Running: ${composeCmd}`);
      await this.executeCommand(composeCmd);

      console.log(`✅ ${this.config.serviceName} service stopped successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to stop ${this.config.serviceName} service:`, error);
      return false;
    }
  }

  /**
   * Remove the service using docker-compose down
   */
  async removeService(): Promise<boolean> {
    try {
      console.log(`🗑️ Removing ${this.config.serviceName} service with docker-compose...`);
      
      const composeCmd = this.buildComposeCommand('down');
      
      console.log(`🗑️ Running: ${composeCmd}`);
      await this.executeCommand(composeCmd);

      console.log(`✅ ${this.config.serviceName} service removed successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to remove ${this.config.serviceName} service:`, error);
      return false;
    }
  }

  /**
   * Check if the service is running
   */
  async isServiceRunning(): Promise<boolean> {
    try {
      // Get status of all services, then filter for our specific container
      const composeCmd = this.buildComposeCommand('ps', '--format', 'json');
      const { stdout } = await this.executeCommand(composeCmd);

      if (!stdout.trim()) {
        return false;
      }

      try {
        // Parse JSON array of services
        const services = JSON.parse(stdout);
        const serviceArray = Array.isArray(services) ? services : [services];

        // Find our specific container
        const targetService = serviceArray.find(service =>
          service.Name === this.config.containerName ||
          service.Service === this.config.serviceName
        );

        if (!targetService) {
          return false;
        }

        const state = targetService.State || targetService.status;
        return state === 'running';
      } catch (parseError) {
        // Fallback: if we can't parse JSON, assume not running
        return false;
      }

    } catch (error) {
      console.warn(`Failed to check ${this.config.serviceName} service status:`, error);
      return false;
    }
  }

  /**
   * Wait for the service to become healthy according to Docker health checks
   */
  async waitForHealthy(timeoutMs: number = 600000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getServiceStatus();

        console.log(`[${this.config.serviceName}] Health check: running=${status.running}, health=${status.health}`);

        if (status.running && status.health === 'healthy') {
          return true;
        }

        if (status.running && status.health === 'unhealthy') {
          console.error(`❌ ${this.config.serviceName} service is unhealthy`);
          return false;
        }

        // If no health check is defined, just check if it's running
        if (status.running && !status.health) {
          console.log(`ℹ️ ${this.config.serviceName} has no health check, assuming healthy since it's running`);
          return true;
        }

      } catch (error) {
        console.warn(`Health check failed for ${this.config.serviceName}:`, error);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.error(`❌ ${this.config.serviceName} failed to become healthy within ${timeoutMs}ms`);
    return false;
  }

  /**
   * Get service status information
   */
  async getServiceStatus(): Promise<{
    running: boolean;
    containerName: string;
    state?: string;
    health?: string;
  }> {
    try {
      // Get status of all services, then filter for our specific container
      const composeCmd = this.buildComposeCommand('ps', '--format', 'json');
      const { stdout } = await this.executeCommand(composeCmd);
      
      if (!stdout.trim()) {
        return {
          running: false,
          containerName: this.config.containerName
        };
      }

      try {
        // Parse JSON array of services
        const services = JSON.parse(stdout);
        const serviceArray = Array.isArray(services) ? services : [services];

        // Find our specific container
        const targetService = serviceArray.find(service =>
          service.Name === this.config.containerName ||
          service.Service === this.config.serviceName
        );

        if (!targetService) {
          return {
            running: false,
            containerName: this.config.containerName,
            state: 'not-found'
          };
        }

        return {
          running: targetService.State === 'running',
          containerName: this.config.containerName,
          state: targetService.State,
          health: targetService.Health
        };
      } catch (parseError) {
        return {
          running: false,
          containerName: this.config.containerName,
          state: 'parse-error'
        };
      }

    } catch (error) {
      console.warn(`Failed to get ${this.config.serviceName} service status:`, error);
      return {
        running: false,
        containerName: this.config.containerName,
        state: 'error'
      };
    }
  }

  /**
   * Get service logs
   */
  async getServiceLogs(lines: number = 50): Promise<string> {
    try {
      const composeCmd = this.buildComposeCommand('logs', '--tail', lines.toString(), this.config.serviceName);
      const { stdout } = await this.executeCommand(composeCmd);
      return stdout;
    } catch (error) {
      console.error(`Failed to get ${this.config.serviceName} service logs:`, error);
      return '';
    }
  }

  /**
   * Restart the service
   */
  async restartService(): Promise<boolean> {
    console.log(`🔄 Restarting ${this.config.serviceName} service...`);
    
    const stopped = await this.stopService();
    if (!stopped) {
      return false;
    }

    // Wait a moment for clean shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.startService();
  }

  /**
   * Get service configuration
   */
  getConfig(): DockerComposeConfig {
    return { ...this.config };
  }

  /**
   * Build docker-compose command with proper file path
   */
  private buildComposeCommand(...args: string[]): string {
    const composeFile = path.resolve(this.config.composeFile);
    return `docker-compose -f "${composeFile}" ${args.join(' ')}`;
  }

  /**
   * Execute a command with proper working directory
   */
  private async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    const options = this.config.workingDirectory 
      ? { cwd: this.config.workingDirectory }
      : {};
    
    return await execAsync(command, options);
  }
}
