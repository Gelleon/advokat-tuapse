export const IMAGE_PROMPT_SETTING_KEY = 'ai_blog_image_prompt_template';

export const DEFAULT_IMAGE_PROMPT = `TEXTLESS photoreal editorial cover. No letters, words, numbers, captions, watermarks, logos, stamps, UI, Cyrillic or Latin characters anywhere. Papers and screens must be blank or fully blurred.

MANDATORY SCENE (depict exactly this, nothing else):
{sceneBrief}

Context only (do not render as text in the image):
- Practice area: {practiceArea}
- Article gist: {articleExcerpt}

Rules:
- One quiet real-world scene with concrete objects from the mandatory scene
- Square 1:1, soft natural light, muted slate and warm ivory, shallow depth of field
- Calm professional mood for a Russian private law firm blog
- Prefer industry/location props from the scene over abstract “law” symbols
- Forbidden as main subject: law books, library shelves, scales of justice, gavel, courthouse collage, blood, violence, handcuffs, mugshots
- No readable writing of any kind

Again: textless image, blank documents only, follow the mandatory scene.`;
