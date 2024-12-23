import https from 'node:https';
import { logger } from '../helpers/logger';

export default function webAgent(url: string, regexes?: RegExp[]): Promise<string | string[][]> {
  const needsFullData = !regexes || regexes.some(r => r.flags.includes('g'));
  logger.debug('webAgent request', {
    url,
    operation: regexes ? 'regex_match' : 'fetch',
    needsFullData,
    patterns: regexes?.map(r => ({ pattern: r.source, flags: r.flags }))
  });

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      (response) => {
        if (response.statusCode !== 200) {
          const error = new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
          logger.error(`HTTP error ${response.statusCode}`, { url });
          reject(error);
          return;
        }

        let data = '';

        if (needsFullData) {
          response.on('data', (chunk) => { data += chunk; });
          response.on('error', (error) => reject(error));
          response.on('end', () => {
            try {
              if (!regexes) {
                logger.debug(`Data fetched (${data.length} bytes)`, { url });
                resolve(data);
              } else {
                const results = regexes.map(regex => {
                  const matches = data.match(regex);
                  return matches ? matches.slice(1) : [];
                });
                
                if (results.some(r => r.length > 0)) {
                  logger.debug('Regex matches found', { url, results });
                } else {
                  logger.debug('No regex matches', { url });
                }
                
                resolve(results);
              }
            } catch (error) {
              logger.error('Error processing response', { url, error: error instanceof Error ? error.message : String(error) });
              reject(error);
            }
          });
          return;
        }

        // For non-global patterns only, try matching as data comes in
        let resolved = false;
        
        response.on('data', (chunk) => {
          if (resolved) return;
          try {
            data += chunk;
            const results = regexes.map(regex => {
              const matches = data.match(regex);
              return matches ? matches.slice(1) : [];
            });

            // If we found all matches, we can stop
            if (results.every(r => r.length > 0)) {
              resolved = true;
              logger.debug('Early match found', { url, results, size: data.length });
              response.destroy(); // Stop receiving data
              resolve(results);
            }
          } catch (error) {
            if (!resolved) {
              logger.error('Error processing chunk', { url, error: error instanceof Error ? error.message : String(error) });
              reject(error);
            }
          }
        });

        response.on('error', (error) => {
          if (!resolved) {
            logger.error('Network error', { url, error: error.message });
            reject(error);
          }
        });

        response.on('end', () => {
          if (!resolved) {
            try {
              const results = regexes.map(regex => {
                const matches = data.match(regex);
                return matches ? matches.slice(1) : [];
              });
              
              if (results.some(r => r.length > 0)) {
                logger.debug('Regex matches found', { url, results, size: data.length });
              } else {
                logger.debug('No regex matches', { url });
              }
              
              resolve(results);
            } catch (error) {
              logger.error('Error processing response', { url, error: error instanceof Error ? error.message : String(error) });
              reject(error);
            }
          }
        });
      }
    );

    req.on('error', (error) => {
      logger.error('Network error', { url, error: error.message });
      reject(error);
    });
  });
}
