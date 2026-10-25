# Go 2 Market

A chat with an AI art director that turns a product photo into a campaign-ready ad. Visitors earn XP for talking to us, level up, and unlock free shoots, formats and scene styles.

- **Chat (left):** n8n AI Agent (GPT-4.1) interviews the visitor and returns a shoot brief once it has the product, a mood and a photo.
- **Shoot (inline):** GPT-4.1 writes the scene prompt, `gpt-image-2` (quality `medium`, about $0.05 a shoot) edits the photo, imgbb hosts it, and Gmail sends the link.
- **Tracker (right / mobile sheet):** level ring, stats, level ladder, gallery of finished ads.

## Workflows (n8n)
| File | n8n workflow | Webhooks |
|---|---|---|
| `workflow-chat.json` | Go 2 Market Chat | `g2m-me`, `g2m-chat`, `g2m-email`, `g2m-photo` |
| `workflow.json` | Go 2 Market v3 | `go-2-market-v3`, `go-2-market-v3-status` |
| `workflow-progress.json` | Go 2 Market · Progress (sub-workflow) | none |

**Go 2 Market · Progress** is the only place that changes XP, levels, credits and unlocks. The other two call it with one event: `visit`, `message`, `photo`, `setCode`, `verify`, `spend`, `ad` or `refund`.

Data Tables:
- **`g2m_users`**: `uid, email, emailVerified, codeHash, codeExpires, codeTries, xp, credits, level, messages, ads, rewardedToday, sentToday, activeDate, streak, lastText, photoRewarded, photoUrl, photoName, shootsToday, shootDate, pro (boolean), proInterest`
- **`g2m_messages`**: `uid, role (user | assistant | shoot | photo), text, brief (JSON string)`
- **`go2market_jobs`**: `jobId, status, prompt, imageUrl, error, uid, title, aspect, style`

All webhooks are `POST` with Header Auth (`x-api-key`). Every response uses the shape `{ success, data, error }`.

### Setup after import
1. Create the three Data Tables above, using the string, number and boolean column types shown.
2. Import `workflow-progress.json` first. In the other two workflows, point every `Progress: …` Execute Workflow node at its new id.
3. Pick credentials:
   - Header Auth on all webhooks.
   - OpenAI on the models and on Generate image.
   - Query Auth on imgbb (Host photo, Upload to imgbb).
   - Gmail on Send code / Send email.
4. Publish all three workflows.

## Game rules
| Action | XP |
|---|---|
| Message of 3+ words (not a repeat) | +10 |
| New product photo | +30 |
| Verify email | +100 (and the first free shoot) |
| Finished ad | +50 |
| First message of the day | +15 × streak (max 5) |

Rewarded actions are capped at 20 a day. Messages are hard-capped at 60 a day.

| Level | Title | XP | Unlock |
|---|---|---|---|
| 1 | Intern | 0 | 1 shoot on email verify, square format |
| 2 | Junior Creative | 100 | +1 shoot, portrait / landscape |
| 3 | Art Director | 250 | +1 shoot, scene styles |
| 4 | Creative Director | 500 | +2 shoots, custom art direction |
| 5 | Chief Creative | 1000 | +3 shoots, Signature badge |

A shoot costs 1 credit. Failed shoots are refunded.

Each email can start at most 2 shoots a day (UTC), even with credits left. **Pro** members get 20 a day and don't use credits. To make someone Pro, set `pro = true` on their `g2m_users` row. Visitors who hit the cap can join the Pro waitlist, which sets `proInterest` to the date and emails the owner once.

## Contract

`progress` is returned by most webhooks:
```json
{ "level": 2, "title": "Junior Creative", "xp": 140, "levelXp": 100, "nextXp": 250, "nextTitle": "Art Director",
  "credits": 1, "messages": 9, "ads": 1, "streak": 2,
  "shootsToday": 1, "dailyLimit": 2, "pro": false, "proInterest": false,
  "email": "a@b.co" | null,
  "photo": { "url": "https://i.ibb.co/…", "name": "bottle.png" } | null,
  "unlocks": { "formats": ["square","portrait","landscape"], "styles": ["auto"], "direction": false, "signature": false } }
```

### `g2m-me`: load or create a visitor
Request: `{ "uid": "<24 chars a-z0-9>" }`

Response: `{ progress, messages: [{ id, role, text, brief }], ads: [{ jobId, title, imageUrl, prompt, createdAt }] }`

### `g2m-chat`: send a message
Request: `{ "uid", "text" (1–1000 chars) }`. The agent is told whether a product photo is on file, so it never asks twice.

Response: `{ reply, brief: { title, description } | null, progress, gained, leveledUp }`

Errors:
- `400`: invalid input.
- `429`: daily limit.
- `500`: agent unavailable. `data.progress` is still returned.

### `g2m-photo`: save the product photo
Request (`multipart/form-data`): `uid`, `photo` (image ≤ 4 MB).

- The photo is hosted on imgbb and saved on the visitor as `progress.photo`.
- Every shoot reuses it until the visitor replaces it.
- A new photo earns +30 XP once.

Response: `{ progress, gained, leveledUp }`. Returns `400` for invalid input and `500` if hosting fails.

### `g2m-email`: verify an email, join the Pro waitlist
Request: `{ "uid", "action": "start", "email" }`. Response: `{ sent: true, progress }`.

Request: `{ "uid", "action": "verify", "code": "123456" }`. Response: `{ progress, mergedUid, gained, leveledUp }`.

Request: `{ "uid", "action": "pro" }`. Response: `{ progress }` with `proInterest: true`. Returns `403` if the email isn't verified.

- Codes are stored hashed, expire after 10 minutes, and allow 5 tries.
- You can request one code per minute.
- If the email already belongs to a verified visitor, `mergedUid` is that visitor's uid. The app switches its cookie to it.

### `go-2-market-v3`: start a shoot
Request (`multipart/form-data`):
- `uid`
- `title`
- `description`
- `aspect` (`square` | `portrait` | `landscape`)
- `style` (`auto` | `luxe-dark` | `sunlit` | `minimal-studio` | `nature` | `neon`)
- `direction` (level 4+)

The product photo is downloaded from `progress.photo.url`.

Response, returned immediately while generation continues: `{ jobId, progress }`.

Errors:
- `400`: invalid input or no photo on file.
- `402`: no shoots left.
- `403`: email not verified, or a locked format/style/direction.
- `429`: today's shoot cap reached (2 a day, or 20 for Pro).

### `go-2-market-v3-status`: poll a shoot
Request: `{ "jobId" }`

Response: `{ status: "prompt" | "photo" | "done" | "failed", title, prompt, imageUrl, error }`. Returns `404` if the job doesn't exist.

## App routes
The browser only talks to these routes. They read the visitor id from the httpOnly cookie `g2m_uid`.

| Route | Proxies to |
|---|---|
| `GET /api/me` | `g2m-me` (sets the cookie on first visit) |
| `POST /api/chat` | `g2m-chat` |
| `POST /api/email` | `g2m-email` |
| `POST /api/photo` | `g2m-photo` |
| `POST /api/generate` | `go-2-market-v3` |
| `GET /api/status/<jobId>` | `go-2-market-v3-status` |

## Run locally
1. Copy `.env.example` to `.env.local` and fill in the seven variables (all server-only).
2. Run `npm install && npm run dev`, then open http://localhost:3000.
