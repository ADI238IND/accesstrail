# AccessTrail: a three-minute inspection

**Problem:** a venue can publish an accessible entrance and still leave the route to a gallery, lift or restroom unclear. A single positive label loses those distinctions.

**Product:** TinyFish researches official pages. AccessTrail preserves the evidence, restrictions and unknowns, then turns unresolved needs into questions the visitor can use.

## Inspect the working application

1. Open https://accesstrail.vercel.app. Three saved investigations are available without an account or API key.
2. Mark **Lift access** essential for your visit. The British Museum report keeps this need unresolved even though other facilities have published support. Inspect both lift statements and their excerpt-check notices.
3. Choose **Prepare confirmation questions**. Essential unanswered needs come first; the draft remains editable and is never sent automatically.
4. Open **Compare venues**. The same selected requirements and essential priorities apply to all three reports. These are information counts, not accessibility rankings.
5. Select **Conflict demo**, then **Explore conflict demo**. The fictional restroom's positive statement cannot cancel its restriction. Open the two clearly fictional fixture pages if desired.
6. Return to a real venue to inspect **Run provenance** and **Source check**. Source checks retrieve cited pages with TinyFetch; matching a short fragment does not validate the whole summary or a physical facility.
7. Download the Markdown visit brief or evidence JSON. The brief includes priorities, unanswered questions and official source URLs.

## What is implemented

TinyAgent research, official-domain restrictions, structured evidence normalization, deterministic evidence states, TinyFetch excerpt checks, persistent shared reports, concurrent-run deduplication, limited sponsored research, personalized essential priorities, comparisons, editable enquiries and exports. Vercel serves the public UI and a bounded gateway; Cloudflare retains the secret and D1 records.

## What the tests establish

`npm test` exercises state reduction, invalid/off-domain records, contradictory evidence, conditional support, excerpt-check failures, database reservations and quotas, provider integration with mocked responses, gateway boundaries and essential-priority handling. They establish software behavior under those inputs. They do not measure TinyFish's real-world extraction accuracy.

## Honest scope

- Three genuine venue investigations completed; the conflict scenario is explicitly fictional.
- This is not a door-to-destination route planner, physical audit or live lift sensor.
- Short excerpt matches do not establish that every paraphrase is correct. Read the source context.
- No wheelchair-user study, partnerships, measured time savings, extraction benchmark or physical verification is claimed.
- The four-attempt shared research limit persists across deployments. Cached reports remain usable after that allowance is exhausted.

**Next validation:** recruit wheelchair users and companions for supervised task completion; independently annotate official-page evidence before measuring extraction precision and omissions. These are proposed next steps, not completed results.
