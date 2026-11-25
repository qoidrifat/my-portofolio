// @ts-check
// NARA knowledge base — the ONLY facts the assistant is allowed to state.
//
// Derived mechanically from src/lib/data.js and src/lib/projects-data.js.
// Nothing here is invented: every field is copied from published portfolio
// content. When the portfolio data changes, this file must change with it —
// tests/nara/knowledge.test.js fails if the two drift apart.
//
// Deliberately excluded: phone number, email body internals beyond the public
// address, CV file contents (never parsed at runtime), and any metric that the
// portfolio does not itself publish.

import { profile, techCategories, journey, contactChannels } from '../data.js';
import { projects } from '../projects-data.js';

/** Public contact channels only — no private data. */
const PUBLIC_CONTACT = Object.freeze({
  email: profile.email,
  phone: profile.phone,
  location: profile.location,
  resumePath: profile.resumeUrl,
  channels: contactChannels
    .filter((c) => c && typeof c.href === 'string')
    .map((c) => ({ label: c.label || c.name, href: c.href })),
});

/** Flatten the tech taxonomy into queryable rows. */
const SKILLS = Object.freeze(
  techCategories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      name: item.name,
      category: cat.label,
      years: item.years ?? null,
      // Kept because the portfolio publishes it; never extrapolated beyond it.
      level: item.experience_level ?? null,
      projectIds: item.projectIds ?? [],
    }))
  )
);

/** Timeline entries as published. */
const EXPERIENCE = Object.freeze(
  journey.map((j) => ({
    year: j.year,
    title: j.title,
    organization: j.organization ?? null,
    category: j.category ?? null,
    description: j.description ?? null,
    technologies: j.technologies ?? [],
  }))
);

/** Project facts, trimmed to what is safe to quote. */
const PROJECTS = Object.freeze(
  projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    year: p.year ?? null,
    role: p.role ?? null,
    description: p.description ?? null,
    impact: Array.isArray(p.impact) ? p.impact : [],
    technologies: p.technologies ?? [],
    githubUrl: p.githubUrl && p.githubUrl !== '#' ? p.githubUrl : null,
    demoUrl: p.demoUrl && p.demoUrl !== '#' ? p.demoUrl : null,
    isPlaceholder: Boolean(p.isPlaceholder),
  }))
);

export const PROFILE = Object.freeze({
  name: profile.name,
  role: profile.role,
  tagline: profile.tagline,
  location: profile.location,
  status: profile.status,
});

export const KNOWLEDGE = Object.freeze({
  profile: PROFILE,
  contact: PUBLIC_CONTACT,
  skills: SKILLS,
  experience: EXPERIENCE,
  projects: PROJECTS,
});

/**
 * Render the knowledge base as compact, deterministic text for the model.
 * Facts are labelled so the model can quote without inventing.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxProjects] cap to keep the prompt inside the token budget
 * @returns {string}
 */
export function renderKnowledgeForPrompt(opts = {}) {
  const { maxProjects = PROJECTS.length } = opts;
  const lines = [];

  lines.push('## PROFILE');
  lines.push(`Name: ${PROFILE.name}`);
  lines.push(`Role: ${PROFILE.role}`);
  lines.push(`Tagline: ${PROFILE.tagline}`);
  lines.push(`Location: ${PROFILE.location}`);
  lines.push(`Status: ${PROFILE.status}`);

  lines.push('');
  lines.push('## CONTACT (public)');
  lines.push(`Email: ${PUBLIC_CONTACT.email}`);
  lines.push(`Phone: ${PUBLIC_CONTACT.phone}`);
  lines.push(`Location: ${PUBLIC_CONTACT.location}`);
  lines.push(`CV: ${PUBLIC_CONTACT.resumePath}`);

  lines.push('');
  lines.push('## SKILLS');
  for (const s of SKILLS) {
    const yrs = s.years != null ? `, ${s.years}y` : '';
    lines.push(`- ${s.name} (${s.category}${yrs})`);
  }

  lines.push('');
  lines.push('## EXPERIENCE');
  for (const e of EXPERIENCE) {
    const org = e.organization ? ` — ${e.organization}` : '';
    lines.push(`- ${e.year}: ${e.title}${org}`);
  }

  lines.push('');
  lines.push('## PROJECTS');
  for (const p of PROJECTS.slice(0, maxProjects)) {
    lines.push(`### ${p.title} (${p.slug})`);
    lines.push(`Category: ${p.category}`);
    if (p.year) lines.push(`Year: ${p.year}`);
    if (p.role) lines.push(`Role: ${p.role}`);
    if (p.description) lines.push(`Summary: ${p.description}`);
    if (p.technologies.length) lines.push(`Stack: ${p.technologies.join(', ')}`);
    if (p.impact.length) lines.push(`Impact: ${p.impact.join(' | ')}`);
    if (p.githubUrl) lines.push(`Source: ${p.githubUrl}`);
    if (p.demoUrl) lines.push(`Demo: ${p.demoUrl}`);
    if (p.isPlaceholder) lines.push('Note: upcoming project, no details published yet.');
  }

  return lines.join('\n');
}

/** Every searchable token, used by the deterministic topic gate. */
export const VOCABULARY = Object.freeze(
  [
    ...Object.values(PROFILE).filter((v) => typeof v === 'string'),
    PUBLIC_CONTACT.email,
    PUBLIC_CONTACT.location,
    ...SKILLS.map((s) => s.name),
    ...SKILLS.map((s) => s.category),
    ...EXPERIENCE.map((e) => e.title),
    ...EXPERIENCE.map((e) => e.organization).filter(Boolean),
    ...PROJECTS.map((p) => p.title),
    ...PROJECTS.map((p) => p.slug),
    ...PROJECTS.map((p) => p.category),
    ...PROJECTS.flatMap((p) => p.technologies),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
);

/**
 * Deterministic relevance scoring — FR-KB-002.
 *
 * The full dataset is ~7k chars, well over the 1000-token input cap, so the
 * server sends only the facts the question actually touches. Scoring is plain
 * token overlap: no model call, no randomness, fully unit-testable.
 *
 * @param {string} question
 * @returns {{ projects: typeof PROJECTS, skills: typeof SKILLS, experience: typeof EXPERIENCE, focused: boolean }}
 */
export function selectContext(question) {
  const q = String(question || '').toLowerCase();
  const words = q.split(/[^a-z0-9+#.]+/i).filter((w) => w.length > 2);

  /** @param {string} haystack */
  const score = (haystack) => {
    const h = haystack.toLowerCase();
    let n = 0;
    for (const w of words) if (h.includes(w)) n++;
    return n;
  };

  const scoredProjects = PROJECTS.map((p) => ({
    p,
    s: score([p.title, p.slug, p.category, p.description, p.technologies.join(' ')].filter(Boolean).join(' ')),
  }));
  const scoredSkills = SKILLS.map((k) => ({ k, s: score(`${k.name} ${k.category}`) }));
  const scoredExp = EXPERIENCE.map((e) => ({
    e,
    s: score([e.title, e.organization, e.description, e.technologies.join(' ')].filter(Boolean).join(' ')),
  }));

  const best = Math.max(
    ...scoredProjects.map((x) => x.s),
    ...scoredSkills.map((x) => x.s),
    ...scoredExp.map((x) => x.s),
    0
  );

  // No lexical overlap at all: fall back to the compact overview rather than
  // shipping the whole dataset.
  if (best === 0) {
    return { projects: [], skills: [], experience: [], focused: false };
  }

  const top = (arr, key, limit) =>
    arr
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x[key]);

  let projects = top(scoredProjects, 'p', 3);

  // Placeholder entries ("coming soon") must never be the only project facts
  // shown: a question like "what projects has Qoid built?" otherwise matches
  // the placeholder's description hardest and the model answers with nothing
  // real. If every selected project is a placeholder, widen to all non-
  // placeholder projects.
  if (projects.length && projects.every((p) => p.isPlaceholder)) {
    projects = PROJECTS.filter((p) => !p.isPlaceholder).slice(0, 3);
  }

  return {
    projects,
    skills: top(scoredSkills, 'k', 8),
    experience: top(scoredExp, 'e', 3),
    focused: true,
  };
}

/**
 * Render only what the question needs, inside the input budget.
 *
 * @param {object} [opts]
 * @param {string} [opts.question] visitor question used for context selection
 * @param {number} [opts.maxChars] hard ceiling, default 3800 (~950 tokens)
 * @returns {string}
 */
export function renderContextForPrompt(opts = {}) {
  const { question = '', maxChars = 3800 } = opts;
  const sel = selectContext(question);

  const lines = [];
  lines.push('## PROFILE');
  lines.push(`${PROFILE.name} — ${PROFILE.role}`);
  lines.push(`Location: ${PROFILE.location}`);
  lines.push(`Status: ${PROFILE.status}`);
  lines.push(`Email: ${PUBLIC_CONTACT.email}`);
  lines.push(`Phone: ${PUBLIC_CONTACT.phone}`);

  const skillPool = sel.focused && sel.skills.length ? sel.skills : SKILLS.slice(0, 12);
  lines.push('');
  lines.push('## SKILLS');
  for (const s of skillPool) {
    lines.push(`- ${s.name} (${s.category}${s.years != null ? `, ${s.years}y` : ''})`);
  }

  const expPool = sel.focused && sel.experience.length ? sel.experience : EXPERIENCE.slice(0, 5);
  lines.push('');
  lines.push('## EXPERIENCE');
  for (const e of expPool) {
    lines.push(`- ${e.year}: ${e.title}${e.organization ? ` — ${e.organization}` : ''}`);
  }

  const projPool = sel.focused && sel.projects.length ? sel.projects : [];
  if (projPool.length) {
    lines.push('');
    lines.push('## RELEVANT PROJECTS');
    for (const p of projPool) {
      lines.push(`### ${p.title}`);
      lines.push(`Category: ${p.category}${p.year ? ` | Year: ${p.year}` : ''}`);
      if (p.description) lines.push(`Summary: ${p.description}`);
      if (p.technologies.length) lines.push(`Stack: ${p.technologies.join(', ')}`);
      if (p.impact.length) lines.push(`Impact: ${p.impact.slice(0, 3).join(' | ')}`);
      if (p.githubUrl) lines.push(`Source: ${p.githubUrl}`);
    }
  } else if (!sel.focused) {
    lines.push('');
    lines.push('## PROJECTS (titles only)');
    for (const p of PROJECTS) lines.push(`- ${p.title} (${p.category})`);
  }

  let text = lines.join('\n');
  if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';
  return text;
}
