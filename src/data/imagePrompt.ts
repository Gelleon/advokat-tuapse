export const IMAGE_PROMPT_SETTING_KEY = 'ai_blog_image_prompt_template';

export const DEFAULT_IMAGE_PROMPT = `Create a vc.ru-style article cover image (Russian media cover mockup format).

COMPOSITION (mandatory, like a product screenshot cover):
- Full-bleed flat solid dark charcoal background (#1c1c1e / near-black gray)
- In the CENTER: one floating rounded rectangle panel (large soft drop shadow, ~16–24px corner radius)
- Generous empty margin of background on ALL sides (at least 10–14% of the canvas) so the panel never touches the edges
- The panel contains a photoreal scene matching the article topic
- Square 1:1 canvas, clean editorial look, no clutter outside the panel

PANEL CONTENT (mandatory scene):
{sceneBrief}

Context only — DO NOT render as text in the image:
- Practice: {practiceArea}
- Gist: {articleExcerpt}

STYLE:
- Soft natural light inside the panel scene
- Muted professional tones; calm, trustworthy mood
- High-end photoreal / editorial illustration
- Prefer industry props from the scene over abstract law symbols

HARD NEGATIVES:
- No letters, words, numbers, captions, watermarks, logos, URLs, UI labels, Cyrillic or Latin characters anywhere
- No browser address bar text, no fake website screenshots with readable UI copy
- Papers/plans/screens inside the scene must be blank or fully blurred
- Forbidden as main subject: law books, library shelves, scales of justice, gavel
- No blood, violence, handcuffs, mugshots
- Do not fill the whole canvas edge-to-edge with the scene — keep the floating-panel-on-solid-background format

Again: textless vc.ru cover mockup — dark flat background + centered shadowed rounded panel with the scene inside.`;
