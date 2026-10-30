// Run PHP with `npm run backend`. This proxy runs before CRA's public-file server,
// so /api/index.php is executed by PHP rather than served as source in development.
const http = require('http');
module.exports = function setupProxy(app) {
  app.use('/api', (request, response) => {
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: 8081,
        path: request.originalUrl,
        method: request.method,
        headers: { ...request.headers, host: '127.0.0.1:8081' },
        timeout: 15000,
      },
      (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
      },
    );
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => {
      if (!response.headersSent)
        response
          .status(503)
          .json({ error: 'Sign-in service is unavailable. Please try again later.' });
      else response.end();
    });
    request.pipe(upstream);
  });
};
