/**
 * Structured logging.
 *
 * Everything went out as bare console.log/error, which Render captures as
 * plain lines. That's fine to read one at a time and useless the moment you
 * want to answer a question — how often the Massive feed falls back, whether
 * one address is failing every send — because there's nothing to filter on.
 *
 * JSON on one line per event, so the log stream can be grepped by field and
 * piped into anything later without reformatting.
 *
 * Not a logging library: this is four functions over console, and pulling in
 * pino to write JSON would be a dependency for something the platform already
 * does (it captures stdout either way).
 */
type Level = "debug" | "info" | "warn" | "error";

/** Anything worth attaching to an event. Values are stringified as-is. */
export type LogFields = Record<string, unknown>;

function emit(level: Level, message: string, fields?: LogFields) {
  const entry = {
    level,
    // Sortable, and unambiguous across the timezone the server happens to be in.
    time: new Date().toISOString(),
    message,
    ...fields,
  };

  // Tests assert on behaviour, not on log output, and a suite that prints a
  // few hundred JSON lines buries the one failure you care about.
  if (process.env.NODE_ENV === "test") return;

  const line = JSON.stringify(entry, replaceUnserialisable);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Errors serialise to `{}` through JSON.stringify, which is exactly the case
 * you most want in a log line. Unwrap them into something readable and keep
 * the stack, which is the reason for logging an error at all.
 */
function replaceUnserialisable(_key: string, value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
