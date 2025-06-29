/**
 * Test script to verify Zonos Docker health check configuration
 */

import { ServiceRegistry } from './src/media/registry/ServiceRegistry';
import { DockerComposeService } from './src/services/DockerComposeService';

async function testZonosHealth() {
  console.log('🏥 Testing Zonos Docker Health Check');
  console.log('=' .repeat(50));

  let dockerService: DockerComposeService | undefined;
  try {
    dockerService = await ServiceRegistry.getInstance().getService('zonos-docker') as DockerComposeService;
  } catch (error) {
    console.error(`❌ Failed to get Zonos Docker service from registry: ${error.message}`);
    return;
  }

  if (!dockerService) {
    console.error('❌ Zonos Docker service not found in registry.');
    return;
  }
  
  try {
    // Test 1: Check current status
    console.log('\n🔍 Checking current service status...');
    const status = await dockerService.getServiceStatus();
    console.log(`Status: running=${status.running}, health=${status.health}, state=${status.state}`);
    
    // Test 2: Try to start service
    if (!status.running) {
      console.log('\n🚀 Starting Zonos service...');
      const started = await dockerService.startService();
      console.log(`Service started: ${started}`);
      
      if (started) {
        // Test 3: Wait for healthy status
        console.log('\n⏳ Waiting for service to become healthy...');
        const healthy = await dockerService.waitForHealthy(180000); // 3 minute timeout
        console.log(`Service healthy: ${healthy}`);
        
        if (healthy) {
          console.log('\n✅ Health check is working correctly!');
        } else {
          console.log('\n❌ Health check failed - checking logs...');
          // Removed getLogs as DockerComposeService does not have it directly
          console.log('Container logs: (Not available via DockerComposeService directly)');
        }
      }
    } else {
      console.log('\n✅ Service is already running');
      
      if (status.health === 'healthy') {
        console.log('✅ Service is healthy');
      } else if (status.health === 'unhealthy') {
        console.log('❌ Service is unhealthy');
      } else {
        console.log('❓ No health check status available');
      }
    }
    
    // Test 4: Get final status
    console.log('\n📊 Final service status:');
    const finalStatus = await dockerService.getServiceStatus();
    console.log(`Running: ${finalStatus.running}`);
    console.log(`Health: ${finalStatus.health || 'not defined'}`);
    console.log(`State: ${finalStatus.state || 'unknown'}`);
    console.log(`Container: ${finalStatus.containerId || 'unknown'}`);
    
    // Test 5: Get service info
    console.log('\n🔧 Service configuration:');
    const info = dockerService.getServiceInfo();
    console.log(`Container Name: ${info.containerName}`);
    console.log(`Docker Image: ${info.dockerImage}`);
    console.log(`Ports: ${info.ports.join(', ')}`);
    console.log(`Compose Service: ${info.composeService}`);
    console.log(`Health Check URL: ${info.healthCheckUrl}`);
    
    console.log('\n🎉 Health check test completed!');
    
  } catch (error) {
    console.error('❌ Health check test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testZonosHealth()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testZonosHealth };