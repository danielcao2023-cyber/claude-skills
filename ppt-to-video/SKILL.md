---
name: ppt-to-video
description: Generate a narrated presentation video from source materials — the full pipeline: extract content → design slides (via frontend-slides) → export slide images → write narration script → TTS + compose video. Each stage pauses for user approval before continuing. Use when the user wants to turn a document/proposal into a presentation video, especially for leadership briefings or project pitches.
claude-code: true
triggers:
  - "做.*汇报.*视频"
  - "生成.*PPT.*视频"
  - "制作.*演示.*视频"
  - "方案书.*视频"
  - "汇报.*ppt.*视频"
  - "presentation.*video"
tool_requirements:
  required:
    - Bash
    - Read
    - Write
    - Edit
    - AskUserQuestion
    - Agent
    - Skill
  optional:
    - Glob
    - Grep
  system_deps:
    - python3
    - uv
    - magick
    - soffice
    - ffmpeg
    - node
  deps_check:
    python3: "python3 --version"
    uv: "which uv"
    magick: "which magick"
    soffice: "which soffice"
    ffmpeg: "which ffmpeg"
    node: "which node"
venv_path: "/Users/caogong/Documents/MoneyPrinterTurbo/.venv"
mpt_root: "/Users/caogong/Documents/MoneyPrinterTurbo"
skill_deps:
  frontend-slides: "frontend-slides"
scripts:
  ppt_generator: "generate_ppt.py"
  video_generator: "generate_video.py"
  screenshot_exporter: "scripts/screenshot-slides.js"
---

# PPT-to-Video Pipeline

Convert source documents into narrated presentation videos with AI-designed slides, script, and TTS synthesis.

## Core Principle: Stage-Gated Workflow

**NON-NEGOTIABLE: Every stage output MUST be presented to the user for review and approval before moving to the next stage.** Never pipeline stages together without confirmation gates. This is the most important rule and the primary reason this skill exists.

## When to Use

- User provides a document (DOCX, Markdown, PDF) and wants a narrated presentation video
- User wants to pitch a project/proposal to leadership
- User wants to turn meeting notes or plans into a video walkthrough

## Required Prerequisites

Before starting, confirm the following are available in the environment:

| Dependency | Check Command | Purpose |
|---|---|---|
| Python 3.11+ | `python3 --version` | python-pptx, moviepy |
| `uv` | `which uv` | Package management |
| Node.js | `which node` | Puppeteer/Playwright for slide screenshots |
| ImageMagick | `which magick` | Image format conversion |
| LibreOffice | `which soffice` | PPTX → PDF (fallback path) |
| Edge TTS | Part of MoneyPrinterTurbo deps | Chinese/English TTS |
| `frontend-slides` skill | Via Skill tool | HTML slide generation (primary PPT path) |

If MoneyPrinterTurbo is not installed, clone and set it up first (the skill uses its TTS engine).

## Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│ STAGE 1  │───▶│ STAGE 2  │───▶│ STAGE 3  │───▶│ STAGE 4  │───▶│   STAGE 5    │───▶│ STAGE 6  │
│ Extract  │    │ Design   │    │ Export   │    │ Write    │    │ Confirm Video │    │ Compose  │
│ Content  │    │ Slides   │    │ Images   │    │ Narration│    │ Format        │    │ Video    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────────┘    └──────────┘
     ✅              ✅              ✅              ✅                ✅                ✅
   User OK       User OK        User OK        User OK         User OK            Final
```

Each `✅` is a hard stop — show the output, ask for feedback, apply changes if needed, get explicit approval, then move on.

---

## Stage 1: Extract & Understand Content

**Goal:** Read the source document and understand what the user wants to present.

### Steps:

1. **Read the source file.** If DOCX, use `python-docx` to extract headings, paragraph count, and key structure. If Markdown/PDF, read directly.

2. **Understand the audience and goal.** Ask the user:
   - Who is the audience? (leadership / colleagues / external)
   - What's the core message? (seek approval / inform / pitch)
   - Any specific focus areas? (e.g., "emphasize the pain points and ROI")
   - Any existing demo/product to reference? (screenshots, running apps)

3. **Propose slide outline.** Present a slide-by-slide outline table:

   | Slide | Title | Key Points |
   |-------|-------|------------|
   | 1 | Cover | Project name, dept, date |
   | 2 | ... | ... |
   | N | Next Steps | Call to action |

   Each slide should have a clear single focus. Avoid cramming — prefer more slides over dense ones.

4. **Wait for user approval.** User may reorder, add, remove, or adjust slides. Iterate until confirmed.

**Output artifact:** Confirmed slide outline.

---

## Stage 2: Design Slides via frontend-slides

**Goal:** Create visually polished slides using the `frontend-slides` skill, then export them as PNG images for video composition.

**CRITICAL:** This stage delegates slide design to `frontend-slides`. Do NOT generate PPT via python-pptx. The `frontend-slides` skill produces superior HTML presentations with distinctive design, proper typography, and animation — we capture screenshots of the final rendered state.

### Process:

#### Step 2.1: Invoke frontend-slides

Use the `Skill` tool to invoke `frontend-slides`. Pass the approved outline from Stage 1 as the content to generate.

During the `frontend-slides` flow:
- **Phase 1 (Content Discovery):** Use the already-confirmed outline from Stage 1 as the content. If `frontend-slides` asks questions, answer based on what was already determined.
- **Phase 2 (Style Discovery):** Let the user choose their preferred visual style. Generate and show style previews as the `frontend-slides` skill instructs.
- **Phase 3 (Generation):** `frontend-slides` will produce a single self-contained HTML file.

**After `frontend-slides` generates the HTML file, return to this skill (ppt-to-video) for the remaining steps.**

#### Step 2.2: Export Slides as PNG Images

Once the HTML presentation is ready, export each slide as a PNG image for video composition.

**Method A: Playwright Screenshot (Recommended)**

Use the screenshot exporter script:

```bash
cd $MPT_ROOT && mkdir -p storage/ppt_images && \
node scripts/screenshot-slides.js <path-to-html> storage/ppt_images/slide_%02d.png
```

The script:
1. Starts a local HTTP server serving the HTML file's directory
2. Opens the presentation in a headless Chromium browser
3. Iterates through all `.slide` elements
4. Screenshots each slide at **1920×1080** (16:9)
5. Saves as sequentially numbered PNGs

If the script doesn't exist yet, create it (see Script Templates below).

**Method B: Manual Browser Screenshot (Fallback)**

If Playwright is not available:
1. Open the HTML file in Chrome: `open <path-to-html>`
2. `frontend-slides` HTML uses `class="slide"` — manually screenshot each slide
3. Or use the `export-pdf.sh` from frontend-slides, then convert PDF pages to PNG via ImageMagick

**Method C: PPTX Fallback (Last Resort)**

If `frontend-slides` is unavailable, fall back to `python-pptx` as before:
- Create `generate_ppt.py` using `python-pptx` with the design guidelines below
- `cd $MPT_ROOT && soffice --headless --convert-to pdf "xxx.pptx" --outdir storage/`
- `cd $MPT_ROOT && magick -density 200 "storage/xxx.pdf" -quality 95 storage/ppt_images/slide_%02d.png`

### Design Guidelines (for fallback python-pptx path):

- **16:9 widescreen** format
- **Professional dark blue / teal theme** for leadership audiences; adjust palette if user specifies
- **Consistent title bar** on every content slide
- **Clean typography:** Microsoft YaHei for Chinese, generous spacing
- **Slide number** on each page

### Approval Gate:

- **Show the HTML file path** and the number of slides
- **Show exported slide images** (a few representative PNGs)
- Ask: "Does the slide design look good? Any content or design changes needed?"
- Iterate until approved (may need to go back to frontend-slides for adjustments)

**Output artifacts:** HTML presentation file + slide PNG images (e.g., `slide_00.png` through `slide_NN.png`).

---

## Stage 3: Write Narration Script

**Goal:** Write spoken narration for each slide, matching the presentation tone.

### Writing Guidelines:

- **Natural spoken Chinese** — not written-essay style. Read it aloud in your head.
- **Appropriate length per slide:**
  - Cover/greeting: ~80-150 chars, ~15-30s audio
  - Content slides: ~150-350 chars, ~35-75s audio
  - Summary/call-to-action: ~100-200 chars, ~20-40s audio
- **Smooth transitions** between slides: "接下来我们看..." / "最后..."
- **Call out specific data points** from slides — don't just repeat text, add context
- **Professional but warm** tone

### Output Format:

Present narration as a numbered list matching slide numbers:

```
[Slide 1 - 封面]
各位领导好，今天向各位汇报...

[Slide 2 - ...]
...

(etc.)
```

Also save as `storage/narration.json` for the video generation script:

```json
{
  "slides": [
    {"num": 1, "title": "封面", "narration": "..."},
    ...
  ]
}
```

### Approval Gate:

- **Show the full narration text** for user review
- Ask: "解说词内容合适吗？有没有需要调整的地方？"
- Iterate until approved

**Output artifact:** `narration.json` ready for Stage 4.

---

## Stage 5: Confirm Video Output Format

**Goal:** Let the user decide video aspect ratio and resolution BEFORE rendering.

### What to confirm:

1. **Aspect ratio:**
   - Landscape 16:9 (1920×1080) — best for projector/TV playback, meetings
   - Portrait 9:16 (1080×1920) — best for phone viewing, short video platforms

2. **If additional resolution options are relevant:** 720p vs 1080p (default: 1080p)

### Approval Gate:

- User selects aspect ratio and resolution
- Record the choice; use it in Stage 6 rendering parameters

**Output artifact:** Confirmed video format spec.

---

## Stage 6: Compose Video

**Goal:** Combine slide images + TTS narration + background music into a single MP4.

### Technical Approach:

Use MoviePy + MoneyPrinterTurbo's Edge TTS engine:

1. **Generate TTS audio per slide** using `app.services.voice.tts()` (zh-CN-XiaoxiaoNeural-Female by default)
2. **Create video clip per slide:** image + audio + subtitle overlay
3. **Concatenate** all slide clips in order
4. **Mix background music** at low volume (random from MPT's `resource/songs/`)
5. **Export** to H.264 MP4

### Implementation:

Create `generate_video.py` at MPT root. Key imports:

```python
import sys; sys.path.insert(0, "$MPT_ROOT")
from app.config import config
from app.services import voice  # MPT Edge TTS
from moviepy import (
    ImageClip, AudioFileClip, TextClip, CompositeVideoClip,
    concatenate_videoclips, CompositeAudioClip,
)
```

### Approval Gate:

- **This is the final output.** Once the video renders successfully, show the file path and size.
- If changes are needed, go back to the relevant stage (narration or slides) and regenerate.

**Output artifact:** Final MP4 video file.

---

## Stage 7: Deliver

Present the final deliverables summary:

| Artifact | Path | Size |
|----------|------|------|
| Slides (HTML) | `xxx.html` | X KB |
| Video | `xxx.mp4` | X MB |
| Script | `xxx.json` | X KB |

Open the video for preview.

---

## Tool Usage Per Stage

### Stage 1: Extract Content
| Tool | Usage |
|------|-------|
| `Read` | Read source DOCX/Markdown/PDF |
| `Bash` | `python3 -c "from docx import Document..."` to extract structure |
| `AskUserQuestion` | Ask: audience, goal, focus areas |

### Stage 2: Design Slides
| Tool | Usage |
|------|-------|
| `Skill` | Invoke `frontend-slides` with approved outline |
| `Bash` | Run `scripts/screenshot-slides.js` to export PNGs |
| `Bash` | `ls storage/ppt_images/` to verify image count |

### Stage 3: Write Narration
| Tool | Usage |
|------|-------|
| `Write` | Save narration to `storage/narration.json` |
| Plain text | Show full narration inline for user review |

### Stage 5: Confirm Video Format
| Tool | Usage |
|------|-------|
| `AskUserQuestion` | Landscape 16:9 vs Portrait 9:16 |

### Stage 6: Compose Video
| Tool | Usage |
|------|-------|
| `Write` | Create/update `generate_video.py` at MPT root |
| `Bash` | `cd $MPT_ROOT && uv run python generate_video.py` |
| `Bash` | `ls -lh storage/xxx.mp4` to verify output |
| `Bash` | `open storage/xxx.mp4` to preview |

### Stage 7: Deliver
| Tool | Usage |
|------|-------|
| `Bash` | `ls -lh` each output file |
| Plain text | Summary table of all artifacts |

---

## Script Templates

### screenshot-slides.js (Stage 2 — NEW)

Create at `$MPT_ROOT/scripts/screenshot-slides.js`. Uses Playwright to screenshot each slide from the frontend-slides HTML output.

```javascript
// scripts/screenshot-slides.js
// Usage: node scripts/screenshot-slides.js <input.html> <output_pattern>
// Example: node scripts/screenshot-slides.js deck.html storage/ppt_images/slide_%02d.png

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const [,, inputPath, outputPattern] = process.argv;
  if (!inputPath || !outputPattern) {
    console.error('Usage: node screenshot-slides.js <input.html> <output_pattern>');
    process.exit(1);
  }

  const absInput = path.resolve(inputPath);
  const absOutputDir = path.dirname(path.resolve(outputPattern));
  fs.mkdirSync(absOutputDir, { recursive: true });
  const serveDir = path.dirname(absInput);
  const htmlFile = path.basename(absInput);

  // Start a simple HTTP server
  const server = http.createServer((req, res) => {
    const filePath = path.join(serveDir, req.url === '/' ? htmlFile : req.url);
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.woff': 'font/woff',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const url = `http://localhost:${port}/`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for animations to settle
  await page.waitForTimeout(2000);

  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides`);

  for (let i = 0; i < slides.length; i++) {
    // Scroll to slide
    await slides[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const outputFile = outputPattern.replace('%02d', String(i).padStart(2, '0'));
    await slides[i].screenshot({ path: outputFile, type: 'png' });
    console.log(`  Saved: ${outputFile}`);
  }

  await browser.close();
  server.close();
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
```

### generate_video.py (Stage 6)

Create at `$MPT_ROOT/generate_video.py`, run with `cd $MPT_ROOT && uv run python generate_video.py`. Key imports:

```python
import sys; sys.path.insert(0, "$MPT_ROOT")
from app.config import config
from app.services import voice  # MPT Edge TTS
from moviepy import (
    ImageClip, AudioFileClip, TextClip, CompositeVideoClip,
    concatenate_videoclips, CompositeAudioClip, concatenate_audioclips,
)
```

Output: `$MPT_ROOT/storage/xxx.mp4`

---

## Error Recovery

- **TTS failure** for a slide: skip that slide and continue, warn user
- **Image not found:** skip that slide, warn user
- **BGM folder empty:** skip background music, generate narration-only video
- **Playwright not available:** fall back to python-pptx path for slide generation
- **MoviePy API differences:** MoviePy 2.x uses `with_volume_scaled()`, `resized()`, `subclipped()` — NOT the 1.x `volumex()`, `resize()`, `subclip()`

## Environment Notes

- MPT root: `/Users/caogong/Documents/MoneyPrinterTurbo`
- MPT venv: `/Users/caogong/Documents/MoneyPrinterTurbo/.venv`
- Chinese font on macOS: `/System/Library/Fonts/STHeiti Medium.ttc`
- `concatenate_audioclips` for audio, `concatenate_videoclips` for video (not interchangeable)
- `frontend-slides` output dir: project directory or user-specified

## Key Anti-Patterns

1. **DON'T** pipeline through all stages without user checkpoints
2. **DON'T** generate PPT via python-pptx in Stage 2 — use `frontend-slides` skill instead (fallback only if unavailable)
3. **DON'T** write narration without showing the user first
4. **DON'T** skip showing slide image previews
5. **DON'T** reuse TTS audio without checking files exist
6. **DON'T** skip Stage 5 video format confirmation
7. **DON'T** assume a default aspect ratio
8. **DON'T** skip the `frontend-slides` style discovery phase — let the user choose the visual design
