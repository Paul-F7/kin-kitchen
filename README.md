# Aki — Indigenous Food Reconnection

Aki reconnects people with Indigenous food traditions through AI-powered ingredient recognition, traditional recipes, and immersive 3D/AR experiences. Users upload a photo or video of their kitchen or ingredients; the app identifies food, surfaces Indigenous context (e.g. Ojibwe names, cultural uses), suggests recipes from an Indigenous recipes dataset, and offers a step-by-step 3D kitchen with voice-guided cooking instructions.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Data flow](#data-flow)
- [API reference](#api-reference)
- [Frontend structure](#frontend-structure)
- [Environment & run](#environment--run)

---

## Tech stack

### Frontend

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Markup / UI** | HTML5, CSS3 | Single-page app: splash, nation picker, upload, detection, recipe, AR, story, word, 3D kitchen. Custom styles in `styles.css`, `aki-ui.css`. |
| **Fonts** | Google Fonts (Playfair Display, DM Sans) | Typography for titles and body. |
| **Runtime** | Vanilla JavaScript (ES5+ strict, no framework) | Screen navigation (`app.js`), upload flow (`upload.js`), renderers (`render.js`), story modal (`story.js`). |
| **3D** | Three.js (r150+) | 3D kitchen scene: GLB ingredient meshes, lighting, shadows, OrbitControls, TransformControls. WebGL context is created with `xrCompatible: true` for WebXR. |
| **3D loading** | Three.js GLTFLoader | Ingredients loaded from `/assets/3d/*.glb`; positions/scales from `ingredientPositions.js`. |
| **XR** | WebXR Device API (optional) | Immersive mode when supported; otherwise fullscreen 3D with drag-to-look fallback (e.g. Safari iOS). |
| **Cooking guide** | Custom (CookingGuide) | Step-by-step overlay in 3D: knife/spoon/steam/sparkle animations, countdown ring, Listen button. |
| **AR storyboard** | Custom (CookingAR) | 4-scene storyboard (Arrival → Reveal → Preparation → Story) with knife chop animation and cultural text. |
| **Audio** | Web Audio API, HTMLMediaElement | Chimes (oscillators); step TTS and story narration via fetched MP3 from backend (ElevenLabs). |
| **HTTP** | Fetch API | All backend communication: `POST /api/upload`, `GET /api/tts`, `GET /api/story-audio`, etc. |

### Backend

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Runtime** | Node.js | Server process. |
| **Framework** | Express 4.x | Static files, JSON/urlencoded middleware, API routes, 404/500 handlers. |
| **Config** | dotenv | Loads `.env` from project root (PORT, API keys). |
| **Upload handling** | Multer | In-memory or disk uploads; file type/size validation; writes to `backend/uploads/`. |
| **File system** | fs, path | Reading `data/*.json` (recipes, stories), cleanup of temp uploads. |
| **HTTPS** | Node `https` | Outbound calls to Cloudinary Analyze API, Hugging Face Inference API. |

### External services & integrations

| Service | Role | Env vars |
|---------|------|----------|
| **Cloudinary** | Media storage + CDN; LVIS object detection on upload; optional Analyze API (captioning + LVIS) for images. Single module: `backend/services/cloudinary.js` (upload, thumbnail/poster URL helpers). | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Google Gemini** | Image/video analysis: Indigenous context (traditional names, cultural uses, preparations, seasonality), detected objects, recipe suggestions, nutrition notes. Optional story script generation. | `GEMINI_API_KEY` |
| **ElevenLabs** | Text-to-speech: recipe story narration (`/api/story-audio`), short step instructions (`/api/tts`) for the 3D cooking guide. | `ELEVENLABS_API_KEY` (or `ELEVEN_LABS_API_KEY`) |
| **Hugging Face** | Inference API: depth estimation (Depth Anything), BLIP captioning for crops; used by optional 3D/AR pipelines. | `HF_TOKEN` or `REACT_APP_HF_TOKEN` |

### Data & static assets

- **`backend/data/indigenous-recipes.json`** — Indigenous recipes with ingredient lists; used by `recipe-matcher` for suggested recipes.
- **`backend/data/recipe-stories.json`** — Static story scripts per recipe ID (title + script) for narration fallback.
- **`frontend/assets/`** — Static assets; `/assets` served by Express (e.g. `/assets/3d/*.glb` for 3D models).

---

## Architecture

### High-level

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browser (single-page app)                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ app.js      │  │ upload.js   │  │ render.js   │  │ generate3d.js       │  │
│  │ navigation  │  │ POST upload │  │ detection,  │  │ Three.js scene,     │  │
│  │ state       │  │ progress    │  │ recipe,     │  │ CookingGuide, XR   │  │
│  └──────┬──────┘  └──────┬──────┘  │ story, word │  └──────────┬──────────┘  │
│         │                │         └──────┬──────┘              │            │
│         │                │                │                     │            │
│         └────────────────┼────────────────┼─────────────────────┘            │
│                          ▼                ▼                                  │
│                   ┌──────────────┐  ┌──────────────┐                        │
│                   │ /api/upload  │  │ /api/tts     │  /api/story-audio       │
│                   │ /api/health  │  │ /api/story    │  /api/generate3d        │
│                   └──────┬───────┘  └──────┬───────┘  /api/hf/*              │
└──────────────────────────┼─────────────────┼────────────────────────────────┘
                           │                 │
┌──────────────────────────▼─────────────────▼────────────────────────────────┐
│  Node + Express (backend)                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ routes: upload, story, hf, generate3d                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ cloudinary │ │ gemini      │ │ elevenlabs │ │ recipe-     │             │
│  │ (upload,   │ │ (analyze    │ │ (TTS)      │ │ matcher     │             │
│  │  thumb)    │ │  media)     │ │            │ │             │             │
│  └─────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘             │
│        │               │               │               │                    │
│        ▼               ▼               ▼               ▼                    │
│  Cloudinary     Google Gemini    ElevenLabs     indigenous-recipes.json      │
│  (storage,      (context,        (voice)        recipe-stories.json          │
│   LVIS)          objects)                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory structure

```
video-analyzer/
├── backend/
│   ├── server.js              # Express app, static files, route mounting, health
│   ├── routes/
│   │   ├── upload.js          # POST /api/upload — multer, Cloudinary, Gemini, recipe match
│   │   ├── story.js           # GET /api/story, /api/story-audio, /api/tts
│   │   ├── hf.js              # POST /api/hf/depth, /api/hf/segment (Hugging Face proxy)
│   │   └── generate3d.js      # POST /api/generate3d — normalize boundingBoxes → ingredients
│   ├── services/
│   │   ├── cloudinary.js      # Upload, LVIS boxes, getThumbnailUrl, getVideoPosterUrl
│   │   ├── cloudinary-analysis.js  # Analyze API (caption + LVIS) for images
│   │   ├── gemini.js          # analyzeMedia(), optional generateStoryScript()
│   │   ├── elevenlabs.js      # textToSpeech()
│   │   ├── recipe-matcher.js  # Match ingredients to indigenous-recipes.json
│   │   ├── food-filter.js     # isFoodLabel(), MIN_CONFIDENCE for LVIS
│   │   ├── crop.js            # Image cropping helpers (e.g. for HF)
│   │   └── ...
│   ├── data/
│   │   ├── indigenous-recipes.json
│   │   └── recipe-stories.json
│   └── uploads/               # Temp uploads (multer dest)
├── frontend/
│   ├── index.html             # SPA shell, screens, logo cloud
│   ├── styles.css, aki-ui.css
│   └── js/
│       ├── app.js             # AkiApp: goTo(), state, nation, nav, screen hooks
│       ├── upload.js          # File input, POST /api/upload, progress, 3D vs detect route
│       ├── render.js          # AkiRender: renderDetection, renderRecipe, renderStory, renderWord
│       ├── story.js           # Story modal, fetch /api/story-audio, play
│       ├── generate3d.js      # handleGenerate3d: scene, GLBs, CookingGuide, WebXR/fullscreen
│       ├── cookingGuide.js    # CookingGuide: steps, knife/spoon/steam, TTS (Listen), overlay
│       ├── ingredientPositions.js
│       ├── ar.js              # CookingAR: 4-scene storyboard, knife chop
│       ├── tiltCard.js, glow.js, utils.js
│       └── ...
├── assets/                    # Static assets (e.g. 3d/*.glb)
├── .env                       # Not committed; see .env.example
├── .env.example
├── package.json               # Root: scripts delegate to backend
└── README.md
```

### Screens (frontend state machine)

- **splash** → nation → **upload** → **detect** → **recipe** | **ar** | **story** | **word** | **kitchen3d**
- `AkiApp.state.uploadData` holds the last successful `/api/upload` response; all post-upload screens read from it.
- **kitchen3d**: entered when `mode3d` is true and upload completes; `handleGenerate3d(imageUrl, boundingBoxes, container)` builds the Three.js scene and mounts CookingGuide.

---

## Data flow

### 1. Upload pipeline

1. User selects file (or uses “View 3D Kitchen” and selects file).
2. **upload.js** sends `POST /api/upload` with `FormData` (file).
3. **upload.js** (backend):
   - Multer writes file to `uploads/`.
   - Optional **demo preset**: if filename matches (e.g. `threesisters`), uses hardcoded ingredients and skips Cloudinary/Gemini.
   - Otherwise:
     - **Cloudinary** `upload()`: upload with `detection: 'lvis'` → `url`, `publicId`, `boundingBoxes`, `thumbnailUrl`, `posterUrl`.
     - **Gemini** `analyzeMedia(url, mediaType)`: Indigenous context, detected objects, recipes, nutrition.
     - **Cloudinary Analyze** (images only): caption + LVIS → `contentAnalysis.foodDetected`.
     - **recipe-matcher**: merge ingredients from boundingBoxes + contentAnalysis + analysis.detectedObjects → `suggestedRecipes`.
   - Response: `url`, `publicId`, `thumbnailUrl`, `posterUrl`, `mediaType`, `analysis`, `contentAnalysis`, `boundingBoxes`, `suggestedRecipes`.
4. **upload.js** (frontend): stores result in `AkiApp.state.uploadData`, calls `AkiRender.render*` for each screen, then either `AkiApp.goTo('detect')` or `goTo('kitchen3d')` + `handleGenerate3d(...)`.

### 2. 3D kitchen + cooking guide

1. **generate3d.js** creates Three.js scene, loads GLBs from `/assets/3d/`, places them using `ingredientPositions.js` (and optional boundingBoxes).
2. **CookingGuide.init(scene, camera, renderer, ingredientMeshes)** builds overlay (card, progress, steps) and step data (CHOP, DICE, MINCE, DRAIN, SAUTÉ, etc.).
3. On each step apply, **CookingGuide** calls `_speakStep(step)`: fetches `GET /api/tts?text=<step.title>`, plays MP3 (ElevenLabs). “Listen” button replays current step.
4. WebXR: when available, “Enter XR” launches immersive session; on Safari iOS, fullscreen 3D with drag-to-look is used instead.

### 3. Story & TTS

- **Story modal**: fetches `GET /api/story?recipeId=...` (title + script) and `GET /api/story-audio?recipeId=...` (MP3). Script comes from `recipe-stories.json`; audio from ElevenLabs.
- **Step TTS**: `GET /api/tts?text=...` returns MP3 for short phrases (e.g. “Cube the squash”). Used by CookingGuide automatically and via “Listen”.

---

## API reference

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/health` | Service status; `services.elevenlabs`, `gemini`, `cloudinary`, `huggingface` booleans. |
| POST | `/api/upload` | Multipart file upload. Returns URL, analysis, boundingBoxes, suggestedRecipes, thumbnailUrl, posterUrl. |
| GET | `/api/story?recipeId=...` | JSON `{ title, script }` for recipe story. |
| GET | `/api/story-audio?recipeId=...` | MP3 of story script (ElevenLabs). |
| GET | `/api/tts?text=...` | MP3 of short text (ElevenLabs), max 300 chars. |
| POST | `/api/generate3d` | Body: `{ boundingBoxes }`. Returns `{ ingredients }` (normalized). |
| POST | `/api/hf/depth` | Multipart `crop` (image). Returns depth map. |
| POST | `/api/hf/segment` | Multipart `crop` (image). Returns caption/shape. |

---

## Frontend structure

- **app.js**: Screen list, `goTo(screen)`, `state`, nation grid, bottom nav, button wiring (splash, nation, detect, recipe, AR, 3D kitchen).
- **upload.js**: File input, progress UI, `POST /api/upload`, then render + navigate (detect or kitchen3d with `handleGenerate3d`).
- **render.js**: Fills detection, recipe, story, word screens from `uploadData` (ingredients, bounding boxes, analysis, suggested recipes).
- **generate3d.js**: Scene init, GLB loading, lighting, controls, WebXR/fullscreen, `handleGenerate3d()` entry point; mounts CookingGuide when ready.
- **cookingGuide.js**: Step definitions, 3D animations (knife, spoon, steam, etc.), overlay DOM, TTS fetch + play, Listen button.
- **story.js**: Modal open/close, fetch story audio, playback.
- **ar.js**: CookingAR storyboard (4 scenes), knife animation, cultural text.

---

## Environment & run

1. Copy `.env.example` to `.env` and set:
   - **Cloudinary**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - **Gemini**: `GEMINI_API_KEY`
   - **ElevenLabs**: `ELEVENLABS_API_KEY` (or `ELEVEN_LABS_API_KEY`)
   - **Hugging Face** (optional): `HF_TOKEN` or `REACT_APP_HF_TOKEN`
   - **PORT** (default 3000)

2. Install and run:
   ```bash
   npm run install:backend
   npm run dev
   ```
   Server runs at `http://localhost:3000` (or `PORT`). Static frontend and `/assets` are served by the same server.

3. **Health**: `GET http://localhost:3000/api/health` shows which services have keys configured.

---

This README documents the tech stack and architecture of Aki as of the current codebase. For product or design overview, add a short “About Aki” section at the top if needed.
