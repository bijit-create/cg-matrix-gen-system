// Golden test fixtures for the image_desc → image-prompt pipeline.
//
// These fixtures encode the rules baked into GenerationStage1's IMAGE_DESC
// section: depict the answer (not the question scene), no humans by default,
// labels only when the question requires reading them, accurate proportions,
// noun-phrase descriptions. Each fixture pairs a representative question with
// the image_desc the generator should produce.
//
// Use these as a quick eyeball check when iterating on the prompt template
// (manually paste an image_desc into buildImagePrompt and confirm the model
// output respects the spec) and as canonical examples when reviewing real
// generations.

import { buildImagePrompt } from './prompts';

export interface ImageDescFixture {
  id: string;
  question: string;
  answer: string;
  subject: string;
  needs_image: boolean;
  image_desc: string;
  /** What this fixture is testing — the rule it enforces. */
  rule: string;
  /** Anti-pattern: an image_desc that *would* pass naive checks but violates a rule. */
  anti_pattern?: string;
}

export const IMAGE_DESC_FIXTURES: ImageDescFixture[] = [
  {
    id: 'shrub-not-tree',
    question: 'Divya observes a tall woody plant with several thick branches splitting near the ground. Is this plant a herb, a shrub, or a tree?',
    answer: 'shrub',
    subject: 'science',
    needs_image: true,
    rule: 'Depict the CORRECT ANSWER (shrub), not the literal question scene (a girl looking at a tree).',
    anti_pattern: 'A girl named Divya looking at a tree.',
    image_desc:
      'A single shrub: a multi-stemmed bushy plant about chest-high, with several woody brown branches splitting near the ground, broad green leaves, and a few small flowers. No human figures. Plain white background. No labels.',
  },
  {
    id: 'creeper-flat-on-ground',
    question: 'A plant has weak stems that spread along the ground and broad leaves. What type of plant is this?',
    answer: 'creeper',
    subject: 'science',
    needs_image: true,
    rule: 'Proportions / posture must reflect the correct answer — a creeper is laid out flat, not upright.',
    image_desc:
      'A single creeper plant: thin weak green stem trailing horizontally along brown soil, broad heart-shaped leaves spaced along the stem, two small purple flowers. Plant lies flat along the ground (no upright support). Plain white background. No labels.',
  },
  {
    id: 'herb-shrub-tree-comparison',
    question: 'Compare a herb, a shrub and a tree. Which has a single thick trunk?',
    answer: 'tree',
    subject: 'science',
    needs_image: true,
    rule: 'Comparison plate IS warranted because the question asks the student to compare three subjects — show all three at consistent scale, with labels because the question names the categories the student must recognise.',
    image_desc:
      'Three plants side-by-side on a plain white background, drawn at consistent relative scale: (1) a small herb with a tender green stem about knee-high; (2) a chest-high shrub with multiple woody brown branches splitting near the ground; (3) a tall tree with one thick brown trunk and a leafy crown high above. Labels under each plant in clean sans-serif caps: "HERB", "SHRUB", "TREE".',
  },
  {
    id: 'leaf-no-labels',
    question: 'Look at the picture of the leaf. What type of leaf is this — simple or compound?',
    answer: 'compound',
    subject: 'science',
    needs_image: true,
    rule: 'Labels are CONDITIONAL — omit labels because the question asks the student to classify; labels would give away the answer.',
    anti_pattern: 'A compound leaf with parts labelled "leaflet", "rachis", "stalk".',
    image_desc:
      'A single compound leaf: one main stalk with seven small oval leaflets arranged in pairs along its length and one terminal leaflet at the tip. Bright green leaflets, brown central stalk. No labels of any kind. Plain white background.',
  },
  {
    id: 'angle-with-labels',
    question: 'In the figure, what is the value of angle B?',
    answer: '60°',
    subject: 'math',
    needs_image: true,
    rule: 'Labels ARE required because the question explicitly references "angle B" — the student must read the labels to answer.',
    image_desc:
      'A clean triangle ABC drawn with crisp black lines on a plain white background. Vertex labels "A" (top), "B" (bottom-left), "C" (bottom-right) in sans-serif. Interior angles marked with small arcs. Angle at A labelled "70°" and angle at C labelled "50°". Angle B is left UNlabelled (it is the unknown the student must compute). No fill colours. No extra decoration.',
  },
  {
    id: 'no-people',
    question: 'Which fruit grows on a creeper-type plant?',
    answer: 'watermelon',
    subject: 'science',
    needs_image: true,
    rule: 'No humans — question is about a fruit, not a person.',
    anti_pattern: 'A child holding a watermelon in a garden.',
    image_desc:
      'A single watermelon fruit on a creeper vine: oval green watermelon with darker green stripes resting on brown soil, attached to a thin trailing green stem with broad lobed leaves spreading along the ground. No human figures. Plain white background. No labels.',
  },
  {
    id: 'shopkeeper-allowed',
    question: 'A shopkeeper sells 3 kg of rice to one customer and 5 kg to another. How much rice did he sell in total?',
    answer: '8 kg',
    subject: 'math',
    needs_image: false,
    rule: 'Word problem — pure arithmetic; needs_image=false. The shopkeeper context is verbal, not visual; an illustration adds no information.',
    image_desc: '',
  },
  {
    id: 'graph-axes-required',
    question: 'The graph shows the distance Rohan travels over time. Between which two points is Rohan stationary?',
    answer: 'P and Q',
    subject: 'math',
    needs_image: true,
    rule: 'Coordinate / graph questions need precise axes — image_desc points the pipeline at RENDER_LINE_GRAPH (handled by the classifier in imageGen.ts), so the description here is purely informational.',
    image_desc:
      'A distance-time line graph: horizontal axis labelled "Time (min)" from 0 to 60, vertical axis labelled "Distance (km)" from 0 to 10. Plot four points joined by line segments — Home (0,0), P (10,2), Q (30,2), Park (60,10). Mark each point with a small filled circle and its label.',
  },
  {
    id: 'grade-appropriate-cartoon',
    question: 'Which body part helps us hear?',
    answer: 'ear',
    subject: 'science',
    needs_image: true,
    rule: 'Single concrete subject (ear). No labels because the question asks the student to identify the part by name — labelling would give the answer away.',
    image_desc:
      'A single human ear shown from the side: clear cartoon vector style outline of the outer ear with the helix curve, lobe, and ear canal opening visible. Skin tone fill. No anatomy labels. No surrounding face — just the ear floating against a plain white background.',
  },
];

/**
 * For each fixture with needs_image=true and a non-empty image_desc, returns
 * the full prompt string that would be sent to the image generator (after
 * buildImagePrompt wraps it with the NCERT template). Useful for inspecting
 * how the description composes with the surrounding template during prompt
 * iteration.
 */
export function renderFixturePrompts(): { id: string; prompt: string }[] {
  return IMAGE_DESC_FIXTURES
    .filter(f => f.needs_image && f.image_desc.trim().length > 0)
    .map(f => ({
      id: f.id,
      prompt: buildImagePrompt(f.image_desc, f.subject, ''),
    }));
}

/**
 * Sanity checks the fixtures against the prompt rules that are checkable
 * statically (without running the image generator). This is a lightweight
 * regression net — extend as the rules sharpen.
 */
export function checkFixtures(): { id: string; ok: boolean; failures: string[] }[] {
  return IMAGE_DESC_FIXTURES.map(f => {
    const failures: string[] = [];
    if (!f.needs_image) {
      if (f.image_desc.trim().length > 0) failures.push('image_desc must be empty when needs_image=false');
      return { id: f.id, ok: failures.length === 0, failures };
    }
    const desc = f.image_desc;
    const lower = desc.toLowerCase();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;

    if (wordCount < 20) failures.push(`image_desc too short (${wordCount} words; need ≥20)`);
    if (wordCount > 120) failures.push(`image_desc too long (${wordCount} words; cap ~80–120)`);

    // Should not be a directive ("draw...", "create an image of...")
    if (/^(draw|create|generate|make|render)\s/i.test(desc.trim())) {
      failures.push('image_desc starts with a directive verb — should be a noun phrase');
    }

    // Plain white background should be stated.
    if (!lower.includes('white background')) failures.push('image_desc should specify "plain white background"');

    // Default-no-humans rule: only the shopkeeper-allowed-style fixtures may include people, and
    // those should explicitly justify it.
    const mentionsPerson = /\b(boy|girl|child|man|woman|person|teacher|shopkeeper|student|kid)\b/i.test(desc);
    const explicitlyAllows = /\bone\s+neutral\s+cartoon\s+figure\b/i.test(desc) || /\bperson performing\b/i.test(desc);
    if (mentionsPerson && !explicitlyAllows) {
      failures.push('image_desc mentions a person but the question is not explicitly about a person');
    }

    return { id: f.id, ok: failures.length === 0, failures };
  });
}
