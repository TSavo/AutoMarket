/**
 * Quick job status check
 */

async function checkJobStatus() {
  const jobId = 'ecd2076e-f92d-452c-8579-c9fe7bd2135c';
  const url = `http://localhost:3001/api/v1/jobs/${jobId}`;
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.text();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkJobStatus().catch(console.error);
