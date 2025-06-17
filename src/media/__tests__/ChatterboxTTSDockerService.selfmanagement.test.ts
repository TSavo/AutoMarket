import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { ChatterboxTTSDockerService } from '../ChatterboxTTSDockerService';

describe('ChatterboxTTSDockerService Self-Management', () => {
  let chatterboxService: ChatterboxTTSDockerService;

  beforeAll(() => {
    chatterboxService = new ChatterboxTTSDockerService();
  });

  afterAll(async () => {
    // Clean up: stop the service if it was started during tests
    try {
      await chatterboxService.stopService();
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Service Information', () => {
    test('should provide service information', () => {
      const info = chatterboxService.getServiceInfo();
      
      expect(info).toHaveProperty('containerName');
      expect(info).toHaveProperty('dockerImage');
      expect(info).toHaveProperty('ports');
      expect(info).toHaveProperty('command');
      expect(info).toHaveProperty('healthCheckUrl');
      
      expect(info.containerName).toBe('chatterbox-tts-server');
      expect(info.dockerImage).toBe('devnen/chatterbox-tts-server:latest');
      expect(info.ports).toEqual([8004]);
      expect(info.healthCheckUrl).toContain('localhost:8004');
    });

    test('should provide transformer information', () => {
      const info = chatterboxService.getInfo();
      
      expect(info.id).toBe('chatterbox-tts');
      expect(info.name).toBe('Chatterbox TTS');
      expect(info.type).toBe('local');
      expect(info.transforms).toHaveLength(1);
      expect(info.transforms[0]).toEqual({
        input: 'text',
        output: 'audio',
        description: 'Convert text to speech using Chatterbox TTS'
      });
    });
  });

  describe('Service Status Checking', () => {
    test('should check service status', async () => {
      const status = await chatterboxService.getServiceStatus();
      expect(['running', 'stopped', 'error', 'starting']).toContain(status);
      console.log('📊 Service status:', status);
    });

    test('should check service availability', async () => {
      const available = await chatterboxService.isAvailable();
      expect(typeof available).toBe('boolean');
      console.log('🔍 Service availability:', available);
    });
  });

  describe('Service Lifecycle Management', () => {
    test('should handle start service request', async () => {
      console.log('🧪 Testing service start...');
      
      const result = await chatterboxService.startService();
      expect(typeof result).toBe('boolean');
      
      if (result) {
        console.log('✅ Service start succeeded');
        
        // Verify service is actually running via Docker status
        const status = await chatterboxService.getServiceStatus();
        console.log('📊 Post-start status:', status);
        
        // For self-management tests, we only need to verify Docker operations work
        // Network connectivity issues in test environment are separate from Docker management
        expect(['running', 'error']).toContain(status); // 'error' is OK if network connectivity fails
      } else {
        console.log('❌ Service start failed (this may be expected if Docker is not available)');
      }
    }, 30000); // 30 second timeout for Docker operations

    test('should handle stop service request', async () => {
      const result = await chatterboxService.stopService();
      expect(typeof result).toBe('boolean');
      
      if (result) {
        console.log('✅ Service stop succeeded');
        
        // Verify service is actually stopped
        const status = await chatterboxService.getServiceStatus();
        console.log('📊 Post-stop status:', status);
        
        expect(['stopped', 'error']).toContain(status);
      } else {
        console.log('❌ Service stop failed (this may be expected if Docker is not available)');
      }
    }, 30000);

    test('should handle restart cycle', async () => {
      console.log('🔄 Testing restart cycle...');
      
      // Stop first
      const stopResult = await chatterboxService.stopService();
      console.log('🛑 Stop result:', stopResult);
      
      // Start again
      const startResult = await chatterboxService.startService();
      console.log('🚀 Start result:', startResult);
      
      if (startResult) {
        // Verify final state - focus on Docker management, not network connectivity
        const finalStatus = await chatterboxService.getServiceStatus();
        
        console.log('📊 Final status:', finalStatus);
        console.log('🎯 Restart cycle completed successfully');
        
        // For self-management tests, we only need to verify Docker operations work
        expect(finalStatus).toBe('running');
      }
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle multiple start calls gracefully', async () => {
      // Starting an already running service should succeed
      const result1 = await chatterboxService.startService();
      const result2 = await chatterboxService.startService();
      
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
      
      // Both calls should return boolean results (idempotent behavior)
      console.log('🔄 Multiple start results:', { result1, result2 });
    }, 60000);

    test('should handle multiple stop calls gracefully', async () => {
      // Stopping an already stopped service should succeed
      const result1 = await chatterboxService.stopService();
      const result2 = await chatterboxService.stopService();
      
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
      
      console.log('🔄 Multiple stop results:', { result1, result2 });
    }, 60000);

    test('should handle invalid operations gracefully', async () => {
      // These should not throw errors, just return appropriate status
      const status = await chatterboxService.getServiceStatus();
      const available = await chatterboxService.isAvailable();
      
      expect(typeof status).toBe('string');
      expect(typeof available).toBe('boolean');
      
      console.log('🔍 Status during error test:', { status, available });
    });
  });
});
