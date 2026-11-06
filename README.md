# AccessTrail

**Check the whole visit, not just the entrance.** AccessTrail uses TinyFish to research official venue accessibility information and turns it into evidence, restrictions, unanswered questions and a venue enquiry.

**[Open the deployed app](https://accesstrail.vercel.app)** · [Tiny Hacks 2026](https://unstop.com/hackathons/tiny-hacks-vishveshwarya-group-of-institutions-vgi-greater-noida-uttar-pradesh-1771573)

Built by **Aditya Singhal** with AI assistance. A working research MVP; no physical inspections, user-study results, partnerships or benchmark accuracy are claimed.

## Try the complete flow

1. Choose a venue and your practical access requirements. Mark the ones that are essential for your visit; unresolved essential needs appear first in your visit brief and enquiry. No diagnosis or travel dates are collected.
2. Explore the latest saved evidence and open its official sources.
3. Select **Live research · no key needed** and click **Check venue with TinyFish**. The API key stays on the server. A recent completed report is reused, and simultaneous requests join the same investigation.
4. Reload during a run: this tab resumes checking its job. Completed results persist for future visitors.
5. Open **Compare venues** to compare published support, restrictions and unknowns against the same requirements. Counts describe information, not a venue safety or suitability rating.
6. Use **Source check** to retrieve up to three cited pages, check short evidence markers and compare with the previous check. A failed retrieval is never treated as removed information.
7. Draft an enquiry, download a portable Markdown visit brief or evidence JSON, print a report or share a link to a venue's latest saved report.
8. Choose **Conflict demo** to inspect a clearly labelled fictional scenario. Both opposing restroom claims are retained and missing requirements stay unknown.

## What makes it useful

A ramp does not establish a step-free route to a particular gallery or restroom. Available lifts can have floor restrictions. Wheelchair loans do not establish staff assistance, and companion tickets do not establish seating.

AccessTrail preserves that context instead of issuing a universal accessible/not-accessible verdict. **Mixed evidence** means the source contains both support and restrictions within a requirement. The statements may concern different rooms or conditions; the label does not prove a factual contradiction.

## TinyFish is the execution layer

- **TinyAgent:** `POST /v1/automation/run-async` starts read-only research on an allowlisted official venue domain. The backend polls `GET /v1/runs/{id}` and validates the completed result.
- **TinyFetch:** retrieves cited official pages to check short evidence markers. It does not inspect physical facilities or verify equipment operation.
- The server key is supplied as the `TINYFISH_API_KEY` production secret. It is never embedded in the client bundle or returned through public APIs.
- Public polling can access only jobs created by this application. It cannot use the owner's key to inspect unrelated TinyFish runs.
- The shipped British Museum example comes from genuine TinyFish run `edbf3e91-fa6e-4683-b2b8-f5fb3b4396e3`, captured 6 November 2026. Its output was shortened and conservatively paraphrased. Provider dashboard references may require the owner's sign-in.
- A previous deployed-app end-to-end run completed under reference `5a5d80ef-76b3-4004-9b8c-41a9d842772c`. The final shared-key implementation is also tested through the deployed application before submission.

### Completed shared investigations

| Venue | TinyFish run reference |
| --- | --- |
| British Museum | `1b0d75f1-d516-46bc-9cbf-2e7a5debdcd0` |
| National Museum New Delhi | `6e6afcd2-8edb-41ab-b12e-e69257434157` |
| Smithsonian American Art Museum | `af5247d8-8b86-4761-a76a-b731e221d5bd` |

## Persistence and shared allowance

Cloudflare D1 stores application jobs, completed public venue reports and source-check history. Concurrent requests reserve work atomically, so an active investigation is shared rather than duplicated. Results under 24 hours old are reused. Source checks are cached for five minutes per report. A newly completed investigation automatically checks its cited excerpts before returning the report.

The hackathon demo has **four sponsored research attempts in total**, enforced in the database across deployments. Failed or uncertain starts consume an attempt; the app never silently retries a paid start. This is a run-count limit, not a promise of a fixed dollar cost. Saved reports and recent source checks remain usable when the allowance is exhausted. An operator can deliberately change the allowance in source after assessing provider credits; deployments do not reset usage.

The target set is intentionally small: British Museum, Smithsonian American Art Museum and National Museum in New Delhi. Genuine investigations for all three venues completed on 6 November 2026 and are saved in production. Completion does not mean every requirement has support: gaps and unconfirmed excerpts remain unknown.

## Architecture

| Source | Responsibility |
| --- | --- |
| `src/page.html` | Responsive layout, semantic controls, print styles and accessible dialogs |
| `src/client.js` | Saved/live research, resumption, comparisons, source checks and exports |
| `src/core.js` | Research goal, normalization, official-domain validation and deterministic evidence states |
| `src/server.js` | Server-only TinyFish calls, job reservations, polling, persistence and allowance |
| `db/schema.ts` | Database schema |
| `drizzle/` | Generated schema-only SQL migration and metadata |
| `evidence/british-museum.json` | Genuine initial example with provenance |
| `tests/` | Core logic, real SQLite database behavior and mocked provider integration tests |

A completed result is normalized before persistence. Invalid or off-domain citations are rejected, evidence is deduplicated and explicit restrictions are kept before display limits are applied. Missing source dates stay unstated. Additional conservative wording checks prevent ticket policies from establishing step-free entry and training commitments from establishing personal assistance. Support for a particular visitor group is labelled conditional. Source checks flag unconfirmed excerpts for review, including when other excerpts in the same requirement match. These rules are heuristics, not a validated accuracy benchmark; they can leave usable facilities unknown. Source context must still be reviewed.

## Vercel hosting

The Vercel deployment target serves the application from `public/` and uses a small Node.js gateway for the five research API operations. The existing Cloudflare Worker remains the research backend and keeps the D1 database, saved reports, shared run allowance and TinyFish secret. No provider credentials are copied into Vercel or the browser.

```sh
npm run build:vercel
```

`vercel.json` defines the static output, API rewrites, fixture routes, security headers and gateway timeout. `api/gateway.js` forwards only the fixed allowlisted operations to the research backend. It validates same-origin browser requests, strips visitor credentials and preserves quota errors. It cannot proxy arbitrary URLs. The production frontend is hosted on Vercel. The existing Cloudflare service remains the persistent backend. Deployments use the tested source uploaded through the Vercel API; Git import was unavailable during setup.

## Run locally

Requires **Node.js 22.13 or newer**. The application runtime has no third-party dependencies. SQLite is provided by Node for local preview and tests.

```sh
npm run build
npm test
npm run dev
```

Open `http://localhost:3000`. Local preview creates a new in-memory SQLite database on startup. Set `TINYFISH_API_KEY` in your environment to enable live local research; it is optional for browsing the saved example. Never commit the key.

Schema development uses the pinned dev dependencies:

```sh
npm ci
npm run db:generate
```

Production uses Cloudflare D1 through the `DB` binding. The generated migration is included in the deployment artifact and applied during publication. The local development database is separate from hosted data.

```sh
npm run build
npm run validate
```

`worker/index.js` is generated from the readable source by `scripts/assemble.mjs`. The build packages it as `dist/server/index.js` with the hosting manifest and generated database migration.

## Validation

The current suite contains **46 checks**, covering evidence states, malformed input, official-domain filtering, durable quotas, concurrent reservation, cache reuse, server-only credentials, unrelated run isolation, persistence, source-check failure handling and quote limits. GitHub Actions runs tests, build and artifact validation on pushes.

Browser QA covers the report, comparison navigation, enquiry draft, fixture and the production research flow. No statistical extraction-accuracy claim is made from these software tests.

## Limitations and privacy

Venue websites can be stale, blocked, inconsistent or incomplete. Source checks match short text, so a wording change can remove a marker without changing a facility. A failed fetch is recorded separately. A report is research about published claims, not an accessibility certification, a route planner or a booking guarantee. Confirm critical details directly with the venue.

Reports contain public venue information and are shared. Requirement selections stay in the browser. No diagnosis, precise location or travel dates are collected. No automatic emails, ticket purchases or bookings are performed. A venue share link opens its latest report, not an immutable snapshot; export JSON when you need a fixed copy.

The original proposal described a broader Delhi NCR pilot and a 50-case evaluation. This implementation delivers a smaller verifiable MVP; that proposed pilot and evaluation are not claimed as completed.

## Three-minute demonstration

See [the inspection guide](docs/JUDGING_GUIDE.md) for a reproducible walkthrough and an explicit separation of implemented behavior from uncompleted validation.

- **0:00:** Explain why an entrance label cannot describe the complete visit.
- **0:25:** Open evidence, show restrictions and check an official source.
- **1:00:** Compare venue information using the same selected requirements.
- **1:30:** Show live TinyFish research without entering a key, or its explicitly dated cached result.
- **2:00:** Use the labelled fictional conflict scenario and draft the unresolved questions.
- **2:35:** Show provenance, source checking and honest limitations.

## References

- [TinyFish documentation](https://docs.tinyfish.ai/)
- [TinyFish official cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)
- [British Museum accessibility information](https://www.britishmuseum.org/visit/accessibility-museum)

Application code is MIT licensed. Venue and provider material retain their respective rights.
