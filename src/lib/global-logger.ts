import LoggerService from "@/services/LoggerService";

export const initializeGlobalLogger = () => {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url = resource.toString();

    // CRITICAL: Avoid infinite loop by not logging calls to the logging endpoint
    if (url.includes('/rest/v1/logs')) {
      return originalFetch(...args);
    }

    const startTime = performance.now();
    let status: number | undefined;
    let ok = false;
    let errorOccurred = false;

    try {
      const response = await originalFetch(...args);
      status = response.status;
      ok = response.ok;
      return response;
    } catch (error) {
      errorOccurred = true;
      LoggerService.error('Network', 'Fetch Error', `Failed request to ${url}`, error);
      throw error;
    } finally {
      // Only log successful/completed requests here. Errors are caught above.
      // We can also log non-200 responses as warnings/errors if preferred.
      if (!errorOccurred) {
         const duration = performance.now() - startTime;
         const method = (config?.method || 'GET').toUpperCase();
         
         const meta = {
           method,
           url,
           status,
           duration_ms: Math.round(duration),
           ok
         };

         if (!ok) {
             LoggerService.warn('Network', 'API Error', `${method} ${url} returned ${status}`, meta);
         } else {
             // Optional: reduce noise by only logging mutations or specific paths?
             // Requirement says "All API calls", so we log all.
             LoggerService.info('Network', 'API Call', `${method} ${url}`, meta);
         }
      }
    }
  };

  // Global Error Handlers
  window.onerror = (message, source, lineno, colno, error) => {
    LoggerService.error('System', 'Global Exception', message.toString(), error, {
      source,
      lineno,
      colno
    });
  };

  window.onunhandledrejection = (event) => {
    LoggerService.error('System', 'Unhandled Promise Rejection', event.reason?.message || 'Unknown rejection', event.reason);
  };
  
  console.log('Global logger initialized');
};
