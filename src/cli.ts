#!/usr/bin/env node
import soundCloudSync from './index';
import logger from './helpers/logger';

/**
 * Defines a command-line option with its properties and validation.
 */
interface ArgOption {
  /** Long form of the option (e.g., --user) */
  name: string;
  /** Short form of the option (e.g., -u) */
  short?: string;
  /** Help text describing the option */
  description: string;
  /** Whether the option is required */
  required?: boolean;
  /** Whether the option expects a value */
  value?: boolean;
  /** Optional validation function for the option's value */
  validate?: (value: string) => string | undefined;
}

/**
 * Parsed command-line arguments mapped by option name.
 */
interface ParsedArgs {
  [key: string]: string | boolean;
}

/**
 * Configuration for the command-line interface.
 */
interface CliConfig {
  /** The command name shown in help */
  command: string;
  /** Available command-line options */
  options: ArgOption[];
  /** Usage examples shown in help */
  examples: string[];
}

const config: CliConfig = {
  command: 'soundcloud-sync',
  options: [
    {
      name: '--user',
      short: '-u',
      description: 'SoundCloud username to fetch likes from',
      required: true,
      value: true,
    },
    {
      name: '--limit',
      short: '-l',
      description: 'Number of latest likes to fetch',
      value: true,
      validate: value => {
        const num = Number(value);
        if (Number.isNaN(num) || num <= 0) {
          return 'must be a positive number';
        }
      },
    },
    {
      name: '--folder',
      short: '-f',
      description: 'Output folder (default: ./music)',
      value: true,
    },
    {
      name: '--help',
      short: '-h',
      description: 'Show this help message',
    },
  ],
  examples: [
    'soundcloud-sync -u realies',
    'soundcloud-sync --user realies --limit 100',
    'soundcloud-sync -u realies -l 100 -f ./my-music',
  ],
};

/**
 * Parses and validates command-line arguments based on a configuration.
 */
class CliParser {
  private config: CliConfig;

  private optionMap: Map<string, ArgOption>;

  /**
   * Creates a new CLI parser with the given configuration.
   *
   * @param cliConfig - The CLI configuration defining options and examples
   */
  constructor(cliConfig: CliConfig) {
    this.config = cliConfig;
    this.optionMap = new Map();

    // Build lookup maps for both long and short options
    config.options.forEach(opt => {
      this.optionMap.set(opt.name, opt);
      if (opt.short) {
        this.optionMap.set(opt.short, opt);
      }
    });
  }

  /**
   * Parses command-line arguments into a key-value map.
   *
   * @param args - Raw command-line arguments to parse
   * @returns Parsed arguments mapped by option name
   * @throws Error if validation fails or required options are missing
   */
  parse(args: string[]): ParsedArgs {
    const parsed: ParsedArgs = {};

    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      const option = this.optionMap.get(arg);

      if (!option) {
        throw new Error(`Unknown argument: ${arg}`);
      }

      if (option.value) {
        if (i + 1 >= args.length || this.optionMap.has(args[i + 1])) {
          throw new Error(`${option.name} requires a value`);
        }
        const value = args[i + 1];
        i += 1;

        if (option.validate) {
          const error = option.validate(value);
          if (error) {
            throw new Error(`${option.name} ${error}`);
          }
        }

        parsed[option.name] = value;
      } else {
        parsed[option.name] = true;
      }
    }

    // Check required options
    this.config.options.forEach(opt => {
      if (opt.required && !parsed[opt.name]) {
        throw new Error(`${opt.name} is required`);
      }
    });

    return parsed;
  }

  /**
   * Formats the help message with options and examples.
   *
   * @returns Formatted help text with ANSI color codes
   */
  formatHelp(): string {
    // Calculate the maximum length of the flags section for alignment
    const maxFlagsLength = this.config.options.reduce((max, opt) => {
      const flags = [opt.name, opt.short].filter(Boolean).join(', ');
      const valueHint = opt.value ? ' <value>' : '';
      const required = opt.required ? ' (required)' : '';
      return Math.max(max, (flags + valueHint + required).length);
    }, 0);

    const lines = ['Usage:', `  ${this.config.command} [options]`, '', 'Options:'];

    this.config.options.forEach(opt => {
      const flags = [opt.name, opt.short].filter(Boolean).join(', ');
      const valueHint = opt.value ? ' <value>' : '';
      const required = opt.required ? ' (required)' : '';
      const flagsPart = flags + valueHint + required;

      const padding = ' '.repeat(maxFlagsLength - flagsPart.length + 4);

      lines.push(`  \x1b[36m${flagsPart}\x1b[0m${padding}${opt.description}`);
    });

    if (this.config.examples.length > 0) {
      lines.push('');
      lines.push('Examples:');
      this.config.examples.forEach(example => {
        lines.push(`  ${example}`);
      });
    }

    return lines.join('\n');
  }
}

// Main CLI execution
(async () => {
  try {
    const cli = new CliParser(config);
    const args = process.argv.slice(2);

    if (args.length === 0) {
      logger.error(cli.formatHelp());
      process.exit(1);
    }

    const parsed = cli.parse(args);

    if (parsed['--help']) {
      logger.error(cli.formatHelp());
      process.exit(0);
    }

    await soundCloudSync({
      username: parsed['--user'] as string,
      folder: parsed['--folder'] as string | undefined,
      limit: parsed['--limit'] ? Number(parsed['--limit']) : undefined,
    });
  } catch (error) {
    logger.error('Error:', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
})();
