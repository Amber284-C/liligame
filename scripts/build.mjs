// Vite native worker handles need one event-loop turn to close on Windows.
// Keep the CLI exit status; never hide build errors.
if (process.platform === 'win32') {
  const exit = process.exit.bind(process);
  process.exit = (code = 0) => {
    process.exitCode = code;
    setTimeout(() => exit(code), 500);
  };
}
process.argv[2] = 'build';
await import(new URL('../node_modules/vinext/dist/cli.js', import.meta.url).href);
