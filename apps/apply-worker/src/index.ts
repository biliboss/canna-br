interface Env {
  VIDEOS: R2Bucket;
  NOTIFY_EMAIL: string;
  FROM_EMAIL: string;
  SENDKIT_API_KEY?: string;
  ADMIN_KEY?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://cannabr.org',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // POST /api/apply-video
    if (req.method === 'POST' && url.pathname === '/api/apply-video') {
      try {
        const form = await req.formData();
        const video = form.get('video');
        const name = (form.get('name') || 'unknown').toString();
        const email = (form.get('email') || 'unknown').toString();
        const association = (form.get('association') || 'unknown').toString();
        const consentPublic = (form.get('consent_public') || 'false').toString() === 'true';

        if (!(video instanceof File) && !(video instanceof Blob)) {
          return new Response('Missing video', { status: 400, headers: CORS });
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const key = `candidaturas/${id}.webm`;

        const buf = await (video as Blob).arrayBuffer();
        await env.VIDEOS.put(key, buf, {
          httpMetadata: { contentType: 'video/webm' },
          customMetadata: {
            name, email, association,
            consentPublic: String(consentPublic),
            receivedAt: new Date().toISOString(),
          },
        });

        const downloadUrl = `${url.origin}/api/video/${id}`;
        if (env.SENDKIT_API_KEY) {
          await fetch('https://api.sendkit.dev/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.SENDKIT_API_KEY}` },
            body: JSON.stringify({
              from: env.FROM_EMAIL,
              to: env.NOTIFY_EMAIL,
              reply_to: [email],
              subject: `[canna-br] Nova candidatura: ${association}${consentPublic ? ' [PUBLICAR]' : ' [privada]'}`,
              html: `<h2>Nova candidatura piloto</h2>
                <p><strong>Associação:</strong> ${escapeHtml(association)}</p>
                <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
                <p><strong>Email retorno:</strong> ${escapeHtml(email)}</p>
                <p><strong>Consent público:</strong> ${consentPublic ? 'SIM (publicar)' : 'não'}</p>
                <p><strong>Recibo:</strong> ${id}</p>
                <p><strong>Vídeo:</strong> <a href="${downloadUrl}">${downloadUrl}</a></p>
                <p>R2 key: <code>${key}</code></p>`,
              tags: ['canna-br', 'candidatura-piloto', consentPublic ? 'public' : 'private'],
            }),
          }).catch(() => {});
        }

        return new Response(JSON.stringify({ ok: true, id, key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
      }
    }

    // GET /admin/candidaturas?key=<ADMIN_KEY> — Gabriel-only review UI
    if (req.method === 'GET' && url.pathname === '/admin/candidaturas') {
      const providedKey = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || providedKey !== env.ADMIN_KEY) {
        return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
      }
      const list = await env.VIDEOS.list({ prefix: 'candidaturas/', include: ['customMetadata', 'httpMetadata'] });
      const rows = list.objects.sort((a, b) => (b.uploaded?.getTime() || 0) - (a.uploaded?.getTime() || 0));
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Candidaturas · canna-br review</title>
<meta name="robots" content="noindex,nofollow,nosnippet,noarchive">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #020617; color: #e2e8f0; margin: 0; padding: 24px; }
  h1 { color: #6ee7b7; font-size: 24px; margin-bottom: 4px; }
  .sub { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
  .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .card.public { border-color: #059669; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 13px; color: #cbd5e1; margin-bottom: 12px; }
  .meta b { color: #6ee7b7; }
  video { width: 100%; max-width: 720px; border-radius: 8px; background: #000; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge.public { background: #059669; color: #022c22; }
  .badge.private { background: #475569; color: #e2e8f0; }
  .id { font-family: ui-monospace, monospace; font-size: 11px; color: #64748b; }
</style></head><body>
<h1>Candidaturas piloto · canna-br</h1>
<p class="sub">${rows.length} candidatura(s). Vídeos privados. Apenas Gabriel deve ver esta página.</p>
${rows.map((o) => {
  const m = o.customMetadata || {};
  const isPublic = m.consentPublic === 'true';
  const id = o.key.replace('candidaturas/', '').replace('.webm', '');
  return `<div class="card ${isPublic ? 'public' : ''}">
    <div style="margin-bottom: 10px;"><span class="badge ${isPublic ? 'public' : 'private'}">${isPublic ? 'Pode publicar' : 'Privada'}</span> <span class="id">${escapeHtml(id)}</span></div>
    <div class="meta">
      <div><b>Associação:</b> ${escapeHtml(m.association || '—')}</div>
      <div><b>Nome:</b> ${escapeHtml(m.name || '—')}</div>
      <div><b>Email:</b> ${escapeHtml(m.email || '—')}</div>
      <div><b>Recebido:</b> ${escapeHtml(m.receivedAt || (o.uploaded?.toISOString() || '—'))}</div>
      <div><b>Tamanho:</b> ${(o.size / 1024 / 1024).toFixed(2)} MB</div>
    </div>
    <video controls preload="metadata" src="${url.origin}/api/video/${escapeHtml(id)}?key=${encodeURIComponent(providedKey)}"></video>
  </div>`;
}).join('\n')}
</body></html>`;
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
    }

    // GET /api/intro — public intro pitch video (R2 public/intro-v4.mp4)
    if (req.method === 'GET' && url.pathname === '/api/intro') {
      const obj = await env.VIDEOS.get('public/intro-v4.mp4');
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // GET /api/video/<id> — serves R2 video, requires admin key
    if (req.method === 'GET' && url.pathname.startsWith('/api/video/')) {
      const providedKey = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || providedKey !== env.ADMIN_KEY) {
        return new Response('Forbidden', { status: 403 });
      }
      const id = url.pathname.replace('/api/video/', '');
      const obj = await env.VIDEOS.get(`candidaturas/${id}.webm`);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        status: 200,
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'video/webm',
          'Cache-Control': 'private, max-age=0',
        },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
