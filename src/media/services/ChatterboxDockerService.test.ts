/**
 * ChatterboxDockerService Tests
 * 
 * Unit tests for the extracted Chatterbox Docker service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatterboxDockerService } from './ChatterboxDockerService';
import { DockerComposeService } from '../../services/DockerComposeService';

// Mock DockerComposeService
vi.mock('../../services/DockerComposeService');

const MockDockerComposeService = vi.mocked(DockerComposeService);

describe('ChatterboxDockerService', () => {
  let service: ChatterboxDockerService;
  let mockDockerService: any;

  beforeEach(() => {
    mockDockerService = {
        startService: vi.fn(),
        stopService: vi.fn(),
        restartService: vi.fn(),
        getServiceStatus: vi.fn().mockResolvedValue({
          running: true,
          health: 'healthy',
          state: 'running',
          containerId: 'abc123'
        }),
        waitForHealthy: vi.fn(),
        getConfig: vi.fn()
      };

    MockDockerComposeService.mockImplementation(() => mockDockerService);
    service = new ChatterboxDockerService();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = service.getDockerConfig();
      
      expect(config.baseUrl).toBe('http://localhost:8004');
      expect(config.serviceName).toBe('chatterbox-tts-server');
      expect(config.composeFile).toBe('services/chatterbox/docker-compose.yml');
      expect(config.containerName).toBe('chatterbox-tts-server');
    });

    it('should initialize with custom configuration', () => {
      const customService = new ChatterboxDockerService({
        baseUrl: 'http://custom:9000',
        serviceName: 'custom-service',
        containerName: 'custom-container'
      });

      const config = customService.getDockerConfig();
      
      expect(config.baseUrl).toBe('http://custom:9000');
      expect(config.serviceName).toBe('custom-service');
      expect(config.containerName).toBe('custom-container');
    });
  });

  describe('startService', () => {
    it('should start the Docker service', async () => {
      mockDockerService.startService.mockResolvedValue(true);

      const result = await service.startService();

      expect(result).toBe(true);
      expect(mockDockerService.startService).toHaveBeenCalledOnce();
    });

    it('should handle start failure', async () => {
      mockDockerService.startService.mockResolvedValue(false);

      const result = await service.startService();

      expect(result).toBe(false);
      expect(mockDockerService.startService).toHaveBeenCalledOnce();
    });
  });

  describe('stopService', () => {
    it('should stop the Docker service', async () => {
      mockDockerService.stopService.mockResolvedValue(true);

      const result = await service.stopService();

      expect(result).toBe(true);
      expect(mockDockerService.stopService).toHaveBeenCalledOnce();
    });

    it('should handle stop failure', async () => {
      mockDockerService.stopService.mockResolvedValue(false);

      const result = await service.stopService();

      expect(result).toBe(false);
      expect(mockDockerService.stopService).toHaveBeenCalledOnce();
    });
  });

  describe('restartService', () => {
    it('should restart the Docker service', async () => {
      mockDockerService.restartService.mockResolvedValue(true);

      const result = await service.restartService();

      expect(result).toBe(true);
      expect(mockDockerService.restartService).toHaveBeenCalledOnce();
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status', async () => {
      const mockStatus = {
        running: true,
        health: 'healthy' as const,
        state: 'running',
        containerId: 'abc123'
      };

      mockDockerService.getServiceStatus.mockResolvedValue(mockStatus);

      const result = await service.getServiceStatus();

      expect(result).toEqual(mockStatus);
      expect(mockDockerService.getServiceStatus).toHaveBeenCalledOnce();
    });
  });

  describe('isServiceHealthy', () => {
    it('should return true for healthy running service', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: true,
        health: 'healthy',
        state: 'running'
      });

      const result = await service.isServiceHealthy();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy service', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: true,
        health: 'unhealthy',
        state: 'running'
      });

      const result = await service.isServiceHealthy();

      expect(result).toBe(false);
    });

    it('should return false for stopped service', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: false,
        health: 'none',
        state: 'stopped'
      });

      const result = await service.isServiceHealthy();

      expect(result).toBe(false);
    });
  });

  describe('isServiceRunning', () => {
    it('should return true for running service', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: true,
        health: 'unhealthy',
        state: 'running'
      });

      const result = await service.isServiceRunning();

      expect(result).toBe(true);
    });

    it('should return false for stopped service', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: false,
        health: 'none',
        state: 'stopped'
      });

      const result = await service.isServiceRunning();

      expect(result).toBe(false);
    });
  });

  describe('waitForHealthy', () => {
    it('should wait for service to become healthy', async () => {
      mockDockerService.waitForHealthy.mockResolvedValue(true);

      const result = await service.waitForHealthy(30000);

      expect(result).toBe(true);
      expect(mockDockerService.waitForHealthy).toHaveBeenCalledWith(30000);
    });

    it('should use default timeout', async () => {
      mockDockerService.waitForHealthy.mockResolvedValue(true);

      await service.waitForHealthy();

      expect(mockDockerService.waitForHealthy).toHaveBeenCalledWith(600000);
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = service.getServiceInfo();

      expect(info).toEqual({
        containerName: 'chatterbox-tts-server',
        dockerImage: 'devnen/chatterbox-tts-server:latest',
        ports: [8004],
        composeService: 'chatterbox-tts-server',
        composeFile: 'services/chatterbox/docker-compose.yml',
        healthCheckUrl: 'http://localhost:8004/health',
        network: 'chatterbox-network',
        serviceDirectory: 'services/chatterbox'
      });
    });
  });

  describe('getDockerComposeService', () => {
    it('should return the underlying DockerComposeService', () => {
      const dockerService = service.getDockerComposeService();

      expect(dockerService).toBe(mockDockerService);
    });
  });

  describe('checkDockerAvailability', () => {
    it('should check Docker availability', async () => {
      mockDockerService.getServiceStatus.mockResolvedValue({
        running: false,
        health: 'none',
        state: 'stopped'
      });

      const result = await service.checkDockerAvailability();

      expect(result).toEqual({
        dockerAvailable: true,
        composeAvailable: true
      });
    });

    it('should handle Docker unavailability', async () => {
      mockDockerService.getServiceStatus.mockRejectedValue(new Error('Docker not found'));

      const result = await service.checkDockerAvailability();

      expect(result).toEqual({
        dockerAvailable: false,
        composeAvailable: false,
        error: 'Docker not found'
      });
    });
  });
});
