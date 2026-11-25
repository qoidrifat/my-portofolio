// @ts-check
// Guards the NARA knowledge base against drift from the portfolio source of truth.
// NARA must never state a fact the published portfolio does not contain, so the
// derived dataset is asserted field-by-field against data.js / projects-data.js.
import { describe, it, expect } from 'vitest';
import { KNOWLEDGE, PROFILE, VOCABULARY, renderContextForPrompt, selectContext } from '@/lib/nara/knowledge';
import { techCategories, journey, profile } from '@/lib/data';
import { projects } from '@/lib/projects-data';

describe('NARA knowledge base ↔ portfolio source', () => {
  it('mirrors profile fields exactly', () => {
    expect(PROFILE.name).toBe(profile.name);
    expect(PROFILE.role).toBe(profile.role);
    expect(PROFILE.tagline).toBe(profile.tagline);
    expect(PROFILE.location).toBe(profile.location);
    expect(PROFILE.status).toBe(profile.status);
  });

  it('mirrors every project', () => {
    expect(KNOWLEDGE.projects).toHaveLength(projects.length);
    for (const p of projects) {
      const k = KNOWLEDGE.projects.find((x) => x.slug === p.slug);
      expect(k, p.slug).toBeTruthy();
      expect(k.title).toBe(p.title);
      expect(k.category).toBe(p.category);
    }
  });

  it('mirrors every skill row', () => {
    const flat = techCategories.flatMap((c) => c.items || []);
    expect(KNOWLEDGE.skills).toHaveLength(flat.length);
    for (const item of flat) {
      const k = KNOWLEDGE.skills.find((x) => x.name === item.name);
      expect(k, item.name).toBeTruthy();
      expect(k.years).toBe(item.years ?? null);
    }
  });

  it('mirrors every journey entry', () => {
    expect(KNOWLEDGE.experience).toHaveLength(journey.length);
    journey.forEach((j, i) => {
      expect(KNOWLEDGE.experience[i].year).toBe(j.year);
      expect(KNOWLEDGE.experience[i].title).toBe(j.title);
    });
  });

  it('never publishes a credential', () => {
    const serialized = JSON.stringify(KNOWLEDGE);
    // Phone and email are published portfolio contact data and allowed.
    // "token" appears legitimately in one project description ("token
    // analytics"), so only credential-shaped strings are rejected.
    expect(serialized).not.toMatch(/api[_-]?key|secret|passwd|password\s*[:=]|bearer\s/i);
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/);
  });

  it('selects only relevant projects for a targeted question', () => {
    const sel = selectContext('Tell me about the PayrollPro payroll system');
    expect(sel.focused).toBe(true);
    expect(sel.projects.length).toBeGreaterThan(0);
    expect(sel.projects[0].slug).toBe('payrollpro');
    expect(sel.projects.length).toBeLessThanOrEqual(3);
  });

  it('falls back to an overview when nothing matches', () => {
    const sel = selectContext('zzz qqq xxx');
    expect(sel.focused).toBe(false);
    expect(sel.projects).toHaveLength(0);
  });

  it('keeps every rendered prompt inside the 1000-token input budget', () => {
    const questions = [
      'Tell me about the PayrollPro payroll system',
      'What technologies does Qoid use?',
      'How can I contact Qoid?',
      'Tell me about his experience',
      'zzz qqq xxx',
      '',
    ];
    for (const question of questions) {
      const text = renderContextForPrompt({ question });
      expect(text.length, question).toBeGreaterThan(200);
      // 3800 chars ≈ 950 tokens, leaving room for the system prompt.
      expect(text.length, question).toBeLessThanOrEqual(3800);
    }
  });

  it('vocabulary indexes every project slug for the topic gate', () => {
    for (const p of projects) {
      expect(VOCABULARY).toContain(p.slug.toLowerCase());
    }
  });
});
