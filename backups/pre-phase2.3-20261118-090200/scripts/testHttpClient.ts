export class TestCookieClient {
  readonly baseUrl: string;
  readonly cookies = new Map<string, string>();
  csrfToken = '';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  captureSetCookies(headers: Headers) {
    const setCookies =
      typeof (headers as any).getSetCookie === 'function'
        ? ((headers as any).getSetCookie() as string[])
        : [];
    for (const raw of setCookies) {
      const firstPart = raw.split(';')[0];
      const eq = firstPart.indexOf('=');
      if (eq <= 0) continue;
      const name = firstPart.slice(0, eq).trim();
      const val = firstPart.slice(eq + 1).trim();
      if (!val || /;\s*Max-Age=0\b/i.test(raw) || /;\s*Expires=Thu, 01 Jan 1970/i.test(raw)) {
        this.cookies.delete(name);
        if (name === 'cfa_session') {
          this.csrfToken = '';
        }
      } else {
        this.cookies.set(name, val);
      }
    }
  }

  buildCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async initCsrf(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/auth/csrf`, {
      method: 'GET',
      headers: this.cookies.size ? { Cookie: this.buildCookieHeader() } : {},
    });
    this.captureSetCookies(res.headers);
    const data = await res.json();
    if (typeof data?.csrfToken === 'string') {
      this.csrfToken = data.csrfToken;
    }
    return this.csrfToken;
  }

  async request(
    method: string,
    route: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ) {
    const upper = method.toUpperCase();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper);
    if (isMutation && !this.csrfToken) {
      await this.initCsrf();
    }

    const headers: Record<string, string> = {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(this.cookies.size ? { Cookie: this.buildCookieHeader() } : {}),
      ...(isMutation ? { Origin: this.baseUrl } : {}),
      ...(isMutation && this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
      ...(extraHeaders || {}),
    };

    const res = await fetch(`${this.baseUrl}${route}`, {
      method: upper,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    this.captureSetCookies(res.headers);

    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    if (res.ok && data && typeof data === 'object' && typeof data.csrfToken === 'string') {
      this.csrfToken = data.csrfToken;
    }

    return { status: res.status, headers: res.headers, data, rawText };
  }
}
