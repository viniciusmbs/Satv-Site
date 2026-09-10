import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Proxy & de-sandbox endpoint for Web Embed players (e.g. EmbedTV)
  app.get('/api/embed-frame', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('Missing "url" query parameter');
      return;
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Referer': targetUrl,
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).send(`Failed to fetch upstream embed: ${upstream.statusText}`);
        return;
      }

      let html = await upstream.text();
      const parsedUrl = new URL(targetUrl);
      const origin = parsedUrl.origin;

      // Neutralize detectSandbox function in upstream scripts
      html = html.replace(
        /function\s+detectSandbox\s*\([^)]*\)\s*\{[\s\S]*?return\s+false;\s*\}/gi,
        'function detectSandbox() { return false; }'
      );
      html = html.replace(
        /if\s*\(\s*detectSandbox\s*\(\s*\)\s*\)/gi,
        'if (false)'
      );

      // Forcefully hide and nullify #sandbox_detect and inject base href
      const injectedTags = `
        <base href="${origin}/">
        <style>
          #sandbox_detect, .sandbox-banner, [id*="sandbox"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        </style>
        <script>
          window.detectSandbox = function() { return false; };
          try {
            Object.defineProperty(window, 'detectSandbox', {
              value: function() { return false; },
              writable: false
            });
          } catch (e) {}
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${injectedTags}`);
      } else {
        html = injectedTags + html;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.send(html);
    } catch (err: any) {
      res.status(502).send('Error loading embed frame: ' + (err.message || String(err)));
    }
  });

  // Stream proxy endpoint to bypass CORS and mixed-content restrictions
  app.get('/api/stream', async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      res.status(400).json({ error: 'Missing "url" query parameter' });
      return;
    }

    try {
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
        return;
      }

      // Forward relevant headers
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(lowerKey)) {
          res.setHeader(key, value);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (!response.body) {
        res.end();
        return;
      }

      const reader = response.body.getReader();
      req.on('close', () => {
        reader.cancel().catch(() => {});
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).json({ error: err.message || 'Error connecting to upstream stream' });
      }
    }
  });

  // Proxy for M3U playlists
  app.get('/api/proxy-playlist', async (req, res) => {
    const playlistUrl = req.query.url as string;
    if (!playlistUrl) {
      res.status(400).json({ error: 'Missing "url" query parameter' });
      return;
    }

    try {
      const upstream = await fetch(playlistUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Failed to fetch playlist: ${upstream.statusText}` });
        return;
      }

      const text = await upstream.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(text);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SATV Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
