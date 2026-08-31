import { OFFICIAL_HOSTS, OFFICIAL_TIMEOUT_MS, OFFICIAL_USER_AGENT } from "../config.js";

const MAX_REDIRECTS = 5;

export class OfficialFetcher {
  async fetchText(url: string): Promise<string> {
    let currentUrl = this.validateUrl(url);
    const signal = AbortSignal.timeout(OFFICIAL_TIMEOUT_MS);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(currentUrl, {
        headers: { "user-agent": OFFICIAL_USER_AGENT },
        redirect: "manual",
        signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error(`Official source redirected without a location: ${currentUrl}`);
        currentUrl = this.validateUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) throw new Error(`Official source returned HTTP ${response.status}: ${currentUrl}`);
      return response.text();
    }

    throw new Error(`Official source exceeded ${MAX_REDIRECTS} redirects: ${url}`);
  }

  private validateUrl(value: string): string {
    const url = new URL(value);
    if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname)) {
      throw new Error(`Refusing non-official source URL: ${value}`);
    }
    return url.toString();
  }
}
