import { load } from 'cheerio';
import { httpClient } from '../../utils/httpClient.js';
import { sleep } from '../../utils/date.js';
import { SCRAPE_INTERVAL_MS } from '../../constants/index.js';
import { ScraperResult, QualificationSchedule } from '../../types/index.js';

export abstract class BaseScraper {
  protected qualificationName: string;
  protected officialUrl: string;

  constructor(qualificationName: string, officialUrl: string) {
    this.qualificationName = qualificationName;
    this.officialUrl = officialUrl;
  }

  abstract fetch(): Promise<ScraperResult>;

  protected async fetchHtml(url: string): Promise<ReturnType<typeof load>> {
    await sleep(SCRAPE_INTERVAL_MS);
    const response = await httpClient.get<string>(url, { responseType: 'text' });
    return load(response.data);
  }

  protected buildResult(): Partial<QualificationSchedule> {
    return {
      source_url: this.officialUrl,
      fetched_at: new Date().toISOString(),
    };
  }
}
