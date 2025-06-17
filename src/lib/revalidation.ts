/**
 * Utility function to trigger revalidation of static paths
 * Can be called from client components when needed
 */
export const triggerRevalidation = async (paths: string[] = []): Promise<boolean> => {
  try {
    // Get the revalidation token - this would be better from an environment variable
    // but we're using the same default as the API for simplicity
    const REVALIDATION_TOKEN = 'your-secret-token';
    
    if (paths.length === 0) {
      // Revalidate all paths
      const response = await fetch(`/api/admin/revalidate?all=true&token=${REVALIDATION_TOKEN}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Revalidation failed:', data.message);
        return false;
      }
      
      console.log('Revalidation successful:', data.message);
      return true;
    } else {
      // Revalidate specific paths one by one
      const results = await Promise.all(
        paths.map(async (path) => {
          const response = await fetch(`/api/admin/revalidate?path=${encodeURIComponent(path)}&token=${REVALIDATION_TOKEN}`);
          const data = await response.json();
          
          if (!response.ok) {
            console.error(`Revalidation failed for ${path}:`, data.message);
            return false;
          }
          
          console.log(`Revalidation successful for ${path}:`, data.message);
          return true;
        })
      );
      
      // Return true only if all revalidations were successful
      return results.every(result => result === true);
    }
  } catch (error) {
    console.error('Error during revalidation:', error);
    return false;
  }
};
