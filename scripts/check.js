'use strict';
// scripts/check.js: the checks for the Virginia Thorn website.
//
// GitHub runs this on every push and deploys the site only when it passes. Running it on your own
// computer is optional, for when something is in doubt; it needs only Node.js 20 or newer.
// The optional browser test (--smoke) also needs puppeteer-core ("npm install" once) and Google Chrome.
//
//   npm run check          checks a to g, a few seconds
//   npm run check:smoke    checks a to h, adds a real-browser test of every page
//
// The checks:
//   a. JavaScript syntax        every .js file in public/ can be read by a browser (node --check)
//   b. CSS braces               every "{" in the .css files in public/ has its "}"
//   c. Pages, links and images  every link, image, audio file and CSS url() points at a real file;
//                               every page has a title, charset and viewport, and pages with the
//                               site navigation also load styles.css and script.js;
//                               YouTube videos use youtube-nocookie.com
//   d. Sitemap                  sitemap.xml lists only files that exist and no hidden pages;
//                               a public page missing from it is a warning for the owner to decide
//   e. Content preservation     no text, image or link from the last commit has gone missing
//                               (the "never delete content" rule in CLAUDE.md)
//   f. Private data and keys    changed files hold no email addresses, phone numbers, UK
//                               postcodes, API keys or private keys
//   g. gitleaks                 the gitleaks secret scanner finds nothing (skipped if not installed)
//   h. Browser smoke test       only with --smoke: every page opens in headless Chrome at desktop
//                               and phone sizes with no errors, missing files or sideways scrolling
//
// Exit code: 0 when nothing failed (warnings and skipped checks are not failures), 1 when something failed.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HELP = `Usage: node scripts/check.js [options]

  --smoke            also open every page in headless Chrome (check h)
  --allow-removals   removed text, images or links become a warning instead of a
                     failure. Only for removals the owner asked for. On GitHub,
                     a pushed commit message containing [allow-removals] does
                     the same (so does CHECK_ALLOW_REMOVALS=1 on this computer).
  --base <commit>    compare with this commit instead of HEAD (GitHub uses this
                     to check everything in a push)
  --changed-only     compare only pages that changed (the default)
  --quiet            print only problems and the summary
  --help             show this help`;

if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error(`These checks need Node.js 20 or newer, and this computer has ${process.version}.`);
  console.error('Install the current LTS version from https://nodejs.org and try again.');
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://virginiathorn.com/';

// Pages that are hidden from search engines and must never appear in sitemap.xml
const NOT_IN_SITEMAP = new Set(['404.html', 'cv.html']);

// The window sizes for the browser smoke test: a laptop screen and a phone
const VIEWPORTS = [
  { label: 'desktop 1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { label: 'phone 390x844', width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
];

// Text that check f may ignore, because the owner has confirmed it is meant to be public.
// Nothing goes here without the owner's approval. Each entry matches that exact text in any file:
//   { text: 'the exact text that was found', why: 'what it is, who approved it, and when' },
const ALLOWED_PRIVATE_DATA = [
  { text: 'your@email.com', why: 'made-up placeholder inside the contact form mock-up, not a real address; approved by Sagnik Bhattacharya 2026-11-03' },
];

// ---------------------------------------------------------------------------------------------
// Options and printing
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { smoke: false, allowRemovals: false, base: undefined, quiet: false, help: false, unknown: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--smoke') opts.smoke = true;
    else if (arg === '--allow-removals') opts.allowRemovals = true;
    else if (arg === '--changed-only') continue; // already the default
    else if (arg === '--quiet' || arg === '-q') opts.quiet = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--base') opts.base = argv[++i] ?? '';
    else if (arg.startsWith('--base=')) opts.base = arg.slice('--base='.length);
    else opts.unknown.push(arg);
  }
  return opts;
}

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const STATUS_COLOR = { PASS: 32, FAIL: 31, SKIP: 33, WARN: 33 };
const MAX_LINES_PER_CHECK = 80;

const say = (line = '') => console.log(line);
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// One check's outcome: problems make it FAIL (or WARN when they are allowed), notes are extra detail.
class CheckResult {
  constructor(letter, title) {
    this.letter = letter;
    this.title = title;
    this.status = 'PASS';
    this.problems = [];
    this.notes = [];
    this.fix = '';
    this.skipReason = '';
    this.warning = ''; // set when problems were found but explicitly allowed
    this.warnings = []; // worth a look, but they do not stop a commit
    this.ms = 0;
  }
  fail(message) {
    this.problems.push(message);
  }
  warn(message) {
    this.warnings.push(message);
  }
  note(message) {
    this.notes.push(message);
  }
  skip(reason) {
    this.skipReason = reason;
  }
  finish() {
    if (this.skipReason) this.status = 'SKIP';
    else if (this.problems.length) this.status = this.warning ? 'WARN' : 'FAIL';
    else if (this.warnings.length) this.status = 'WARN';
  }
}

function printResult(r, opts) {
  say(`${paint(STATUS_COLOR[r.status], r.status.padEnd(4))}  ${r.letter}. ${r.title}  (${seconds(r.ms)})`);
  const indent = (line) => say(`      ${line}`);
  if (r.status === 'SKIP') indent(r.skipReason);
  r.problems.slice(0, MAX_LINES_PER_CHECK).forEach(indent);
  if (r.problems.length > MAX_LINES_PER_CHECK) indent(`...and ${r.problems.length - MAX_LINES_PER_CHECK} more like these.`);
  r.warnings.forEach((w) => indent(`${paint(33, 'Warning:')} ${w}`));
  if (!opts.quiet) r.notes.forEach((n) => indent(paint(2, n))); // how to fix each failure is in the summary
}

function printSummary(results, totalMs) {
  const failed = results.filter((r) => r.status === 'FAIL');
  const skipped = results.filter((r) => r.status === 'SKIP');
  // Warnings never fail a check: allowed removals (r.warning) and things for the owner to decide (r.warnings)
  const warningLines = results.flatMap((r) => [
    ...(r.status === 'WARN' && r.warning ? [r.warning] : []),
    ...r.warnings,
  ].map((w) => `  ${paint(33, 'Warning')} for ${r.letter}. ${r.title}: ${w}`));
  const total = results.length;
  const withWarnings = warningLines.length ? `, with ${plural(warningLines.length, 'warning')} below` : '';
  say('');
  say('-'.repeat(72));
  if (failed.length === 0 && skipped.length === 0) {
    say(`${paint(32, `All ${total} checks passed`)} in ${seconds(totalMs)}${withWarnings}.`);
  } else if (failed.length === 0) {
    say(`${paint(32, `${total - skipped.length} of ${total} checks passed`)} and ${skipped.length} skipped; nothing failed (${seconds(totalMs)})${withWarnings}.`);
  } else {
    say(`${paint(31, `${failed.length} of ${total} checks FAILED`)} (${seconds(totalMs)}):`);
    for (const r of failed) {
      say(`  ${r.letter}. ${r.title}: ${plural(r.problems.length, 'problem')}.`);
      if (r.fix) say(`     Fix: ${r.fix}`);
    }
  }
  for (const r of skipped) say(`  Skipped ${r.letter}. ${r.title}: ${r.skipReason}`);
  warningLines.forEach((line) => say(line));
  if (failed.length) say('Fix the problems listed above and push again; "npm run check" shows the same results on your computer.');
}

// ---------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------

// Every file Firebase would publish from public/, as paths like "assets/images/home/hero-wide.jpg".
// Firebase skips files whose name starts with a dot, and node_modules.
function listPublicFiles(dir = PUBLIC_DIR, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const rel = prefix + entry.name;
    if (entry.isDirectory()) files.push(...listPublicFiles(path.join(dir, entry.name), `${rel}/`));
    else if (entry.isFile() && !entry.name.startsWith('.')) files.push(rel);
  }
  return files.sort();
}

const publicFiles = fs.existsSync(PUBLIC_DIR) ? listPublicFiles() : [];
const publicSet = new Set(publicFiles);
const publicByLowerCase = new Map(publicFiles.map((f) => [f.toLowerCase(), f]));
const pages = publicFiles.filter((f) => f.endsWith('.html'));

const readPublic = (rel) => fs.readFileSync(path.join(PUBLIC_DIR, rel), 'utf8');

// Pages are read and parsed once, then shared by the checks that need them
const parsedPages = new Map();
function getPage(rel) {
  if (!parsedPages.has(rel)) {
    const html = readPublic(rel);
    parsedPages.set(rel, { html, doc: parseHtml(html) });
  }
  return parsedPages.get(rel);
}

// Folder of a path inside public/, "" for the top level
function folderOf(rel) {
  const dir = path.posix.dirname(rel);
  return dir === '.' ? '' : dir;
}

// Returns a function that turns a character position in some text into a line number
function lineFinder(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

// Works out which file in public/ an address points at, the way Firebase would serve it
// ("bio" finds bio.html, "/" finds index.html). Returns null for addresses this check
// ignores (other websites, #anchors, mailto:, tel:, data:), otherwise { target, exists, reason }.
function resolveLocal(raw, fromFolder) {
  let url = raw.trim();
  if (!url || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  url = url.replace(/[?#].*$/, '');
  if (!url) return null;
  try {
    url = decodeURI(url);
  } catch {
    // keep it as written
  }
  let rel = path.posix.normalize((url.startsWith('/') ? url.slice(1) : path.posix.join(fromFolder, url)) || '.');
  if (rel === '..' || rel.startsWith('../')) {
    return { target: rel, exists: false, reason: 'it points outside public/, and only public/ is published' };
  }
  if (rel === '.' || rel === './') rel = '';

  const candidates = [];
  if (rel === '' || rel.endsWith('/')) candidates.push(`${rel}index.html`);
  else {
    candidates.push(rel);
    if (!path.posix.extname(rel)) candidates.push(`${rel}.html`, `${rel}/index.html`);
  }
  for (const candidate of candidates) if (publicSet.has(candidate)) return { target: candidate, exists: true };
  for (const candidate of candidates) {
    const real = publicByLowerCase.get(candidate.toLowerCase());
    if (real) {
      return {
        target: candidate,
        exists: false,
        reason: `the file is really called ${real}; upper/lower case matters on the live site even though Windows ignores it`,
      };
    }
  }
  return { target: candidates[0], exists: false, reason: `public/${candidates[0]} does not exist` };
}

// Absolute addresses on the site's own domain, such as share images and canonical links
const SITE_URL_PATTERN = /https?:\/\/(?:www\.)?virginiathorn\.com(?![\w-]|\.[\w-])([^\s"'<>()[\]{}\\,]*)/gi;
function siteUrlsIn(text) {
  const found = [];
  for (const m of text.matchAll(SITE_URL_PATTERN)) {
    const urlPath = m[1].replace(/[.!?;:]+$/, ''); // a full stop after an address in a sentence
    found.push({ url: m[0].slice(0, m[0].length - (m[1].length - urlPath.length)), urlPath, index: m.index });
  }
  return found;
}

// Finds url(...) and @import addresses in CSS, ignoring comments. Returns [{ url, index }].
function cssUrls(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const found = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi;
  for (const m of withoutComments.matchAll(pattern)) {
    const url = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    if (url) found.push({ url, index: m.index });
  }
  return found;
}

// "a.jpg 1x, b.jpg 2x" -> ["a.jpg", "b.jpg"]
function srcsetUrls(value) {
  if (/data:/i.test(value)) return [];
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

// ---------------------------------------------------------------------------------------------
// HTML reading (just enough for hand-written pages; no dependencies)
// ---------------------------------------------------------------------------------------------

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', middot: '·', bull: '•', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', times: '×', divide: '÷', deg: '°', pound: '£',
  euro: '€', larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔',
  eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ccedil: 'ç', auml: 'ä',
  ouml: 'ö', uuml: 'ü', Eacute: 'É', shy: '­', zwj: '‍', zwnj: '‌',
};

function decodeEntities(text) {
  if (!text.includes('&')) return text;
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return Object.hasOwn(ENTITIES, body) ? ENTITIES[body] : whole;
  });
}

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

const RAW_TEXT_TAGS = new Set(['script', 'style']); // their contents are code, never shown as text
const PLAIN_TEXT_TAGS = new Set(['title', 'textarea']); // their contents are text with no tags inside
const TAG_START = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)/y;

// Splits a page into its tags (name, attributes, line number) and its visible text pieces.
// Comments are skipped, and the contents of <script> and <style> never count as text.
function parseHtml(html) {
  const tags = [];
  const texts = [];
  let title = null;
  let pos = 0;
  let line = 1;
  let openLink = null; // the <a> whose words are being read, so a changed link can be described

  const moveTo = (to) => {
    for (let k = pos; k < to; k++) if (html.charCodeAt(k) === 10) line++;
    pos = to;
  };
  const addText = (raw) => {
    const text = collapse(decodeEntities(raw));
    if (!text) return;
    texts.push(text);
    if (openLink) openLink.text = openLink.text ? `${openLink.text} ${text}` : text;
  };

  while (pos < html.length) {
    const lt = html.indexOf('<', pos);
    if (lt === -1) {
      addText(html.slice(pos));
      moveTo(html.length);
      break;
    }
    if (lt > pos) {
      addText(html.slice(pos, lt));
      moveTo(lt);
    }
    if (html.startsWith('<!--', pos)) {
      const end = html.indexOf('-->', pos + 4);
      moveTo(end === -1 ? html.length : end + 3);
      continue;
    }
    if (html[pos + 1] === '!' || html[pos + 1] === '?') {
      // <!DOCTYPE html> and similar
      const end = html.indexOf('>', pos);
      moveTo(end === -1 ? html.length : end + 1);
      continue;
    }
    TAG_START.lastIndex = pos;
    const m = TAG_START.exec(html);
    if (!m) {
      // a "<" that does not start a tag is just text
      addText('<');
      moveTo(pos + 1);
      continue;
    }

    const closing = m[1] === '/';
    const tag = { name: m[2].toLowerCase(), attrs: Object.create(null), line };
    let i = pos + m[0].length;
    // Read attributes up to the closing ">", keeping quoted values whole even if they contain ">"
    while (i < html.length) {
      const ch = html[i];
      if (ch === '>') {
        i++;
        break;
      }
      if (ch === '/' || /\s/.test(ch)) {
        i++;
        continue;
      }
      let j = i;
      while (j < html.length && !/[\s=>]/.test(html[j]) && !(html[j] === '/' && html[j + 1] === '>')) j++;
      const name = html.slice(i, j).toLowerCase();
      i = j;
      while (i < html.length && /\s/.test(html[i])) i++;
      let value = '';
      if (html[i] === '=') {
        i++;
        while (i < html.length && /\s/.test(html[i])) i++;
        const quote = html[i];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, i + 1);
          value = html.slice(i + 1, end === -1 ? html.length : end);
          i = end === -1 ? html.length : end + 1;
        } else {
          let end = i;
          while (end < html.length && !/[\s>]/.test(html[end])) end++;
          value = html.slice(i, end);
          i = end;
        }
      }
      if (name && !(name in tag.attrs)) tag.attrs[name] = decodeEntities(value);
    }
    moveTo(i);
    if (closing) {
      if (tag.name === 'a') openLink = null;
      continue;
    }
    tags.push(tag);
    if (tag.name === 'a') {
      tag.text = '';
      openLink = tag;
    }

    if (RAW_TEXT_TAGS.has(tag.name) || PLAIN_TEXT_TAGS.has(tag.name)) {
      // Everything up to the matching end tag belongs to this element
      const endTag = new RegExp(`</${tag.name}\\s*>`, 'ig');
      endTag.lastIndex = pos;
      const end = endTag.exec(html);
      const content = html.slice(pos, end ? end.index : html.length);
      tag.contentLine = line;
      if (RAW_TEXT_TAGS.has(tag.name)) {
        tag.content = content;
      } else {
        addText(content);
        if (tag.name === 'title' && title === null) title = collapse(decodeEntities(content));
      }
      moveTo(end ? end.index + end[0].length : html.length);
    }
  }
  return { tags, texts, title };
}

// Splits text into words and punctuation marks, so the comparison ignores spacing and line breaks.
// Curly and straight quotes, and the various dashes, count as the same character.
function tokenize(text) {
  const normal = text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, '-');
  return normal.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
}

// Turns an address into a form in which two ways of writing the same destination are equal:
// "bio.html", "./bio.html" and "/bio" are one page; http and https are one site; a YouTube
// video is the same video on youtube.com and youtube-nocookie.com.
function comparableRef(raw, folder) {
  const value = collapse(raw);
  if (!value) return null;
  if (value.startsWith('#')) return value;
  const web = /^(?:https?:)?\/\/([^/?#]*)(.*)$/i.exec(value);
  if (web) {
    const host = web[1].toLowerCase();
    const video = /^\/embed\/([\w-]+)/.exec(web[2]);
    if (video && /(^|\.)youtube(-nocookie)?\.com$/.test(host)) return `youtube-video:${video[1]}`;
    return `https://${host}${web[2]}`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value.replace(/^[a-z][a-z0-9+.-]*:/i, (s) => s.toLowerCase());
  const cut = value.search(/[?#]/);
  const pathPart = cut === -1 ? value : value.slice(0, cut);
  const suffix = cut === -1 ? '' : value.slice(cut);
  let target = path.posix.normalize((pathPart.startsWith('/') ? pathPart.slice(1) : path.posix.join(folder, pathPart)) || '.');
  if (target === '.') target = '';
  target = target.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  return `site:/${target}${suffix}`;
}

// What the "never delete content" rule protects on one page: its visible text, the addresses of
// its images, audio and video (src, data-src, srcset, poster), and the addresses of its links (href).
const TOKEN_SEP = '\u0001';
const MEDIA_ATTRS = new Set(['src', 'data-src', 'srcset', 'poster']);

function pageContent(html, rel) {
  const doc = parseHtml(html);
  const folder = folderOf(rel);
  const words = [];
  for (const text of doc.texts) for (const token of tokenize(text)) words.push(token);
  const media = new Map(); // comparable address -> the address as written
  const links = new Map();
  const linkWords = new Map(); // comparable address -> the words of the link, e.g. "Spotlight"
  const linkByWords = new Map(); // the words of a link -> its address as written
  const add = (map, value) => {
    const key = comparableRef(value, folder);
    if (key !== null && !map.has(key)) map.set(key, collapse(value));
  };
  for (const tag of doc.tags) {
    for (const [name, value] of Object.entries(tag.attrs)) {
      if (name === 'href') add(links, value);
      else if (MEDIA_ATTRS.has(name)) for (const url of name === 'srcset' ? srcsetUrls(value) : [value]) add(media, url);
    }
    // Images shown through CSS on the page itself: style="" attributes and <style> blocks
    const css = `${tag.attrs.style || ''}\n${tag.name === 'style' ? tag.content || '' : ''}`;
    for (const url of cssMediaUrls(css)) add(media, url);
    if (tag.name === 'a' && tag.text && tag.attrs.href !== undefined) {
      const key = comparableRef(tag.attrs.href, folder);
      if (key !== null && !linkWords.has(key)) linkWords.set(key, tag.text);
      if (!linkByWords.has(tag.text)) linkByWords.set(tag.text, collapse(tag.attrs.href));
    }
  }
  return { texts: doc.texts, words: TOKEN_SEP + words.join(TOKEN_SEP) + TOKEN_SEP, media, links, linkWords, linkByWords };
}

// Image, audio and video files that CSS refers to with url(). Fonts and inline data: images are
// design rather than the client's material, so the "never delete content" rule leaves them out.
const MEDIA_FILE = /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|mp3|m4a|wav|ogg|flac|mp4|webm|mov)$/i;
function cssMediaUrls(css) {
  return cssUrls(css)
    .map(({ url }) => url.trim())
    .filter((url) => !/^data:/i.test(url) && MEDIA_FILE.test(url.replace(/[?#].*$/, '')));
}

// What the rule protects in a stylesheet: the images, audio and video it shows
function cssContent(css, rel) {
  const folder = folderOf(rel);
  const media = new Map();
  for (const url of cssMediaUrls(css)) {
    const key = comparableRef(url, folder);
    if (key !== null && !media.has(key)) media.set(key, collapse(url));
  }
  return { texts: [], words: TOKEN_SEP, media, links: new Map(), linkWords: new Map(), linkByWords: new Map() };
}

// True when the words of `text` appear, in order and next to each other, somewhere on the page
function pageHasText(content, text) {
  const tokens = tokenize(text);
  return tokens.length === 0 || content.words.includes(TOKEN_SEP + tokens.join(TOKEN_SEP) + TOKEN_SEP);
}

// The pieces of `from` (in page order) that `other` lacks, with neighbouring pieces joined,
// so a deleted paragraph that contains links is reported as one quote rather than in fragments
function missingText(from, other) {
  const runs = [];
  let run = [];
  for (const text of from.texts) {
    if (!pageHasText(other, text)) run.push(text);
    else if (run.length) runs.push(run.splice(0).join(' '));
  }
  if (run.length) runs.push(run.join(' '));
  return runs;
}

// ---------------------------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------------------------

// Runs git in the repository and returns its output, or null when it fails
function git(args) {
  const res = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (res.error || res.status !== 0) return null;
  return res.stdout;
}

// Decides what to compare the working copy with: HEAD (the last commit), or the --base commit.
function comparisonBase(opts) {
  if (git(['rev-parse', '--is-inside-work-tree']) === null) {
    return { problem: 'git is not installed or this folder is not a git repository, so there is nothing to compare with.' };
  }
  let ref = 'HEAD';
  let note = '';
  if (opts.base !== undefined) {
    if (opts.base === '' || /^0+$/.test(opts.base)) {
      note = 'No earlier commit was given (a brand-new branch?), so the comparison is with HEAD.';
    } else if (opts.base.startsWith('-')) {
      return { problem: `"${opts.base}" is not a commit.` };
    } else {
      ref = opts.base;
    }
  }
  const sha = (git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) || '').trim();
  if (!sha) {
    return {
      problem:
        ref === 'HEAD'
          ? 'This repository has no commits yet, so there is nothing to compare with.'
          : `Commit ${ref} is not in this copy of the history (was the history rewritten?), so nothing was compared.`,
    };
  }
  const headSha = (git(['rev-parse', 'HEAD']) || '').trim();
  const label = ref === 'HEAD' ? `the last commit (HEAD, ${sha.slice(0, 7)})` : `commit ${sha.slice(0, 7)}`;
  return { ref, sha, headSha, label, note };
}

// Files that differ from the comparison commit, including new files git does not track yet
// (git-ignored files such as node_modules are left out). status: M changed, A added, D deleted.
function listChanges(sha) {
  const changes = [];
  const diff = git(['diff', '--name-status', '--no-renames', '-z', sha, '--']);
  if (diff === null) throw new Error('git diff failed');
  const parts = diff.split('\0');
  for (let i = 0; i + 1 < parts.length; i += 2) {
    if (parts[i]) changes.push({ status: parts[i][0], path: parts[i + 1] });
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']) || '';
  for (const file of untracked.split('\0')) if (file) changes.push({ status: 'A', path: file, untracked: true });
  return changes;
}

// Files renamed since the comparison commit. Returns { renames: old path -> new path,
// sameContent: old path -> every new path with exactly its content }. Three sources, so a rename
// counts however it was made:
//   1. git diff -M: the working copy against that commit (git mv, or a move that was added)
//   2. git status: renames staged in the index, even if the file was edited a lot afterwards
//   3. the same content at a new path (moved without git, or new names for identical copies)
// A "rename" whose old file still exists is really a copy, so it does not count.
function listRenames(sha, changes) {
  const renames = new Map();
  const diff = (git(['diff', '--name-status', '-M', '-z', sha, '--']) || '').split('\0');
  for (let i = 0; i < diff.length && diff[i]; ) {
    const status = diff[i];
    if (status[0] === 'R') renames.set(diff[i + 1], diff[i + 2]); // R100, old path, new path
    i += status[0] === 'R' || status[0] === 'C' ? 3 : 2;
  }
  const staged = (git(['status', '--porcelain=v1', '-z', '--untracked-files=no']) || '').split('\0');
  for (let i = 0; i < staged.length && staged[i]; i++) {
    const flags = staged[i].slice(0, 2);
    if (!/[RC]/.test(flags)) continue;
    const from = staged[++i]; // with -z the old path comes after the new one
    if (flags.includes('R') && !renames.has(from)) renames.set(from, staged[i - 1].slice(3));
  }
  // 3. Same content at a new path. Several old files can share one picture (the site has identical
  //    copies under different names), so every new file with that exact content is remembered.
  const sameContent = new Map(); // old path -> every new path holding exactly its content
  const gone = changes.filter((c) => c.status === 'D').map((c) => c.path);
  const fresh = changes.filter((c) => c.status === 'A').map((c) => c.path);
  if (gone.length && fresh.length) {
    const blobOf = new Map(); // path -> content id at the comparison commit
    for (const entry of (git(['ls-tree', '-r', '-z', sha]) || '').split('\0')) {
      const m = /^\d+ blob ([0-9a-f]+)\t([\s\S]+)$/.exec(entry);
      if (m) blobOf.set(m[2], m[1]);
    }
    const hashed = spawnSync('git', ['hash-object', '--stdin-paths'], { cwd: ROOT, input: `${fresh.join('\n')}\n`, encoding: 'utf8' });
    const hashes = hashed.status === 0 ? hashed.stdout.split(/\r?\n/) : [];
    const freshByContent = new Map();
    fresh.forEach((file, i) => {
      if (!hashes[i]) return;
      if (!freshByContent.has(hashes[i])) freshByContent.set(hashes[i], []);
      freshByContent.get(hashes[i]).push(file);
    });
    for (const file of gone) {
      const same = freshByContent.get(blobOf.get(file));
      if (same) sameContent.set(file, same);
    }
    // Pair old and new names one to one for the "renamed:" lines, preferring the same folder and
    // the most words in common; the pairing only affects the wording, not what passes
    const words = (p) => new Set(path.posix.basename(p).replace(/\.[^.]+$/, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    const likeness = (a, b) => (path.posix.dirname(a) === path.posix.dirname(b) ? 100 : 0) + [...words(a)].filter((w) => words(b).has(w)).length;
    const options = [];
    for (const [from, tos] of sameContent) if (!renames.has(from)) for (const to of tos) options.push({ from, to, score: likeness(from, to) });
    options.sort((a, b) => b.score - a.score);
    const taken = new Set(renames.values());
    for (const { from, to } of options) {
      if (!renames.has(from) && !taken.has(to)) {
        renames.set(from, to);
        taken.add(to);
      }
    }
    for (const [from, tos] of sameContent) if (!renames.has(from)) renames.set(from, tos[0]); // more old copies than new ones
  }
  for (const [from, to] of renames) {
    if (fs.existsSync(path.join(ROOT, from)) || !fs.existsSync(path.join(ROOT, to))) renames.delete(from);
  }
  return { renames, sameContent };
}

// Whether removed content is allowed this time, and why
function removalPermission(opts, compare) {
  if (opts.allowRemovals) return { allowed: true, how: 'the --allow-removals option was used' };
  if (/^(1|true|yes)$/i.test(process.env.CHECK_ALLOW_REMOVALS || '')) {
    return { allowed: true, how: 'CHECK_ALLOW_REMOVALS=1 was set (the same as --allow-removals)' };
  }
  if (compare.sha && compare.sha !== compare.headSha) {
    const messages = git(['log', '--format=%B', `${compare.sha}..HEAD`]) || '';
    if (/\[allow-removals\]/i.test(messages)) {
      return { allowed: true, how: `a commit message since ${compare.sha.slice(0, 7)} contains [allow-removals]` };
    }
  }
  return { allowed: false };
}

// ---------------------------------------------------------------------------------------------
// a. JavaScript syntax
// ---------------------------------------------------------------------------------------------

async function checkJavaScript(r) {
  const scripts = publicFiles.filter((f) => f.endsWith('.js'));
  for (const rel of scripts) {
    const res = spawnSync(process.execPath, ['--check', path.join(PUBLIC_DIR, rel)], { encoding: 'utf8' });
    if (res.status === 0) r.note(`public/${rel} parses.`);
    else {
      const message = (res.stderr || res.error?.message || '').trim().split(/\r?\n/).slice(0, 8);
      r.fail(`public/${rel} has a syntax error:`);
      message.forEach((l) => r.fail(`    ${l}`));
    }
  }
  if (!scripts.length) r.note('No .js files in public/.');
  r.fix = 'Open the file at the line shown and fix the typo there (often a missing bracket, quote or comma).';
}

// ---------------------------------------------------------------------------------------------
// b. CSS braces
// ---------------------------------------------------------------------------------------------

// Walks through CSS, skipping comments and quoted strings, and reports any "}" without a "{"
// and any "{" that is never closed, with line numbers.
function braceProblems(css) {
  const problems = [];
  const open = []; // line numbers of "{" not yet closed
  let line = 1;
  let opened = 0;
  let closed = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '\n') {
      line++;
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      if (end === -1) problems.push(`line ${line}: a /* comment is never closed with */`);
      for (let k = i; k < stop; k++) if (css.charCodeAt(k) === 10) line++;
      i = stop - 1;
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch && css[j] !== '\n') j += css[j] === '\\' ? 2 : 1;
      for (let k = i; k < j && k < css.length; k++) if (css.charCodeAt(k) === 10) line++;
      i = css[j] === '\n' ? j - 1 : j;
    } else if (ch === '{') {
      opened++;
      open.push(line);
    } else if (ch === '}') {
      closed++;
      if (open.length) open.pop();
      else problems.push(`line ${line}: this "}" has no matching "{"`);
    }
  }
  for (const l of open) problems.push(`line ${l}: this "{" is never closed`);
  return { problems, opened, closed };
}

async function checkCss(r) {
  const sheets = publicFiles.filter((f) => f.endsWith('.css'));
  for (const rel of sheets) {
    const { problems, opened, closed } = braceProblems(readPublic(rel));
    for (const p of problems) r.fail(`public/${rel} ${p}`);
    if (!problems.length) r.note(`public/${rel}: ${opened} "{" and ${closed} "}", all matched.`);
  }
  r.fix = 'Add the missing "}" (or remove the extra one) near the line shown. A "{" that is never closed usually means the "}" is missing at the end of that rule.';
}

// ---------------------------------------------------------------------------------------------
// c. Pages, links and images
// ---------------------------------------------------------------------------------------------

const REF_ATTRS = ['href', 'src', 'srcset', 'poster', 'data-src', 'xlink:href'];

function isYouTubeComEmbed(value) {
  const m = /^(?:https?:)?\/\/([^/?#]+)(\/[^?#]*)?/i.exec(value.trim());
  if (!m) return false;
  const host = m[1].toLowerCase();
  return (host === 'youtube.com' || host.endsWith('.youtube.com')) && (m[2] || '').startsWith('/embed');
}

async function checkPages(r) {
  let localRefs = 0;
  let siteRefs = 0;
  const standalone = []; // pages without the site navigation

  // Absolute addresses on virginiathorn.com must exist in public/ too (share images, canonical links)
  const checkSiteUrls = (text, label, lineOf) => {
    for (const { url, urlPath, index } of siteUrlsIn(text)) {
      siteRefs++;
      const res = resolveLocal(`/${urlPath}`, '');
      if (res && !res.exists) r.fail(`${label}:${lineOf(index)} ${url}: ${res.reason}`);
    }
  };

  for (const rel of pages) {
    const { html, doc } = getPage(rel);
    const label = `public/${rel}`;
    const folder = folderOf(rel);
    const lineOf = lineFinder(html);
    const checkRef = (url, line, what) => {
      const res = resolveLocal(url, folder);
      if (!res) return;
      localRefs++;
      if (!res.exists) r.fail(`${label}:${line} ${what}: ${res.reason}`);
    };

    for (const tag of doc.tags) {
      // 1. Every link, image, audio file and script on this site must exist
      for (const attr of REF_ATTRS) {
        const value = tag.attrs[attr];
        if (value === undefined) continue;
        const urls = attr === 'srcset' ? srcsetUrls(value) : [value];
        for (const url of urls) checkRef(url, tag.line, `<${tag.name} ${attr}="${url}">`);
      }
      // ...including url() in style="" attributes and <style> blocks
      if (tag.attrs.style) for (const { url } of cssUrls(tag.attrs.style)) checkRef(url, tag.line, `style url(${url})`);
      if (tag.name === 'style' && tag.content) {
        const lineInBlock = lineFinder(tag.content);
        for (const { url, index } of cssUrls(tag.content)) checkRef(url, tag.contentLine + lineInBlock(index) - 1, `url(${url})`);
      }
      // 2. Structured data for search engines must be valid JSON
      if (tag.name === 'script' && /ld\+json/i.test(tag.attrs.type || '') && tag.content !== undefined) {
        try {
          JSON.parse(tag.content);
        } catch (err) {
          r.fail(`${label}:${tag.line} the <script type="application/ld+json"> block is not valid JSON (${err.message})`);
        }
      }
      // 3. YouTube videos must come from youtube-nocookie.com (no tracking cookies until played)
      if (tag.name === 'iframe') {
        for (const attr of ['src', 'data-src']) {
          const value = tag.attrs[attr];
          if (value && isYouTubeComEmbed(value)) {
            r.fail(`${label}:${tag.line} <iframe ${attr}="${value}"> uses youtube.com; use https://www.youtube-nocookie.com/embed/... instead`);
          }
        }
      }
    }
    checkSiteUrls(html, label, lineOf);

    // 4. The basics every page needs
    const meta = (name) => doc.tags.find((t) => t.name === 'meta' && (t.attrs.name || '').toLowerCase() === name);
    if (!doc.title) r.fail(`${label}: no <title>, or it is empty`);
    const charset = doc.tags.find((t) => t.name === 'meta' && 'charset' in t.attrs);
    if (!charset) r.fail(`${label}: no <meta charset="UTF-8">`);
    else if (!/^utf-?8$/i.test(charset.attrs.charset.trim())) r.fail(`${label}:${charset.line} the charset is "${charset.attrs.charset}", but the files are saved as UTF-8`);
    if (!meta('viewport')) r.fail(`${label}: no <meta name="viewport">, so phones would show the desktop layout`);
    // 5. Pages with the site's navigation (an element with id="navbar") must load the shared
    //    styles.css and script.js. A standalone page without it may bring its own styling.
    if (doc.tags.some((t) => t.attrs.id === 'navbar')) {
      const linksTo = (tagName, attr, target, extra = () => true) =>
        doc.tags.some((t) => t.name === tagName && extra(t) && resolveLocal(t.attrs[attr] || '', folder)?.target === target);
      if (!linksTo('link', 'href', 'styles.css', (t) => /\bstylesheet\b/i.test(t.attrs.rel || ''))) {
        r.fail(`${label}: has the site navigation but does not load styles.css (<link rel="stylesheet" href="...styles.css">)`);
      }
      if (!linksTo('script', 'src', 'script.js')) {
        r.fail(`${label}: has the site navigation but does not load script.js (<script src="...script.js">)`);
      }
    } else {
      standalone.push(label);
    }
  }
  if (standalone.length) {
    r.note(`Standalone (no id="navbar", so styles.css and script.js are not required): ${standalone.join(', ')}.`);
  }

  // url() in the stylesheets, such as fonts and background images
  for (const rel of publicFiles.filter((f) => f.endsWith('.css'))) {
    const css = readPublic(rel);
    const lineOf = lineFinder(css);
    for (const { url, index } of cssUrls(css)) {
      const res = resolveLocal(url, folderOf(rel));
      if (!res) continue;
      localRefs++;
      if (!res.exists) r.fail(`public/${rel}:${lineOf(index)} url(${url}): ${res.reason}`);
    }
  }

  // Site addresses in the text files for search engines and AI tools
  for (const rel of ['robots.txt', 'llms.txt']) {
    if (!publicSet.has(rel)) continue;
    const text = readPublic(rel);
    checkSiteUrls(text, `public/${rel}`, lineFinder(text));
  }

  r.note(`${pages.length} pages: ${localRefs} links and files on this site, ${siteRefs} full virginiathorn.com addresses.`);
  r.fix =
    'Correct each address so it matches a real file in public/ (upper/lower case matters on the live site), or add the missing file. ' +
    'A page missing its basics can copy them from a working page at the same folder depth. ' +
    'YouTube embeds must use https://www.youtube-nocookie.com/embed/VIDEO_ID.';
}

// ---------------------------------------------------------------------------------------------
// d. Sitemap
// ---------------------------------------------------------------------------------------------

function isNoindex(rel) {
  const robots = getPage(rel).doc.tags.find((t) => t.name === 'meta' && (t.attrs.name || '').toLowerCase() === 'robots');
  return Boolean(robots && /noindex/i.test(robots.attrs.content || ''));
}

async function checkSitemap(r) {
  r.fix =
    'Edit public/sitemap.xml: correct or remove entries whose file does not exist or that are listed twice, ' +
    'and keep pages hidden from search engines (404.html, cv.html, any page marked noindex) out of it.';
  if (!publicSet.has('sitemap.xml')) {
    r.fail('public/sitemap.xml is missing.');
    return;
  }
  const xml = readPublic('sitemap.xml');
  const lineOf = lineFinder(xml);
  const listed = new Map(); // page -> line number
  let imageCount = 0;

  const toLocal = (url, line, what) => {
    if (!url.startsWith(SITE_URL)) {
      r.fail(`public/sitemap.xml:${line} ${what} ${url} does not start with ${SITE_URL}`);
      return null;
    }
    const res = resolveLocal(`/${url.slice(SITE_URL.length)}`, '');
    if (!res || !res.exists) {
      r.fail(`public/sitemap.xml:${line} ${what} ${url}: ${res ? res.reason : 'not a file'}`);
      return null;
    }
    return res.target;
  };

  for (const m of xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)) {
    const line = lineOf(m.index);
    const target = toLocal(decodeEntities(m[1]), line, 'page');
    if (!target) continue;
    if (!target.endsWith('.html')) r.fail(`public/sitemap.xml:${line} ${m[1]} is not a page`);
    else if (listed.has(target)) r.fail(`public/sitemap.xml:${line} ${target} is listed twice (also on line ${listed.get(target)})`);
    else listed.set(target, line);
  }
  for (const m of xml.matchAll(/<image:loc>\s*([^<]*?)\s*<\/image:loc>/g)) {
    imageCount++;
    toLocal(decodeEntities(m[1]), lineOf(m.index), 'image');
  }

  for (const rel of pages) {
    const hidden = NOT_IN_SITEMAP.has(rel) || isNoindex(rel);
    if (hidden && listed.has(rel)) {
      r.fail(`public/sitemap.xml:${listed.get(rel)} lists ${rel}, which is hidden from search engines and must stay out of the sitemap`);
    } else if (!hidden && !listed.has(rel)) {
      // The owner decides: some pages are deliberately left out (for example a standalone page)
      r.warn(
        `public/${rel} is not in sitemap.xml. Add it if search engines should find it; ` +
          'if it should stay out, give it <meta name="robots" content="noindex"> and this warning goes away.',
      );
    }
  }
  r.note(`${listed.size} pages and ${imageCount} images listed.`);
}

// ---------------------------------------------------------------------------------------------
// e. Content preservation (the "never delete content" rule)
// ---------------------------------------------------------------------------------------------

// Collects findings as  kind + value -> the files they were found in
class Findings {
  constructor() {
    this.map = new Map();
  }
  add(kind, value, file) {
    const key = `${kind}\u0000${value}`;
    if (!this.map.has(key)) this.map.set(key, { kind, value, files: [] });
    const entry = this.map.get(key);
    if (!entry.files.includes(file)) entry.files.push(file);
  }
  get size() {
    return this.map.size;
  }
  lines(verb) {
    const where = (files) => (files.length <= 3 ? files.join(', ') : `${files.length} pages (${files.slice(0, 2).join(', ')} and ${files.length - 2} more)`);
    return [...this.map.values()].map(({ kind, value, files }) =>
      kind === 'file' ? `${verb === 'removed' ? 'Deleted' : 'New'} file: ${value}` : `${kind} ${verb} on ${where(files)}: ${kind === 'Text' ? `"${value}"` : value}`,
    );
  }
}

// The file a comparable address points at, when git says that file was renamed:
// "site:/assets/a.jpg" -> "public/assets/a.jpg", "site:/bio" -> "public/bio.html"
function renamedFileFor(key, renames) {
  const m = /^site:\/([^?#]*)/.exec(key) || /^https:\/\/(?:www\.)?virginiathorn\.com\/([^?#]*)/.exec(key);
  if (!m) return null;
  const p = m[1];
  const candidates = p === '' || p.endsWith('/') ? [`${p}index.html`] : [p, `${p}.html`, `${p}/index.html`];
  return candidates.map((c) => `public/${c}`).find((c) => renames.has(c)) || null;
}

// The comparable addresses a page can use for a file in public/: relative, or the full site address
function addressesFor(repoPath, suffix) {
  const rel = repoPath.slice('public/'.length);
  const clean = rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  return [comparableRef(`/${rel}`, ''), comparableRef(`${SITE_URL}${rel}`, ''), comparableRef(`${SITE_URL}${clean}`, '')].map((a) => a + suffix);
}

async function checkContent(r, ctx) {
  if (ctx.compare.problem) {
    r.skip(ctx.compare.problem);
    return;
  }
  const { sha, label } = ctx.compare;
  const renames = ctx.renames; // old path -> new path, from git
  const renamedFrom = new Map([...renames].map(([from, to]) => [to, from]));
  const updatedIn = new Map(); // renamed file -> the files whose references now use its new name
  const removed = new Findings();
  const added = new Findings();
  let pagesCompared = 0;
  let sheetsCompared = 0;

  for (const change of ctx.changes) {
    if (!change.path.startsWith('public/')) continue;
    if (change.status === 'D') {
      // A renamed file is listed below as information; a deleted image, recording or page is a removal
      if (!renames.has(change.path)) removed.add('file', change.path, change.path);
      continue;
    }
    const isPage = change.path.endsWith('.html');
    if (!isPage && !change.path.endsWith('.css')) continue;
    // A renamed page or stylesheet is compared with its old self
    const oldPath = change.status === 'A' ? renamedFrom.get(change.path) : change.path;
    const before = oldPath ? git(['show', `${sha}:${oldPath}`]) : null;
    if (before === null) {
      if (isPage) added.add('file', change.path, change.path);
      continue;
    }
    if (isPage) pagesCompared++;
    else sheetsCompared++;
    const read = isPage ? pageContent : cssContent;
    const old = read(before, oldPath.slice('public/'.length));
    const now = read(fs.readFileSync(path.join(ROOT, change.path), 'utf8'), change.path.slice('public/'.length));

    // Text, then images/media and links, compared as sets of values (line endings, spacing,
    // markup and attribute order make no difference)
    for (const text of missingText(old, now)) removed.add('Text', text, change.path);
    for (const text of missingText(now, old)) added.add('Text', text, change.path);
    const refs = [
      ['Image/media', old.media, now.media],
      ['Link', old.links, now.links],
    ];
    const standIns = new Set(); // new addresses that replace the old names of renamed files
    for (const [kind, oldRefs, newRefs] of refs) {
      for (const [key, value] of oldRefs) {
        if (newRefs.has(key)) continue;
        // Its file was renamed, and this file now points at the new name (or at a new name of an
        // identical copy, which shows exactly the same picture): not a removal
        const from = renamedFileFor(key, renames);
        if (from) {
          const to = renames.get(from);
          const newNames = [to, ...(ctx.sameContent.get(from) || []).filter((p) => p !== to)];
          const suffix = key.replace(/^[^?#]*/, '');
          const standIn = newNames.flatMap((p) => addressesFor(p, suffix)).find((a) => now.media.has(a) || now.links.has(a));
          if (standIn) {
            standIns.add(standIn);
            if (!updatedIn.has(from)) updatedIn.set(from, new Set());
            updatedIn.get(from).add(change.path);
          } else {
            removed.add(kind, `${value} (renamed to ${to}, but this file no longer refers to it)`, change.path);
          }
          continue;
        }
        // Same words, new address: say so, because that is usually an edited link rather than a deleted one
        const words = kind === 'Link' && old.linkWords.get(key);
        const newAddress = words && now.linkByWords.get(words);
        removed.add(kind, newAddress ? `${value} (the link "${words}" now goes to ${newAddress})` : value, change.path);
      }
    }
    for (const [kind, oldRefs, newRefs] of refs) {
      for (const [key, value] of newRefs) if (!oldRefs.has(key) && !standIns.has(key)) added.add(kind, value, change.path);
    }
  }

  removed.lines('removed').forEach((line) => r.fail(line));
  let renameCount = 0;
  for (const [from, to] of renames) {
    if (!from.startsWith('public/')) continue;
    renameCount++;
    const files = [...(updatedIn.get(from) || [])];
    const where = files.length > 3 ? `${files.length} files` : files.join(', ');
    const twins = (ctx.sameContent.get(from) || []).filter((p) => p !== to);
    const details = [twins.length ? `same picture also at ${twins.join(', ')}` : '', files.length ? `references updated in ${where}` : ''].filter(Boolean);
    r.note(`renamed: ${from} → ${to}${details.length ? ` (${details.join('; ')})` : ''}`);
  }
  added.lines('added').forEach((line) => r.note(line));
  if (ctx.compare.note) r.note(ctx.compare.note);
  const sheets = sheetsCompared ? ` and ${plural(sheetsCompared, 'stylesheet')}` : '';
  r.note(
    `Compared ${plural(pagesCompared, 'changed page')}${sheets} with ${label}: ` +
      `${plural(removed.size, 'removal')}, ${plural(added.size, 'addition')}, ${plural(renameCount, 'renamed file')}.`,
  );

  if (removed.size && ctx.permission.allowed) {
    r.warning = `${plural(removed.size, 'removal')} accepted because ${ctx.permission.how}. Make sure the owner asked for them.`;
  }
  r.fix =
    `Put back the text, images and links listed above (see what changed with: git diff ${ctx.compare.ref === 'HEAD' ? 'HEAD' : sha.slice(0, 7)} -- <file>). ` +
    'Only if the owner asked for the removal: put [allow-removals] in the commit message, and GitHub accepts it ' +
    '(on this computer, --allow-removals shows the same result).';
}

// ---------------------------------------------------------------------------------------------
// f. Private data and keys in changed files
// ---------------------------------------------------------------------------------------------

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.tif', '.tiff', '.psd',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.m4a', '.wav', '.ogg', '.flac', '.mp4',
  '.webm', '.mov', '.pdf', '.zip', '.gz', '.tgz', '.7z', '.exe', '.dll',
]);

// Contact details are shown in full on this computer (and hidden in GitHub's public logs);
// keys are always partly hidden.
const CONTACT_KINDS = new Set(['email address', 'phone number', 'UK postcode']);
const PRIVATE_PATTERNS = [
  // a name, an at sign and a domain; image names such as logo@2x.png do not count
  { kind: 'email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, keep: (m) => !/\.(png|jpe?g|gif|webp|svg|avif|css|js|html?)$/i.test(m) },
  // UK numbers starting with 0 or +44, with optional spaces, dashes or (0)
  { kind: 'phone number', re: /(?:\+44\s?(?:\(0\)\s?)?|\(?\b0)\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, keep: (m) => digitCountOk(m, m.startsWith('+') ? [12, 13] : [10, 11]) },
  // other international numbers written with a leading +
  { kind: 'phone number', re: /\+[1-9]\d{0,2}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,5}){2,4}\b/g, keep: (m) => digitCountOk(m, [8, 15]) },
  { kind: 'UK postcode', re: /\b(?:[A-Z]{1,2}\d[A-Z\d]?|GIR) \d[ABD-HJLNP-UW-Z]{2}\b/g },
  { kind: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { kind: 'Stripe live key', re: /\b[rs]k_live_[0-9A-Za-z]{10,}/g },
  { kind: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/g },
  { kind: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: 'service-account key file', re: /"private_key"\s*:/g },
];

function digitCountOk(text, [min, max]) {
  const digits = text.replace(/\D/g, '').length;
  return digits >= min && digits <= max;
}

// Every piece of private-looking data on one line of text, without double-counting overlaps
function findPrivateData(line) {
  const hits = [];
  for (const { kind, re, keep } of PRIVATE_PATTERNS) {
    for (const m of line.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (keep && !keep(m[0])) continue;
      if (hits.some((h) => start < h.end && end > h.start)) continue;
      hits.push({ kind, value: m[0], start, end });
    }
  }
  return hits;
}

function showFound(kind, value, inPublicLog) {
  if (CONTACT_KINDS.has(kind) && !inPublicLog) return value;
  return `${value.slice(0, 4)}... (${value.length} characters, hidden here)`;
}

async function checkPrivateData(r, ctx) {
  if (ctx.compare.problem) {
    r.skip(ctx.compare.problem);
    return;
  }
  const inPublicLog = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const allowed = new Set(ALLOWED_PRIVATE_DATA.map((entry) => entry.text));
  let scanned = 0;
  let allowedHits = 0;

  for (const change of ctx.changes) {
    if (change.status === 'D' || /(^|\/)(node_modules|\.git)(\/|$)/.test(change.path)) continue;
    if (BINARY_EXTENSIONS.has(path.extname(change.path).toLowerCase())) continue;
    let buffer;
    try {
      const stat = fs.statSync(path.join(ROOT, change.path));
      if (!stat.isFile()) continue;
      if (stat.size > 5 * 1024 * 1024) {
        r.note(`Skipped ${change.path}: larger than 5 MB.`);
        continue;
      }
      buffer = fs.readFileSync(path.join(ROOT, change.path));
    } catch {
      continue;
    }
    if (buffer.subarray(0, 8000).includes(0)) continue; // a binary file
    scanned++;
    buffer
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((text, i) => {
        for (const hit of findPrivateData(text)) {
          if (allowed.has(hit.value)) {
            allowedHits++;
            continue;
          }
          r.fail(`${change.path}:${i + 1}  ${hit.kind}: ${showFound(hit.kind, hit.value, inPublicLog)}`);
        }
      });
  }
  r.note(`Scanned ${plural(scanned, 'changed text file')} (compared with ${ctx.compare.label}).`);
  if (allowedHits) r.note(`${allowedHits} ${allowedHits === 1 ? 'match' : 'matches'} skipped because ALLOWED_PRIVATE_DATA in scripts/check.js allows them.`);
  r.fix =
    'If it should not be published, remove it (the repository is public, so anything committed is published). ' +
    'Keys and passwords never belong here: delete them and revoke them with their provider. ' +
    'If it is meant to be public (for example a contact address the owner approved, or a made-up example), ' +
    'add it to ALLOWED_PRIVATE_DATA near the top of scripts/check.js with the reason.';
}

// ---------------------------------------------------------------------------------------------
// g. gitleaks
// ---------------------------------------------------------------------------------------------

async function checkGitleaks(r) {
  const probe = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  if (probe.error) {
    r.skip('gitleaks is not installed on this computer (Windows: winget install gitleaks). GitHub still runs it on every push (secret-scan.yml).');
    return;
  }
  r.note(`gitleaks ${probe.stdout.trim()}`);
  const scans = [
    { label: 'files in this folder', args: ['dir', '.'] },
    { label: 'git history', args: ['detect', '--source', '.'] },
  ];
  for (const scan of scans) {
    const args = [...scan.args, '--no-banner', '--no-color', '--redact', '--log-level', 'error', '--report-format', 'json', '--report-path', '-'];
    const res = spawnSync('gitleaks', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 180000 });
    if (res.status === 0) {
      r.note(`No leaks in the ${scan.label}.`);
      continue;
    }
    let findings = null;
    try {
      findings = JSON.parse(res.stdout || 'null');
    } catch {
      findings = null;
    }
    if (res.status === 1 && Array.isArray(findings)) {
      for (const f of findings) {
        const file = path.isAbsolute(f.File || '') ? path.relative(ROOT, f.File) : f.File;
        const commit = f.Commit ? ` (commit ${f.Commit.slice(0, 7)})` : '';
        r.fail(`${scan.label}: ${f.RuleID} in ${file}:${f.StartLine}${commit}`);
      }
    } else {
      r.fail(`gitleaks could not scan the ${scan.label}: ${(res.stderr || res.error?.message || `exit code ${res.status}`).trim()}`);
    }
  }
  r.fix =
    'Remove the secret from the file and revoke or replace it with its provider. Local log files such as firebase-debug.log can simply be deleted. ' +
    'A secret in an old commit stays in the public history: revoke it, then ask for help.';
}

// ---------------------------------------------------------------------------------------------
// h. Browser smoke test (only with --smoke)
// ---------------------------------------------------------------------------------------------

function findChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) candidates.push(path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    for (const root of roots) candidates.push(path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
    );
  }
  return candidates.find((file) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
}

// Runs worker(item) for every item, `limit` at a time
async function runPool(items, limit, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(lanes);
}

// Opens one page at one window size and returns what went wrong, if anything
async function smokeOnePage(browser, origin, rel, viewport) {
  const problems = [];
  const tab = await browser.newPage();
  let closing = false;
  const isOurs = (url) => typeof url === 'string' && url.startsWith(origin);
  const shortUrl = (url) => url.slice(origin.length) || '/';

  tab.on('console', (msg) => {
    if (closing || msg.type() !== 'error') return;
    const where = msg.location() || {};
    if (where.url && !isOurs(where.url)) return; // another website, blocked on purpose (YouTube, analytics)
    if (/^Failed to load resource/.test(msg.text())) return; // reported below with the file name
    problems.push(`console error: ${msg.text()}`);
  });
  tab.on('pageerror', (err) => {
    if (!closing) problems.push(`script error: ${err.message.split('\n')[0]}`);
  });
  tab.on('requestfailed', (req) => {
    if (closing || !isOurs(req.url())) return;
    const reason = (req.failure() && req.failure().errorText) || 'failed';
    if (reason === 'net::ERR_ABORTED') return; // the browser cancelled it itself, e.g. a lazy image it no longer needed
    problems.push(`could not load ${shortUrl(req.url())} (${reason})`);
  });
  tab.on('response', (res) => {
    if (!closing && isOurs(res.url()) && res.status() >= 400) problems.push(`${shortUrl(res.url())} answered ${res.status()}`);
  });

  try {
    await tab.setViewport(viewport);
    await tab.goto(`${origin}/${rel}`, { waitUntil: 'load', timeout: 30000 });
    // The preloader covers the page until the site's script removes it
    await tab
      .waitForFunction(
        () => {
          const preloader = document.querySelector('.preloader');
          return !preloader || preloader.classList.contains('hidden');
        },
        { timeout: 15000, polling: 100 },
      )
      .catch(() => problems.push('the preloader never went away'));
    // Scroll to the bottom and back, so lazy images load and scroll animations run
    await tab.evaluate(async () => {
      const pause = (ms) => new Promise((done) => setTimeout(done, ms));
      const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await pause(40);
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      await pause(150);
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await tab.waitForNetworkIdle({ idleTime: 300, timeout: 8000 }).catch(() => {});
    const size = await tab.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      window: document.documentElement.clientWidth,
    }));
    if (size.page > size.window) {
      problems.push(`the page is ${size.page}px wide in a ${size.window}px window, so it scrolls sideways`);
    }
  } catch (err) {
    problems.push(`could not be tested: ${err.message.split('\n')[0]}`);
  } finally {
    closing = true;
    await tab.close().catch(() => {});
  }
  return problems;
}

async function checkSmoke(r) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
    r.skip('puppeteer-core is not installed. Run "npm install" once in this folder, then try again.');
    return;
  }
  const chrome = findChrome();
  if (!chrome) {
    r.skip('Google Chrome was not found. Install Chrome, or set CHROME_PATH to the browser program.');
    return;
  }

  const { startServer } = require('./static-server');
  const server = await startServer({ root: PUBLIC_DIR });
  const origin = server.url.replace(/\/$/, '');
  let browser;
  const found = new Map(); // "page: problem" -> window sizes it happened at
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio',
        '--no-proxy-server',
        // Every other website is blocked: YouTube, analytics and so on are never contacted,
        // so the test stays private, repeatable and independent of the internet.
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      ],
    });
    const jobs = [];
    for (const rel of pages) for (const viewport of VIEWPORTS) jobs.push({ rel, viewport });
    await runPool(jobs, 4, async ({ rel, viewport }) => {
      for (const problem of await smokeOnePage(browser, origin, rel, viewport)) {
        const key = `public/${rel}: ${problem}`;
        if (!found.has(key)) found.set(key, []);
        if (!found.get(key).includes(viewport.label)) found.get(key).push(viewport.label);
      }
    });
    r.note(`Opened ${pages.length} pages at ${VIEWPORTS.map((v) => v.label).join(' and ')} in ${await browser.version()}, with other websites blocked.`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await server.close();
  }
  for (const [problem, sizes] of found) r.fail(`${problem} [${sizes.join(', ')}]`);
  r.fix =
    'Preview with "npm run serve", open the page, press F12 and read the Console tab. ' +
    'A file that answered 404 has a wrong address; a page wider than the window usually has an element with a fixed width or negative margin.';
}

// ---------------------------------------------------------------------------------------------
// Run everything
// ---------------------------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    say(HELP);
    return 0;
  }
  if (opts.unknown.length) {
    console.error(`Unknown option: ${opts.unknown.join(' ')}\n`);
    console.error(HELP);
    return 1;
  }
  const started = Date.now();
  if (!pages.length) {
    console.error(`No pages found in ${PUBLIC_DIR}. Run this from the website's repository.`);
    return 1;
  }

  const compare = comparisonBase(opts);
  const changes = compare.sha ? listChanges(compare.sha) : [];
  const { renames, sameContent } = compare.sha ? listRenames(compare.sha, changes) : { renames: new Map(), sameContent: new Map() };
  const ctx = { compare, changes, renames, sameContent, permission: removalPermission(opts, compare) };
  say(`Checking the website in public/ (${plural(pages.length, 'page')})${compare.sha ? `, compared with ${compare.label}` : ''}.`);
  say('');

  const checks = [
    ['a', 'JavaScript syntax', checkJavaScript],
    ['b', 'CSS braces', checkCss],
    ['c', 'Pages, links and images', checkPages],
    ['d', 'Sitemap', checkSitemap],
    ['e', 'Content preservation', checkContent],
    ['f', 'Private data and keys', checkPrivateData],
    ['g', 'gitleaks secret scan', checkGitleaks],
  ];
  if (opts.smoke) checks.push(['h', 'Browser smoke test', checkSmoke]);

  const results = [];
  for (const [letter, title, run] of checks) {
    const r = new CheckResult(letter, title);
    const t0 = Date.now();
    try {
      await run(r, ctx, opts);
    } catch (err) {
      r.fail(`The check itself stopped with an error: ${(err && err.stack) || err}`);
      r.fix = 'This is a problem in scripts/check.js or an unexpected file; read the error above.';
    }
    r.ms = Date.now() - t0;
    r.finish();
    printResult(r, opts);
    results.push(r);
  }
  printSummary(results, Date.now() - started);
  return results.some((r) => r.status === 'FAIL') ? 1 : 0;
}

if (require.main === module) {
  main().then(
    (code) => {
      process.exitCode = code;
      // If anything (such as a stuck browser) would keep Node running, stop anyway after 5 seconds
      setTimeout(() => process.exit(code), 5000).unref();
    },
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
} else {
  // Loaded by another script (for example a test): share the helpers instead of running the checks
  module.exports = {
    parseHtml, tokenize, comparableRef, pageContent, cssContent, pageHasText, missingText, findPrivateData,
    braceProblems, resolveLocal, cssUrls, siteUrlsIn, renamedFileFor, addressesFor,
    CheckResult, checkPages, checkSitemap,
  };
}
