/**
 * Utility functions for media asset revalidation and refreshing
 */

/**
 * Trigger revalidation of all media assets
 * This is useful when the static paths are not updating automatically
 * @returns Promise resolving to the revalidation result
 */
export async function revalidateMediaAssets(): Promise<{ success: boolean; message: string }> {
  try {
    // Call the revalidation API endpoint
    const response = await fetch('/api/admin/revalidate?all=true&token=your-secret-token');
    
    if (!response.ok) {
      throw new Error(`Revalidation failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Set the localStorage flag to trigger a UI refresh
    if (result.success) {
      localStorage.setItem('mediaLibraryUpdated', 'true');
      
      // Dispatch custom event to notify about media update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mediaLibraryUpdated'));
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error revalidating media assets:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during revalidation'
    };
  }
}

/**
 * Trigger revalidation of a specific media asset
 * @param assetId The ID of the asset to revalidate
 * @returns Promise resolving to the revalidation result
 */
export async function revalidateMediaAsset(assetId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Call the revalidation API endpoint for a specific path
    const assetPath = `/admin/media/${assetId}`;
    const response = await fetch(`/api/admin/revalidate?path=${encodeURIComponent(assetPath)}&token=your-secret-token`);
    
    if (!response.ok) {
      throw new Error(`Revalidation failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Set the localStorage flag to trigger a UI refresh
    if (result.success) {
      localStorage.setItem('mediaLibraryUpdated', 'true');
      
      // Dispatch custom event to notify about media update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mediaLibraryUpdated'));
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error revalidating media asset ${assetId}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during revalidation'
    };
  }
}

/**
 * Force a refresh of the current page without full reload
 * This is useful for updating the UI after a revalidation
 */
export function forcePageRefresh(): void {
  // Instead of relying solely on the MediaLibraryRefresher,
  // we'll implement a hybrid approach that ensures the page content is refreshed
  
  // 1. Set a flag so components know they should refresh their data
  localStorage.setItem('mediaRefreshTimestamp', Date.now().toString());
  
  // 2. Trigger custom event for components to listen for
  if (typeof window !== 'undefined') {
    // This event can be caught by components to refresh their data directly
    window.dispatchEvent(new CustomEvent('mediaContentRefresh', {
      detail: { timestamp: Date.now() }
    }));
    
    // We still dispatch this for backward compatibility
    window.dispatchEvent(new CustomEvent('mediaLibraryUpdated'));
  }
  
  // 3. For asset detail pages, attempt to trigger a fetch refresh without navigation
  try {
    const currentPath = window.location.pathname;
    // Check if we're on a media detail page
    if (currentPath.match(/\/admin\/media\/[^\/]+$/)) {
      console.log('Refreshing asset detail page content without navigation');
      
      // Get the asset ID from the URL
      const assetId = currentPath.split('/').pop();
      
      // Fetch the asset data directly without navigation
      if (assetId) {
        fetch(`/api/media/asset/${assetId}?_=${Date.now()}`)
          .then(response => response.json())
          .then(data => {
            if (data.success && data.asset) {
              // Dispatch an event with the fresh asset data
              window.dispatchEvent(new CustomEvent('assetDataRefreshed', {
                detail: { asset: data.asset }
              }));
            }
          })
          .catch(error => console.error('Error fetching asset data:', error));
      }
    }
  } catch (error) {
    console.error('Error during refresh:', error);
  }
}
