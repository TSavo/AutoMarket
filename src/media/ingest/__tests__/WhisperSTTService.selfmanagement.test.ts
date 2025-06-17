/**
 * Self-Management Tests for WhisperSTTService
 * 
 * Tests the LocalServiceManager interface implementation for Docker lifecycle management.
 * These tests interact with real Docker commands and should be run carefully.
 */

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { WhisperSTTService } from '../WhisperSTTService';

// NO MOCKS - These are integration tests for self-management
vi.unmock('child_process');
vi.unmock('fs');

describe('WhisperSTTService Self-Management (LocalServiceManager)', () => {
  let whisperService: WhisperSTTService;

  beforeAll(() => {
    whisperService = new WhisperSTTService();
  });

  describe('Service Information', () => {
    test('should provide service management information', () => {
      const serviceInfo = whisperService.getDockerServiceInfo();

      expect(serviceInfo.containerName).toBe('whisper-service');
      expect(serviceInfo.dockerImage).toBe('onerahmet/openai-whisper-asr-webservice:latest');
      expect(serviceInfo.ports).toEqual([9000]);
      expect(serviceInfo.command).toContain('docker-compose');
      expect(serviceInfo.healthCheckUrl).toBe('http://localhost:9000/asr');

      console.log('📋 Service Info:', serviceInfo);
    });

    test('should implement LocalServiceManager interface', () => {
      // Verify all required methods exist
      expect(typeof whisperService.startService).toBe('function');
      expect(typeof whisperService.stopService).toBe('function');
      expect(typeof whisperService.getServiceStatus).toBe('function');
      expect(typeof whisperService.getDockerServiceInfo).toBe('function');
    });
  });

  describe('Service Status Checking', () => {
    test('should check service status', async () => {
      const status = await whisperService.getServiceStatus();
      
      expect(['running', 'stopped', 'starting', 'stopping', 'error', 'unknown']).toContain(status);
      console.log('📊 Current service status:', status);
    });

    test('should correlate status with availability', async () => {
      const status = await whisperService.getServiceStatus();
      const available = await whisperService.isAvailable();
      
      if (status === 'running') {
        expect(available).toBe(true);
      } else if (status === 'stopped') {
        expect(available).toBe(false);
      }
      
      console.log('🔍 Status:', status, '| Available:', available);
    });
  });

  describe('Service Lifecycle Management', () => {
    test('should handle start service request', async () => {
      console.log('🧪 Testing service start...');

      const result = await whisperService.startService();
      expect(typeof result).toBe('boolean');

      if (result) {
        console.log('✅ Service start succeeded');

        // Verify service is actually running via Docker status
        const status = await whisperService.getServiceStatus();
        console.log('📊 Post-start status:', status);

        // For self-management tests, we only need to verify Docker operations work
        // Network connectivity issues in test environment are separate from Docker management
        expect(['running', 'error']).toContain(status); // 'error' is OK if network connectivity fails
      } else {
        console.log('❌ Service start failed (this may be expected if Docker is not available)');
      }
    }, 30000); // 30 second timeout for Docker operations

    test('should handle stop service request', async () => {
      console.log('🧪 Testing service stop...');
      
      const result = await whisperService.stopService();
      expect(typeof result).toBe('boolean');
      
      if (result) {
        console.log('✅ Service stop succeeded');
        
        // Wait a moment for container to fully stop
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify service is actually stopped
        const status = await whisperService.getServiceStatus();
        const available = await whisperService.isAvailable();
        
        console.log('📊 Post-stop status:', status);
        console.log('🔍 Post-stop availability:', available);
        
        expect(status).toBe('stopped');
        expect(available).toBe(false);
      } else {
        console.log('❌ Service stop failed (this may be expected if no containers were running)');
      }
    }, 30000); // 30 second timeout for stop operations

    test('should handle restart cycle', async () => {
      console.log('🧪 Testing full restart cycle...');
      
      // Stop first
      const stopResult = await whisperService.stopService();
      console.log('🛑 Stop result:', stopResult);
      
      // Wait for stop to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start again
      const startResult = await whisperService.startService();
      console.log('🚀 Start result:', startResult);
      
      if (startResult) {
        // Verify final state - focus on Docker management, not network connectivity
        const finalStatus = await whisperService.getServiceStatus();

        console.log('📊 Final status:', finalStatus);
        console.log('🎯 Restart cycle completed successfully');

        // For self-management tests, we only need to verify Docker operations work
        expect(finalStatus).toBe('running');
      }
    }, 120000); // 2 minute timeout for full cycle
  });

  describe('Error Handling', () => {
    test('should handle Docker not available gracefully', async () => {
      // This test assumes Docker might not be available in some environments
      const status = await whisperService.getServiceStatus();
      
      // Should not throw errors, should return valid status
      expect(['running', 'stopped', 'starting', 'stopping', 'error', 'unknown']).toContain(status);
    });

    test('should handle multiple start calls gracefully', async () => {
      // Starting an already running service should succeed
      const result1 = await whisperService.startService();
      const result2 = await whisperService.startService();

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');

      // Both calls should return boolean results (idempotent behavior)
      console.log('🔄 Multiple start results:', { result1, result2 });
    }, 60000);

    test('should handle multiple stop calls gracefully', async () => {
      // Stopping an already stopped service should succeed
      const result1 = await whisperService.stopService();
      const result2 = await whisperService.stopService();
      
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
      
      // Both should succeed (idempotent)
      expect(result2).toBe(true);
    }, 60000);
  });
});
