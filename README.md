# AccessTrail

Check the whole visit, not just the entrance. AccessTrail researches published venue accessibility information using **TinyFish**, then exposes support, limitations, conflicts and missing information for five practical requirements.

Built by **Aditya Singhal** for **Tiny Hacks 2026**. Created with AI assistance. No physical accessibility certification or user-study results are claimed.

## Try it

The deployed app link will be added after publication. The default British Museum report is based on a genuine completed TinyFish TinyAgent / Mako run on 6 November 2026. It requires no account or API key to inspect.

1. Select your access requirements and explore the evidence cards.
2. Open **Run provenance** to inspect the provider run reference.
3. Choose **Conflict demo** and click **Explore conflict demo**. The fictional restroom claims conflict; unknown requirements remain unknown.
4. Generate a venue enquiry, download the JSON, or print the report.
5. For new live research, click **Connect TinyFish**, enter your own provider key, choose a venue and select **Live TinyFish agent**. Your provider credits apply. The key is kept in tab memory, forwarded via HTTPS to TinyFish, and not persisted by the app. Closing the tab clears it.
6. **Source check** uses TinyFetch to retrieve a known official page and look for saved short text markers. It does not re-certify a facility or silently replace the saved evidence.

## Why it matters

A ramp does not establish a step-free route to a particular gallery or restroom. Lift availability does not establish that every room is reachable. Wheelchair loans do not establish staff assistance. Companion tickets do not establish seating. AccessTrail keeps those conditions visible instead of collapsing them into a single accessibility score.

## TinyFish integration and provenance

- Live agent: `POST https://agent.tinyfish.ai/v1/automation/run-sse` with a bounded natural-language research goal and a fixed venue URL; stream progress and parse the completed structured evidence.
- Source check: `POST https://api.fetch.tinyfish.ai` retrieves the selected official source. A server-side key is configured separately from source code.
- Genuine saved run: `edbf3e91-fa6e-4683-b2b8-f5fb3b4396e3` (TinyFish dashboard access may require the owner's sign-in).
- Observed dashboard run cost: **$0.256**, one run only; this is not a general cost estimate.
- Evidence captured: **6 November 2026**. Agent output was shortened and conservatively paraphrased for publication. The JSON includes a provenance note and source URL. It is a saved result, not a fresh browser replay.
- Current scope: one genuine saved venue investigation, three allowlisted live venue targets, and a separate fictional conflict fixture. No benchmark accuracy, physical verification, partnerships or pilot users are claimed.

## Run locally

Requires Node.js 22+; no npm dependencies.

```sh
node scripts/assemble.mjs
npm test
npm run dev
```

Open `http://localhost:3000`. To enable source checks locally, supply `TINYFISH_API_KEY` as an environment variable. Do not commit keys. Live research uses the visitor's key and does not require a shared metered key.

```sh
npm run build
npm run validate
```

Production is a standard Fetch API Worker module at `dist/server/index.js`. `scripts/assemble.mjs` combines the readable source files into `worker/index.js`; `scripts/build.sh` packages it. The preview adapter uses the same Worker handler under Node.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/page.html` | Responsive UI, semantic forms, keyboard-accessible tabs, print layout |
| `src/client.js` | Selection, saved/live modes, SSE consumption, enquiry and JSON export |
| `src/core.js` | Prompt, schema checks, trusted source filtering, deterministic requirement states |
| `src/server.js` | Same-origin API, TinyFish proxy, source-marker verification |
| `evidence/british-museum.json` | Genuine recorded research with source links and provenance |
| `tests/core.test.js` | Tests for conflicts, unknowns, invalid evidence, credential checks and API boundaries |

The reducer requires a nonempty evidence excerpt and an HTTPS URL on the selected venue domain. It deduplicates identical records, preserves contradictory claims, and never fills a missing requirement with another requirement's evidence. It validates provenance structure; it cannot establish that the source content is correct or current. Review source context.

## Privacy and limitations

No diagnosis, account profile or location is collected. No automatic bookings or emails. API keys are never embedded in browser bundles, source or reports. Venue targets are allowlisted; the server is not an arbitrary URL proxy. Live keys are sent only to the TinyFish API. CSP and same-origin checks reduce unintended cross-site use.

TinyFish may fail, time out or be blocked by a venue. Live failure leaves the previous report unchanged and shows an error. A missing text marker can be a wording change or retrieval problem; it is never treated as proof a facility was removed. Source checking inspects one page, not every linked source. Review all critical requirements with the venue. No guarantee of wheelchair suitability, room access, equipment operation, legal compliance or physical safety is made.

The original proposal described a broader Delhi NCR pilot and 50-case evaluation. This MVP deliberately delivers a smaller verifiable scope. A Delhi venue is available as a live target, but no Delhi investigation is represented as completed.

## Demo in three minutes

0:00 — Explain the gap between an entrance label and a complete visit.

0:25 — Open the genuine British Museum evidence. Show gallery exceptions and the distinction between wheelchair loans and staff assistance.

1:15 — Open provenance and the official source.

1:40 — Run the labelled fictional conflict scenario. Show the unresolved restroom and missing lift evidence.

2:10 — Draft a venue enquiry and export the report.

2:35 — Explain live TinyFish research, source checking, current limits and the next step of user-led validation.

## References

- [TinyFish documentation](https://docs.tinyfish.ai/)
- [TinyFish official cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)
- [British Museum accessibility information](https://www.britishmuseum.org/visit/accessibility-museum)

The application code is MIT licensed. Venue statements and provider material remain subject to their respective rights.
