export interface Env {}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS 및 보안 헤더 설정 (모든 도메인, 모든 헤더, 모든 메서드 허용)
    const securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true', // credentials 허용 (원한다면 제거 가능)
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: securityHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      const imageUrl = url.searchParams.get('url');

      if (!imageUrl) {
        return new Response('Missing URL parameter', {
          status: 400,
          headers: securityHeaders,
        });
      }

      console.log(`Fetching image from: ${imageUrl}`);

      // URL이 유효한지 확인
      try {
        new URL(imageUrl);
      } catch (e) {
        return new Response('Invalid URL format', {
          status: 400,
          headers: securityHeaders,
        });
      }

      // 이미지 가져오기
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'image/*,*/*',
          Referer: new URL(imageUrl).origin,
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      // content-type이 없는 경우 이미지 확장자로 추측
      const finalContentType =
        contentType ||
        (() => {
          const ext = imageUrl.split('.').pop()?.toLowerCase();
          switch (ext) {
            case 'jpg':
            case 'jpeg':
              return 'image/jpeg';
            case 'png':
              return 'image/png';
            case 'gif':
              return 'image/gif';
            case 'webp':
              return 'image/webp';
            default:
              return 'application/octet-stream';
          }
        })();

      // 응답 헤더 설정
      const headers = new Headers(securityHeaders);
      headers.set('Content-Type', finalContentType);
      headers.set('Cache-Control', 'public, max-age=31536000');

      console.log('Successfully proxied image');

      return new Response(response.body, {
        headers,
        status: 200,
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(`Error proxying image: ${error.message}`, {
        status: 500,
        headers: securityHeaders,
      });
    }
  },
};
