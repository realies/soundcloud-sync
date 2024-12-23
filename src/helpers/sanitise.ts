import { Buffer } from 'node:buffer';

/**
 * Sanitises filenames by removing/replacing illegal characters.
 * Based on sanitize-filename package but implemented natively.
 *
 * Handles:
 * - Illegal chars: /\?<>:\*|"
 * - Control chars: C0 (0x00-0x1f) & C1 (0x80-0x9f)
 * - Reserved names: CON, PRN, AUX, etc.
 * - Max length: 255 bytes
 */
export default function sanitiseFilename(
  input: string,
  options: { replacement?: string } = {},
): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be string');
  }

  const replacement = options.replacement ?? '';

  // Split into separate regexes for clarity
  const illegalRe = /[/\\?<>:*|"]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[. ]+$/;

  // First pass with replacement character
  let sanitised = input
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement);

  // Limit to 255 bytes while respecting UTF-8
  if (Buffer.byteLength(sanitised) > 255) {
    let bytes = 0;
    let result = '';
    for (const char of sanitised) {
      const charBytes = Buffer.byteLength(char);
      if (bytes + charBytes > 255) break;
      bytes += charBytes;
      result += char;
    }
    sanitised = result;
  }

  // Second pass with empty replacement if we used a replacement char
  if (replacement !== '') {
    sanitised = sanitised
      .replace(illegalRe, '')
      .replace(controlRe, '')
      .replace(reservedRe, '')
      .replace(windowsReservedRe, '')
      .replace(windowsTrailingRe, '');
  }

  return sanitised;
}
