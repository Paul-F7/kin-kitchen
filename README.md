# Kin Kitchen

**Reconnecting people with Indigenous food traditions through AI, 3D, and voice.**

> **Live demo:** [kin-kitchen-two.vercel.app](https://kin-kitchen-two.vercel.app/)

Upload a photo of your kitchen or ingredients. Kin Kitchen identifies what you have, surfaces Indigenous context (Ojibwe names, cultural uses, nation & territory), matches recipes from an Indigenous recipes dataset, and guides you through cooking in an immersive step-by-step 3D kitchen with voice control and TTS narration.

---

## Features

- **AI ingredient recognition** — Cloudinary LVIS detection + Google Gemini analysis
- **Indigenous context** — Ojibwe names, cultural uses, nation/territory info per ingredient
- **Recipe matching** — Matches detected ingredients against an Indigenous recipes dataset
- **3D kitchen** — Three.js scene with GLB models: cutting board, pot, stew, and ingredients
- **8-step cooking guide** — Chop squash → dice onion → mince garlic → pour stock → boil → add veggies → add beans & corn → stir & reveal
- **Voice control** — Say "next" or "continue" to advance steps hands-free
- **TTS narration** — ElevenLabs voices for step instructions and story narration
- **AR storyboard** — 4-scene CookingAR experience
- **Nation picker** — Select your nation/territory for personalised context

---

## Quick start

```bash
cp .env.example .env   # fill in your API keys (see below)
npm run install:backend
npm run dev
```

Open `http://localhost:3000`. Upload an image (or use the demo preset `threesisters`), then click **View 3D Kitchen** to run the full cooking guide.

---

## Tech stack

### Frontend

| Layer | Technology | Purpose |
|-------|------------|---------|
| Markup / UI | HTML5, CSS3 | Single-page app — splash, nation picker, upload, detect, recipe, AR, story, 3D kitchen |
| Fonts | Google Fonts (Playfair Display, DM Sans) | Typography |
| Runtime | Vanilla JavaScript (ES5+ strict) | `app.js`, `upload.js`, `render.js`, `story.js` |
| 3D | Three.js (r150+) | Kitchen scene — GLB meshes, OrbitControls, WebXR |
| Cooking guide | Custom `CookingGuide` | 8-step overlay with knife/spoon/steam animations |
| AR | `CookingAR` | 4-scene storyboard |
| Audio | Web Audio API + ElevenLabs | Chimes, step TTS, story narration |
| HTTP | Fetch API | `/api/upload`, `/api/tts`, `/api/story-audio` |

### Backend

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js | Server |
| Framework | Express 4.x | Static files, JSON, API routes, error handling |
| Config | dotenv | `.env` (PORT, API keys) |
| Upload | Multer | In-memory/disk uploads, validation |

### External services

| Service | Role | Env vars |
|---------|------|----------|
| **Cloudinary** | Storage, CDN, LVIS detection | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Google Gemini** | Image analysis, Indigenous context, recipe suggestions | `GEMINI_API_KEY` |
| **ElevenLabs** | TTS: step instructions + story narration | `ELEVENLABS_API_KEY` or `ELEVEN_LABS_API_KEY` |
| **Hugging Face** | Depth maps, BLIP captioning (optional) | `HF_TOKEN` or `REACT_APP_HF_TOKEN` |

---

## Architecture

```
Browser (SPA)
  app.js | upload.js | render.js | generate3d.js + CookingGuide (steps 1–8)
              ↓                  ↓
     /api/upload       /api/tts   /api/story-audio   /api/health
              ↓                  ↓
Node + Express
  routes: upload, story, hf, generate3d
  services: cloudinary, gemini, elevenlabs, recipe-matcher, food-filter
      → Cloudinary | Gemini | ElevenLabs | indigenous-recipes.json
```

### Screen flow

**splash** → nation → **upload** → **detect** → **recipe** → **kitchen3d** (or ar / story / word)

### Directory structure

```
Hack_Can_3_man/
├── backend/
│   ├── server.js
│   ├── routes/           # upload, story, hf, generate3d
│   ├── services/         # cloudinary, gemini, elevenlabs, recipe-matcher, food-filter, crop, …
│   ├── data/             # indigenous-recipes.json, recipe-stories.json
│   └── uploads/
├── frontend/
│   ├── index.html
│   ├── styles.css, kin-kitchen-ui.css
│   └── js/
│       ├── app.js                # KinKitchenApp: goTo(), state, nation, nav
│       ├── upload.js             # POST /api/upload, progress, 3D vs detect
│       ├── render.js             # Detection, recipe, story, word from uploadData
│       ├── generate3d.js         # Three.js scene, GLBs, CookingGuide, WebXR
│       ├── cookingGuide.js       # 8-step overlay, TTS, voice "next/continue"
│       ├── ingredientPositions.js
│       ├── steps/                # Step1Chop → Step8Stir
│       ├── story.js, ar.js, hero3d.js, …
├── assets/3d/            # *.glb (ingredients, pot, stew, cutting board, …)
├── .env.example
├── package.json
└── vercel.json
```

---

## Data flow

### Upload pipeline

1. User picks a file (or uses a demo preset like `threesisters`).
2. `POST /api/upload` (FormData).
3. Multer → Cloudinary (upload + LVIS bounding boxes) → Gemini (analysis + cultural context) → recipe-matcher.
4. Response: `url`, `analysis`, `boundingBoxes`, `suggestedRecipes`, `thumbnailUrl`, `posterUrl`.
5. Frontend stores in `KinKitchenApp.state.uploadData`, renders screens, navigates to `detect` or `kitchen3d`.

### 3D kitchen & cooking guide

1. `generate3d.js` builds the Three.js scene and loads GLBs from `/assets/3d/`.
2. `CookingGuide.init(scene, camera, renderer, meshes)` mounts the 8-step overlay.
3. Each step plays TTS via `GET /api/tts?text=<phrase>`; "Listen" replays; voice "next"/"continue" advances.
4. WebXR when supported, otherwise fullscreen 3D.

---

## API reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Service status (cloudinary, gemini, elevenlabs, huggingface) |
| POST | `/api/upload` | Multipart upload → url, analysis, boundingBoxes, suggestedRecipes |
| GET | `/api/story?recipeId=...` | `{ title, script }` |
| GET | `/api/story-audio?recipeId=...` | MP3 story narration (ElevenLabs) |
| GET | `/api/tts?text=...` | MP3 step phrase (max 300 chars) |
| POST | `/api/generate3d` | `{ boundingBoxes }` → `{ ingredients }` |
| POST | `/api/hf/depth` | Image crop → depth map |
| POST | `/api/hf/segment` | Image crop → caption/shape |

---

## Environment variables

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
HF_TOKEN=          # optional
PORT=3000          # default
```

Copy `.env.example` to `.env` and fill in your keys before running locally.

---

## Our story

### What inspired us

We wanted to help people reconnect with Indigenous foodways — not as a history lesson, but as something you can do in your own kitchen. So many of us are disconnected from where our food comes from and from the knowledge that Indigenous cultures have carried for generations. We were inspired by the **Three Sisters** (squash, beans, corn) and by the idea that a photo of your counter could become a doorway: to Ojibwe names, to traditional recipes, and to a guided cooking experience that feels both modern and rooted.

### How we built it

Node + Express backend and a vanilla JS frontend (no framework) so we could move fast. The upload pipeline runs Multer → Cloudinary (LVIS) → Gemini → recipe-matcher. The 3D kitchen is a Three.js scene with `CookingGuide` coordinating 8 scripted step modules (Step1Chop … Step8Stir), each with TTS and voice control.

### Challenges

- **Many APIs** — normalising errors, rate limits, and response shapes across Cloudinary, Gemini, ElevenLabs, and Hugging Face.
- **3D choreography** — keeping knife animations, board/pot/stew visibility, and positions in sync across all 8 steps.
- **Merging branches** — one branch had the recipe list + 3D button; another had the full 8-step finish. Combining them without breaking either side took careful asset and module management.
- **Voice & accessibility** — Web Speech API support varies across browsers; fallbacks and TTS/UI sync required extra care.
