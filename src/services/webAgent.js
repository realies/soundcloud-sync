/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-shadow */
/* eslint-disable no-cond-assign */
/* eslint-disable no-param-reassign */
import https from 'https';

export default (url, regexes) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, response => {
        let data = '';
        response.on('data', chunk => {
          data += chunk;
        });
        response.on('end', () => {
          if (!regexes) {
            resolve(data);
          } else {
            resolve(
              Promise.allSettled(
                regexes.map(
                  regex =>
                    new Promise((resolve, reject) => {
                      try {
                        let matches = [];
                        let match;
                        const regexFlags = /\/(.*)\/(.*)|(.*)/g.exec(regex)[2];
                        if (regexFlags.includes('g')) {
                          while ((match = regex.exec(data)) !== null) {
                            if (match.index === regex.lastIndex) {
                              regex.lastIndex += 1;
                            }
                            matches = [...matches, match[1]];
                          }
                        } else {
                          match = regex.exec(data);
                          matches = [...matches, match[1]];
                        }
                        resolve(matches);
                      } catch (error) {
                        reject(error);
                      }
                    }),
                ),
              ),
            );
          }
        });
      })
      .on('error', error => reject(error));
  });
};
