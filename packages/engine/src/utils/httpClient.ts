// FILE: packages/engine/src/utils/httpClient.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { makeError } from '../types/errors';
import { logger } from './logger';

export function createHttpClient(baseURL?: string): AxiosInstance {
  const client = axios.create({ 
    baseURL, 
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });

  client.interceptors.response.use(
    res => res,
    async (err: AxiosError) => {
      const config = err.config as any;
      if (!config) {
        throw err;
      }
      
      config._retryCount = config._retryCount ?? 0;

      const status = err.response?.status;
      const shouldRetry =
        config._retryCount < 3 &&
        (status === 429 || (status === undefined || status >= 500));

      if (!shouldRetry) {
        throw makeError(
          status === 429 ? 'NETWORK_ERROR' : 'ADAPTER_ERROR',
          `HTTP ${status ?? 'timeout'}: ${err.message}`,
          { url: config.url, attempt: config._retryCount }
        );
      }

      config._retryCount += 1;
      const retryAfter = err.response?.headers ? err.response.headers['retry-after'] : undefined;
      const delay = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(500 * Math.pow(2, config._retryCount), 8000);

      logger.warn(
        { url: config.url, attempt: config._retryCount, delay },
        'Retrying request due to network issue or rate limit'
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return client.request(config);
    }
  );

  return client;
}
