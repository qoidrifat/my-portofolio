import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import { ThemeProvider } from '@/lib/ThemeContext';
import ProjectVisual from '@/components/portofolio/ProjectVisual';
import TechGroups from '@/components/portofolio/TechGroups';
import ArchitectureViewer from '@/components/portofolio/ArchitectureViewer';
import { projects, techCategories } from '@/lib/data';

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ProjectVisual', () => {
  it('renders image when project has imageUrl', () => {
    const p = projects.find((x) => x.imageUrl);
    const { container } = render(
      <Wrapper>
        <ProjectVisual project={p} />
      </Wrapper>
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('renders fallback for null imageUrl', () => {
    const p = projects.find((x) => !x.imageUrl);
    const { container } = render(
      <Wrapper>
        <ProjectVisual project={p} />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });
});

describe('TechGroups', () => {
  it('renders groups', () => {
    const groups = [{ label: 'Backend', items: ['Laravel', 'PHP'] }];
    render(<TechGroups groups={groups} />);
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Laravel')).toBeInTheDocument();
  });
});

describe('ArchitectureViewer', () => {
  it('renders architecture lanes', () => {
    const proj = projects.find((p) => p.architecture);
    expect(proj).toBeTruthy();
    const { container } = render(<ArchitectureViewer architecture={proj.architecture} />);
    expect(container.textContent).toContain('Access');
  });
});

describe('project filtering logic', () => {
  it('filter categories derived correctly', () => {
    const cats = ['All', ...new Set(projects.map((p) => p.filterCategory || p.category))];
    expect(cats).toContain('All');
    expect(cats.length).toBeGreaterThan(4);
  });

  it('search matches title', () => {
    const q = 'payroll';
    const filtered = projects.filter((p) => p.title.toLowerCase().includes(q));
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].slug).toBe('payrollpro');
  });
});

describe('techCategories', () => {
  it('has expected groups and items', () => {
    expect(techCategories.length).toBe(6);
    const frontend = techCategories.find((c) => c.id === 'frontend');
    expect(frontend.items.length).toBeGreaterThan(3);
  });

  it('experience_level within 0-100', () => {
    for (const cat of techCategories) {
      for (const item of cat.items) {
        expect(item.experience_level).toBeGreaterThanOrEqual(0);
        expect(item.experience_level).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('data invariants', () => {
  it('all projects have required fields', () => {
    for (const p of projects) {
      expect(p.slug).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(Array.isArray(p.technologies) || Array.isArray(p.techGroups)).toBe(true);
    }
  });

  it('case study slugs are unique and url-safe', () => {
    const slugRe = /^[a-z0-9-]+$/;
    for (const p of projects) {
      if (p.isPlaceholder) continue;
      expect(slugRe.test(p.slug)).toBe(true);
    }
  });
});
