export const IMAGE_PROMPT_SETTING_KEY = 'ai_blog_image_prompt_template';

export const DEFAULT_IMAGE_PROMPT = `Create a vc.ru-style HORIZONTAL article cover (landscape 16:9).

COMPOSITION (mandatory):
- Landscape canvas 16:9 — wide rectangle, NOT square
- The photoreal scene FILLS the entire frame edge-to-edge
- No side bars, no pillarboxing, no letterboxing, no empty vertical strips left/right
- No floating small square card in the middle
- Optional subtle vignette only — never solid empty side panels
- Clean editorial cover like vc.ru news images

SCENE (fill the full frame):
{sceneBrief}

Context only — DO NOT render as text in the image:
- Practice: {practiceArea}
- Gist: {articleExcerpt}

STYLE:
- Soft natural light, muted professional tones
- Calm, trustworthy mood for a Russian private law firm blog
- High-end photoreal / editorial illustration
- Prefer industry props from the scene over abstract law symbols

HARD NEGATIVES:
- No letters, words, numbers, captions, watermarks, logos, URLs, UI labels, Cyrillic or Latin characters
- No browser chrome, no fake website screenshots with readable UI
- Papers/plans/screens must be blank or fully blurred
- Forbidden as main subject: law books, library shelves, scales of justice, gavel
- No blood, violence, handcuffs, mugshots
- No black/gray empty side margins; no centered square inset; image must be a full-bleed horizontal rectangle

Again: full-bleed landscape 16:9 cover, textless, scene fills the whole image.`;
