// SWR fetcher function
async function fetcher(url) {
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      // Try to get error details
      let errorInfo;
      try {
        errorInfo = await res.json();
      } catch {
        errorInfo = { error: `HTTP ${res.status}: ${res.statusText}` };
      }
      
      const error = new Error(errorInfo.error || 'An error occurred while fetching the data.');
      error.info = errorInfo;
      error.status = res.status;
      throw error;
    }
    
    return res.json();
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.status) {
      throw error;
    }
    // Otherwise, wrap it
    const wrappedError = new Error('Network error or failed to fetch data.');
    wrappedError.info = { error: error.message };
    wrappedError.status = 0;
    throw wrappedError;
  }
}

export { fetcher };













