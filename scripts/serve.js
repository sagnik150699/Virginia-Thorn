'use strict';
// npm run serve: preview the website on this computer, no Python or extra installs needed.
// It prints an address to open in your browser; press Ctrl+C in this window to stop it.
// Another port:  npm run serve -- --port 9000
// Clean addresses work like on Firebase (/bio shows bio.html), unknown addresses show 404.html,
// and the audio players can seek. Nothing outside this computer can reach the preview.

const path = require('node:path');
const { startServer } = require('./static-server');

const DEFAULT_PORT = 8765;
const ROOT = path.join(__dirname, '..', 'public');

// Reads --port N (or --port=N), then the PORT environment variable.
function chosenPort() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') return Number(args[i + 1]);
    if (args[i].startsWith('--port=')) return Number(args[i].slice('--port='.length));
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: npm run serve [-- --port 9000]');
      process.exit(0);
    }
  }
  return process.env.PORT ? Number(process.env.PORT) : null;
}

// Prints missing files as they are requested, so broken links show up while you click around.
function logProblems(req, status) {
  if (status >= 400) console.log(`  ${status}  ${req.url}`);
}

async function main() {
  const explicit = chosenPort();
  if (explicit !== null && !(Number.isInteger(explicit) && explicit > 0 && explicit < 65536)) {
    console.error('The port must be a whole number between 1 and 65535.');
    process.exit(1);
  }
  // With the default port, try the next few if something else is already using it.
  const ports = explicit !== null ? [explicit] : Array.from({ length: 10 }, (_, i) => DEFAULT_PORT + i);
  for (const port of ports) {
    try {
      const { url } = await startServer({ root: ROOT, port, onRequest: logProblems });
      console.log(`Previewing public/ at ${url}`);
      console.log('Open that address in your browser. Press Ctrl+C here to stop.');
      console.log('Missing files will be listed below as they are requested.');
      return;
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      console.log(`Port ${port} is already in use.`);
    }
  }
  console.error('No free port found. Try: npm run serve -- --port 9000');
  process.exit(1);
}

main().catch((err) => {
  console.error(`Could not start the preview: ${err.message}`);
  process.exit(1);
});
