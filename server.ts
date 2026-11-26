import express from 'express';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { parseRecipeFromHtml } from './src/utils/recipeParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3 MB máx.
const FETCH_TIMEOUT_MS = 10000; // 10 segundos

function isPrivateIpAddress(ip: string): boolean {
  if (!ip) return true;

  // Normalizar IPv4-mapped IPv6 (ej: ::ffff:127.0.0.1)
  const normalized = ip.replace(/^::ffff:/i, '');

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true; // link-local fe80::/10
    }
    return false;
  }

  return true;
}

async function validateExternalUrl(rawUrl: string): Promise<{ valid: true; url: URL } | { valid: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: 'La URL introducida no tiene un formato válido.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Solo se permiten direcciones web http:// o https://.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return { valid: false, reason: 'Dirección no permitida por seguridad.' };
  }

  if (net.isIP(host)) {
    if (isPrivateIpAddress(host)) {
      return { valid: false, reason: 'Dirección IP privada no permitida.' };
    }
    return { valid: true, url: parsed };
  }

  try {
    const lookupResult = await dns.lookup(host, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { valid: false, reason: 'No se pudo resolver el dominio de la página web.' };
    }
    for (const entry of lookupResult) {
      if (isPrivateIpAddress(entry.address)) {
        return { valid: false, reason: 'El dominio resuelve a una red privada no permitida.' };
      }
    }
  } catch {
    return { valid: false, reason: 'No se encontró la dirección web o no está disponible.' };
  }

  return { valid: true, url: parsed };
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.text()).slice(0, maxBytes);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }

  const combined = new Uint8Array(total > maxBytes ? maxBytes : total);
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = combined.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
    combined.set(slice, offset);
    offset += slice.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(combined);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // Endpoint seguro para consultar páginas externas y extraer Schema.org/Recipe
  app.post('/api/import-recipe', async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({
        success: false,
        blocked: false,
        error: 'Introduce una URL válida para importar la receta.',
      });
      return;
    }

    const validation = await validateExternalUrl(rawUrl);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        blocked: false,
        error: validation.reason,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(validation.url.toString(), {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeout);

      // Revalidar URL final si hubo redirección
      if (response.url && response.url !== validation.url.toString()) {
        const redirectCheck = await validateExternalUrl(response.url);
        if (!redirectCheck.valid) {
          res.status(400).json({
            success: false,
            blocked: true,
            error: 'La redirección de esta web apunta a una ruta no permitida.',
          });
          return;
        }
      }

      if (!response.ok) {
        const isAntiBot = [401, 403, 429, 503].includes(response.status);
        res.status(200).json({
          success: false,
          blocked: isAntiBot,
          statusCode: response.status,
          error: isAntiBot
            ? `Esta página web bloquea las descargas automáticas (código ${response.status}). Puedes copiar y pegar el contenido manualmente.`
            : `La web devolvió un error (${response.status}). Puedes pegar el contenido manualmente.`,
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        res.status(200).json({
          success: false,
          blocked: false,
          error: 'El enlace no apunta a una página web HTML de receta. Prueba pegando el texto manualmente.',
        });
        return;
      }

      const html = await readLimitedText(response, MAX_HTML_BYTES);
      const parsed = parseRecipeFromHtml(html, validation.url.toString());

      if (!parsed) {
        res.status(200).json({
          success: false,
          blocked: true,
          error:
            'No encontramos datos estructurados de receta (Schema.org) en esta página. Copia los ingredientes y pasos y pégalos en la pestaña «Pegar contenido».',
        });
        return;
      }

      res.status(200).json({
        success: true,
        recipe: parsed,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout = err?.name === 'AbortError';
      res.status(200).json({
        success: false,
        blocked: true,
        error: isTimeout
          ? 'La página web tardó demasiado en responder. Puedes copiar y pegar el contenido manualmente.'
          : 'No pudimos conectar con esa web (puede bloquear accesos externos). Prueba pegando el texto en «Pegar contenido».',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Las Recetas de Peludo server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
