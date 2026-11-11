# Research — Recipe Box decision points D1–D6

Researched 2026-11-11 by the Researcher. Recommendations are input for the owner's Tier 1 decisions, not decisions.
Machine facts: Windows 11 Home, Node v24.11.0 + npm 11.6.2, git, uv; no Python on PATH.
Confidence tags: [src] = read from the cited page; [snippet] = from a search-result summary, not a primary page; [bg] = general knowledge, not verified in this session (verify in the LLD or a spike).

Node release lines (nodejs.org/en/about/previous-releases): v26.13.0 LTS, v24.22.2 LTS, v22.23.4 LTS, v20 EOL since 2026-03-24 [src]. The owner's v24.11.0 is on a supported LTS line but 11 minor releases behind; no feature below needs a newer one, but `npm`/Node updates are the owner's call.
https://nodejs.org/en/about/previous-releases

---
## D6 Stack (language, UI approach, how served)

| | A. Node built-in `http` + vanilla JS (ES modules), zero npm deps | B. Vite 8 + Preact (or Svelte) | C. Express/Fastify + vanilla JS |
|---|---|---|---|
| Install steps for owner | none (Node already present) | `npm install` once (~100s of packages incl. Vite/Rolldown toolchain) | `npm install` once |
| Start command | `node server.js` (or `npm start`) | build once, then a server for `dist/`, or `vite preview`; dev server (`vite`) is not meant as the daily runner | `npm start` |
| Version / support | Node 24 LTS built in [src] | Vite 8.0 released 2026-03-12, needs Node 20.19+ / 22.12+ [snippet]; Preact 10.29.x stable, 11 still beta [snippet]; Svelte not verified | not researched in depth |
| Offline / cost | yes / free | yes / free (npm registry needed only at install) | same |
| Supply-chain / upkeep | none | many transitive deps, major upgrades yearly | few deps |
| Fit | M1 launcher and static serving are ~50 lines; UI as ES modules + `<template>`/DOM helpers; no build step so "started by one command" is trivially true | nicer component model for 3 screens + dialogs, but adds a build step that must exist before the one command runs | gains little over A for 1 route set |
| Known issues | no router/reactivity; hand-rolled screen routing (hash routing is enough) | build output must be rebuilt/committed or built in the start command (slower start) | — |

Sources: https://vite.dev/blog/announcing-vite8 · https://preactjs.com/ (Preact version via search snippet, unverified date) · https://nodejs.org/api/http.html

### Test runner
| | `node:test` (built in) | Vitest 5 | Playwright (e2e) |
|---|---|---|---|
| Version | ships with Node; stable since v20.0.0 [src] | 5.0.4 (2026-10-12), needs Node 22.12+ and Vite 6.4+ [snippet] | 1.6x line (1.62 July 2026; a 1.64 Oct 2026 claim has one source only) [snippet] |
| Install weight | 0 | npm install pulls Vite (tens of MB) | npm pkg + browsers: "a few hundred MB" per [src]; macOS example Chromium 281M, Firefox 187M, WebKit 180M; Windows location `%USERPROFILE%\AppData\Local\ms-playwright` |
| Fit | ideal for pure logic M6/M7/M8 (fractions, scaling, search) as ESM; mocking built in; coverage and `--watch` still experimental [src] | good if option B chosen (shares Vite config); otherwise needless | real-browser e2e of SPEC §5 flows |
| Windows note | none | none | can reuse installed Edge/Chrome with `channel: 'msedge'`/`'chrome'` instead of downloading browsers; `PLAYWRIGHT_BROWSERS_PATH` does not affect system Chrome/Edge [src] |

Sources: https://nodejs.org/api/test.html · https://playwright.dev/docs/browsers · https://releases.sh/vitest.md
Caveat: a Playwright 1.60 compatibility problem was reported (advice: stay on 1.59.x until fixed) [snippet: https://currents.dev/posts/pw-1.60.0]; pin the version if used.

**Recommendation D6:** Option A (Node built-in server + vanilla ES modules) with `node:test` for the pure-logic modules. Reasons: no install step on a machine with no Python and an owner who wants one command; zero dependencies means nothing to break or upgrade; app is 3 screens and tens of recipes. If the architect wants e2e checks, Playwright as a dev-only dependency using the installed Edge (`channel: 'msedge'`) avoids the ~hundreds-of-MB browser download; that is an extra package so it needs the owner's approval. Choose B only if the owner values a component framework over zero setup.

---
## D1 Persistence

| | (a) localStorage | (b) IndexedDB | (c) JSON file on disk via local server |
|---|---|---|---|
| Matches SPEC §6 wording ("inside one browser") | yes | yes | no, changes stated location; needs owner OK (HLD D1) |
| Durability | best-effort by default; evicted only under storage pressure (LRU) or user clearing; Chrome research: eviction of regularly used sites is "very rare" [src] | same | independent of browser; survives clearing site data |
| `navigator.storage.persist()` | applies to the whole origin: Firefox shows a prompt; Chrome/Edge/Safari decide silently from engagement history [src] | same | n/a |
| Size limit | ~5 MiB per origin (MDN is inconsistent: also says 10 MiB) [src]; a few hundred text recipes is well below (est. <1 MB) | up to ~60% disk (Chromium) [src] | disk |
| API | synchronous, string only, `QuotaExceededError` on full | async, structured clone, more code | `fs` + HTTP API, needs endpoints and error handling |
| Origin scoping | per scheme+host+port [src]: `127.0.0.1:PORT` and `localhost:PORT` are different stores; a port change = empty box | same | file lives in one fixed path; browser origin irrelevant |
| Other | private windows delete data at session end [src]; Safari 7-day purge not relevant (Windows) | | needs atomic write (below); any browser or address sees the same data |

Source: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

Option (c) atomic write on Windows: write to `data.json.tmp` in the same folder, `filehandle.sync()` to flush, then `fs.rename` over the target [src for sync(): https://nodejs.org/api/fs.html]. [bg] On Windows `rename` over an existing file normally replaces it but can fail with `EPERM`/`EBUSY` if antivirus or another process holds the file; use a short retry (e.g. 3 tries, 50 ms) and keep the previous file untouched on failure. Serialise writes (promise queue) because fs promise calls on one file are not synchronised [src]. Keep a `.bak` copy of the last good file if the owner wants extra safety (cost: small; not a "backup feature" in the non-goal sense, but ask).

Facts about the HLD risk: with (a) the risks are address change (mitigated by D2) and the owner clearing site data; with (c) the risks are file corruption (mitigated by atomic write) and the file being deleted. Neither has an export route, per the owner's non-goals.

**Recommendation D1:** Owner decision. If the spec wording must hold exactly: (a) localStorage (one JSON string under one key with a `version` field; simplest; size is no issue), call `navigator.storage.persist()` once at start, and surface a visible error if reads fail or parse fails. If the owner prefers the lower data-loss risk and accepts the wording change in SPEC §6: (c), which also removes the dependency on D2's exact origin. IndexedDB offers nothing here that localStorage lacks at this data size, and adds async complexity.

---
## D2 / D3 Launcher (fixed address, already-running, open browser, port conflict)

Facts:
- `server.listen(port, host)`: if `host` is omitted Node listens on `::` (and possibly `0.0.0.0` too), i.e. all interfaces [src]. Pass `'127.0.0.1'` explicitly to be loopback-only (success metric 5). https://nodejs.org/api/net.html
- Use the literal `http://127.0.0.1:<port>/` as the single origin everywhere (README, opened URL). `localhost` is a different origin and on Windows may resolve to `::1` first [bg].
- Port-in-use surfaces as an `error` event with `code === 'EADDRINUSE'` [src]. Do not use the docs' retry-loop example; the HLD requires a clear message, no silent port switch.
- Windows Defender Firewall prompts are normally triggered by listening on non-loopback addresses, not 127.0.0.1 [bg]; verify on the owner's machine in milestone 1.
- Closing the console window ends the Node process [bg], matching the assumption "closing the command window stops the app".

Opening the default browser from Node with no packages (Windows):
- `child_process.spawn('cmd', ['/c', 'start', '""', url], { windowsVerbatimArguments: true, detached: true, stdio: 'ignore' }).unref()`. The empty `""` is the window-title argument; without it `start` treats the first quoted argument as a title. `&` in URLs is the usual hazard and needs quoting [snippet; pattern from the `open` package]. With `http://127.0.0.1:PORT/` there is no `&`, so the simple form is safe. Alternative: `explorer.exe url` (works, but returns exit code 1 even on success [bg]). The `open` npm package does this robustly but is an extra dependency.
Source: https://github.com/sindresorhus/open (readme/index.js, via search snippets)

"Already running" detection options:
| Option | How | Pros | Cons |
|---|---|---|---|
| 1. Probe-on-conflict | try `listen`; on `EADDRINUSE` do `GET http://127.0.0.1:PORT/__recipe-box` expecting a fixed identity string (e.g. app name + version) | no state files; works after crashes; distinguishes our app from another program | needs a tiny identity route |
| 2. Lock/pid file | write pid file, check process alive | none needed | stale files after crash/kill; more code |
| 3. Try connect first | connect, then decide | same as 1 | race window |

**Recommendation D2/D3:** Fixed port chosen from the unregistered range (e.g. 4173-ish ports are used by Vite preview; pick something unusual such as 47321; architect decides, owner approves), bind `127.0.0.1`, option 1 for already-running: if the probe returns the identity string, open the browser on the running instance and print "already running"; if something else answers, print "Port N is used by another program; close it or change PORT in config" and exit non-zero, never switching port. Open the browser after `listening` fires. Open via `cmd /c start "" url`. Provide `npm start` as the single documented command (or `node server.js`; both need only Node).

---
## D4 Amount representation and fractions

| | Hand-written ¼ rounding + small parser | fraction.js | frac / fractions |
|---|---|---|---|
| Version / licence | n/a (own code, ~40 lines) | 5.3.4, MIT, no deps [snippet: https://licenses.dev/npm/fraction.js/5.3.4]; npm page snapshot showed 5.2.2 so confirm with `npm view fraction.js version` | frac 1.1.2 Apache-2.0, last publish ~7 years ago [snippet]; fractions 1.0.2 MIT, date unknown |
| Fit | needs only: nearest ¼, halfway up, min ¼, format whole+¼/½/¾, parse `2`, `0.5`, `½`, `1½`, `1 1/2` | arbitrary rational arithmetic and string output like "1 1/2"; far more than needed; displays 1/3 not ¼-rounded, so rounding still hand-written | continued-fraction approximation to a denominator; unmaintained (frac) |
| Cost | none | adds a dependency (needs owner approval) | adds a dependency |
| Risk | float error at ties, e.g. 0.375 and 0.125 are exact in binary so ties are safe; compute `Math.floor(x*4 + 0.5)/4` on x = amount * new / base; to be safe multiply first then divide (`amount*new*4/base`) | low | maintenance |

Check of SPEC examples with the formula `q = floor(amount*new/base*4 + 0.5)/4`, minimum 1 quarter if amount > 0: 250 g x 2/8 = 62.5 -> 62½; 250 x 1/8 = 31.25 -> 31¼; 3 x 1/8 = 0.375 -> 1.5 quarters -> floor(2.0)=2 -> ½; 1 tsp x 1/8 = 0.125 -> floor(0.5+0.5)=1 -> ¼. These are all binary-exact so floats are safe. [own calculation]

Representation (for D4): store each amount as `{ text, value }`: `text` = exactly what the owner typed (round-trip at base servings), `value` = number or `null` (unscalable, e.g. "a pinch"). Display `text` unchanged at base servings; display the formatted ¼ value when scaled. Also decide whether base-servings display normalises (e.g. "1.5" shown as "1½"); the spec says "all fields intact", so showing the typed text is the safest default.

**Recommendation D4:** hand-written functions in M6/M7, unit-tested with `node:test` against every SPEC §5 example. A library adds a dependency without removing the rounding code.

---
## D5 (brief, outside the asked scope but related)
Store `{ "version": 1, "recipes": [...] }`; on parse failure or unknown version, show an error and do not write. For option (a) keep the raw string untouched; for option (c) never overwrite an unreadable file (rename it to `data.corrupt-<timestamp>.json` only with the owner's OK).

## Unverified items to check in the LLD or milestone 1
- Exact latest Vite/Preact/Svelte/Playwright versions (use `npm view <pkg> version`); several came from aggregator snippets.
- Windows `fs.rename` EPERM behaviour and firewall behaviour on the owner's machine.
- Whether Edge/Chrome open a new tab or reuse one when `start` is repeated.
