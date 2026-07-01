## SUMMER20 Hero Image — UNT Theme (Football Edition)

Generate a themed promo image for the seeded SUMMER20 hero slide using build credits (agent-side image tool, no AI Gateway credit spend), then wire it into the existing draft slide.

### Visual direction
- **Palette**: UNT Mean Green `#00853E` primary, white type, deep black background, subtle silver highlights.
- **Subject**: A restored sneaker as the hero, staged on a reflective black surface with green rim light — sitting alongside a football and a generic eagle-style mascot silhouette (Scrappy-esque but not Scrappy — no UNT marks). Stadium field lights bokeh in the far background for depth.
- **Typography**: "SUMMER20 — 20% OFF" bold white with a thin mean-green underline; small "Clean My Kicks" wordmark bottom-left. No "UNT" letters or interlocking marks.
- **Composition**: 1920×1080 (16:9) full-bleed for the rotating hero. Sneaker right-of-center, football + mascot silhouette mid-left, copy top-left, negative space top-right for CTA.
- **Mood**: Collegiate game-day energy meets the shop's cinematic drop aesthetic — swaps the usual red/orange glow for mean green.

### Steps
1. Generate image at 1920×1080 with `imagegen--generate_image` (premium tier), save to `src/assets/hero-summer20-unt.jpg`.
2. Upload via `lovable-assets` CDN for a stable URL.
3. Migration: `UPDATE hero_slides SET image_url = '<cdn-url>' WHERE code = 'SUMMER20'` — keeps `status = 'draft'` for your approval.
4. Confirm render in `/admin/hero-slides`, publish when ready.

### Guardrails
- No UNT logos, wordmarks, "UNT" letters, or Scrappy the Eagle likeness — palette + generic football/eagle imagery only, trademark-safe.
- Default restoration slide stays pinned first; SUMMER20 rotates in behind it.
- Zero AI Gateway credit spend.

### Files touched
- `src/assets/hero-summer20-unt.jpg` + `.asset.json`
- One SQL migration updating the SUMMER20 row's `image_url`
- No component changes — `Hero.tsx` already reads `image_url`.
