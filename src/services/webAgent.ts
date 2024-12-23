import https from 'node:https';
import logger from '../helpers/logger';

/**
 * Fetches data from a URL and optionally extracts matches using regular expressions.
 *
 * Behaviour:
 * - Without regexes: Returns complete response data as string
 * - With regexes: Returns array of capture groups for each regex
 *   - Non-global patterns: Can return early when all patterns match
 *   - Global patterns: Must read entire response
 *
 * Response size:
 * - Reports downloaded bytes
 * - Reports total size if Content-Length header is present
 * - For early returns, usually downloaded < total
 *
 * @param url - The URL to fetch data from
 * @param regexes - Optional array of RegExp to match against the response
 * @returns Promise resolving to either:
 *  - string[][] - Array of capture groups for each regex
 *  - string - Raw response data if no regexes provided
 *
 * @example
 * // Fetch complete response
 * const data = await webAgent('https://example.com');
 *
 * @example
 * // Early return when pattern matches
 * const [[id]] = await webAgent('https://example.com', [/id="([^"]+)"/]);
 * console.log(id); // '123'
 *
 * @example
 * // Mixed patterns (must read full response)
 * const matches = await webAgent('https://example.com', [
 *   /id="([^"]+)"/,    // Single match: ['123']
 *   /href="([^"]+)"/g  // All matches: ['/', '/about', '/contact']
 * ]);
 */
export default function webAgent(url: string, regexes?: RegExp[]): Promise<string | string[][]> {
  const needsFullData = !regexes || regexes.some(r => r.flags.includes('g'));
  let operation;
  if (regexes && needsFullData) {
    operation = 'regex_match (with global patterns)';
  } else if (regexes) {
    operation = 'regex_match';
  } else {
    operation = 'fetch';
  }
  logger.debug('webAgent request', {
    url,
    operation,
    patterns: regexes?.map(r => ({ pattern: r.source, flags: r.flags || '' })),
  });

  return new Promise((resolve, reject) => {
    let data = '';
    let resolved = false;

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, response => {
      if (response.statusCode !== 200) {
        logger.error(`HTTP ${response.statusCode}`, { url });
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const totalSize = response.headers['content-length'];
      const logSize = () => ({
        downloaded: `${data.length} bytes`,
        ...(totalSize && { total: `${totalSize} bytes` }),
      });

      response.on('data', chunk => {
        if (resolved) return;
        data += chunk;

        if (!needsFullData && regexes) {
          const results = regexes.map(regex => {
            const matches = data.match(regex);
            return matches ? matches.slice(1) : [];
          });

          if (results.every(r => r.length > 0)) {
            logger.debug('Matches found (early return)', {
              url,
              size: logSize(),
              matches: results.map((r, i) => ({
                pattern: regexes[i].source,
                ...(regexes[i].flags && { flags: regexes[i].flags }),
                result: r.length === 1 ? r[0] : r,
              })),
            });
            resolved = true;
            response.destroy();
            resolve(results);
          }
        }
      });

      response.on('end', () => {
        if (resolved) return;

        if (!regexes) {
          logger.debug('Data fetched', {
            url,
            size: logSize(),
          });
          resolve(data);
          return;
        }

        const results = regexes.map(regex => {
          const matches = data.match(regex);
          return matches ? matches.slice(1) : [];
        });

        logger.debug(results.some(r => r.length > 0) ? 'Matches found' : 'No matches', {
          url,
          size: logSize(),
          matches: results.map((r, i) => ({
            pattern: regexes[i].source,
            ...(regexes[i].flags && { flags: regexes[i].flags }),
            result: r.length === 1 ? r[0] : r,
          })),
        });

        resolve(results);
      });

      response.on('error', error => {
        logger.error('Network error', { url, error: error.message });
        reject(error);
      });
    });

    req.on('error', error => {
      logger.error('Network error', { url, error: error.message });
      reject(error);
    });
  });
}
