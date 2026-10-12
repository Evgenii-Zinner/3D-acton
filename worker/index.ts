/**
 * Cloudflare Worker adapter for 3D-Экшон: Суть Такова
 * Serves the Single-Page Application via Cloudflare Workers Static Assets
 * with optimized caching and an Easter Egg meme API endpoint.
 */

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Easter egg API: Суть Такова
    if (url.pathname === '/api/lore' || url.pathname === '/api/meme') {
      return new Response(
        JSON.stringify(
          {
            author: 'Кирилл',
            quote:
              'Здраствуйте. Я, Кирилл. Хотел бы чтобы вы сделали игру, 3Д-экшон суть такова… Пользователь может играть лесными эльфами, охраной дворца и злодеем. И если пользователь играет эльфами то эльфы в лесу, домики деревяные набигают солдаты дворца и злодеи. Можно грабить корованы… И эльфу раз лесные то сделать так что там густой лес и тп… Я джва года хочу такую игру',
            status: 'джва года прошло — игра готова и развёрнута в Cloudflare Workers!',
            factions: ['Лесные эльфы', 'Охрана дворца', 'Злодей'],
            features: [
              'Лесные эльфы в лесу',
              'Домики деревяные',
              'Набигают солдаты дворца и злодеи',
              'Можно грабить корованы',
              'Густой лес и тп…',
            ],
          },
          null,
          2
        ),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'public, max-age=3600',
            'x-meme-author': 'Kirill',
            'x-djva-goda': 'fulfilled',
          },
        }
      );
    }

    // Pass-through to Cloudflare Workers Static Assets binding
    const response = await env.ASSETS.fetch(request);

    // Enhance headers for immutable assets and security
    const headers = new Headers(response.headers);

    if (url.pathname.startsWith('/assets/')) {
      // Vite hashed static assets can be cached immutably for 1 year
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      // HTML documents should revalidate
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
