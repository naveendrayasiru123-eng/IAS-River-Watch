(function () {
  const pages = location.hostname === 'naveendrayasiru123-eng.github.io';
  const base = pages ? 'https://ias-river-watch-wp.naveendrayasiru8128.chatgpt.site' : '';
  let token = null;
  window.IAS_REPORT_ENDPOINT = '/api/reports';
  window.IAS_API = {
    setToken(value) { token = typeof value === 'string' ? value : null; },
    clearToken() { token = null; },
    async fetch(path, options = {}) {
      if (!path.startsWith('/api/')) throw new Error('Invalid API address.');
      const headers = new Headers(options.headers);
      if (pages && token) headers.set('Authorization', 'Bearer ' + token);
      try {
        return await fetch(base + path, {...options, headers, credentials:pages ? 'omit' : 'same-origin'});
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') throw new Error('The request timed out. Please try again.');
        throw new Error('Unable to connect to report storage. Check your connection and try again.');
      }
    },
    async json(response) {
      if (!(response.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('The report service could not be reached. Please refresh the map and try again.');
      }
      return response.json();
    }
  };
})();
