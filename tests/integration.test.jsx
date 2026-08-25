import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import { ThemeProvider, THEMES, useTheme } from '@/lib/ThemeContext';
import ProjectCaseStudy from '@/pages/ProjectCaseStudy';
import ProjectVisual from '@/components/portofolio/ProjectVisual';
import { projects, featuredProjectId } from '@/lib/data';
import performanceMetrics from '@/data/performance-metrics.json';
import { renderHook } from '@testing-library/react';

function Wrapper({ children, initialEntries = ['/'] }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/projects/:slug" element={<ProjectCaseStudy />} />
            <Route path="*" element={children} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('case study routing', () => {
  it('renders PayrollPro case study by slug', () => {
    render(<Wrapper initialEntries={['/projects/payrollpro']}><div>home</div></Wrapper>);
    expect(screen.getByText(/PayrollPro — HR, Attendance/i)).toBeInTheDocument();
  });

  it('renders FER featured case study', () => {
    render(<Wrapper initialEntries={['/projects/facial-expression-recognition']}><div>home</div></Wrapper>);
    expect(screen.getByText(/Facial Expression Recognition/i)).toBeInTheDocument();
  });

  it('shows 404 for unknown slug with back link', () => {
    render(<Wrapper initialEntries={['/projects/unknown-xyz']}><div>home</div></Wrapper>);
    expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Portfolio/i)).toBeInTheDocument();
  });

  it('404 back link uses SPA navigation (not full reload)', () => {
    render(<Wrapper initialEntries={['/projects/unknown-xyz']}><div>home</div></Wrapper>);
    const backLink = screen.getByText(/Back to Portfolio/i).closest('a');
    expect(backLink).toBeTruthy();
    // Internal SPA route — should not have an external target or full reload
    expect(backLink.getAttribute('target')).not.toBe('_blank');
    const rel = backLink.getAttribute('rel');
    if (rel) expect(rel).not.toMatch(/noopener/);
  });
});

describe('featured project invariant', () => {
  it('featuredProjectId matches a featured project', () => {
    const featured = projects.find((p) => p.id === featuredProjectId);
    expect(featured).toBeTruthy();
    expect(featured.featured).toBe(true);
  });

  it('exactly one project is marked featured', () => {
    const featured = projects.filter((p) => p.featured);
    expect(featured.length).toBe(1);
  });
});

describe('performance metrics', () => {
  it('performance-metrics.json has expected shape', () => {
    expect(performanceMetrics).toBeTruthy();
    expect(typeof performanceMetrics).toBe('object');
  });

  it('performance-metrics bundles are sorted by size descending', () => {
    const sizes = performanceMetrics.bundles.map((b) => b.size);
    const sorted = [...sizes].sort((a, b) => b - a);
    expect(sizes).toEqual(sorted);
  });

  it('summary sizes match summed bundle sizes', () => {
    const jsBundles = performanceMetrics.bundles.filter((b) => b.type === 'js');
    const cssBundles = performanceMetrics.bundles.filter((b) => b.type === 'css');
    const jsTotal = jsBundles.reduce((s, b) => s + b.size, 0);
    const cssTotal = cssBundles.reduce((s, b) => s + b.size, 0);
    expect(performanceMetrics.summary.totalJsSize).toBe(jsTotal);
    expect(performanceMetrics.summary.totalCssSize).toBe(cssTotal);
  });

  it('bundle names no longer contain Vite content hashes (governance fix)', () => {
    // Phase 4B: hashes stripped to prevent commit noise. Names should be stable.
    for (const b of performanceMetrics.bundles) {
      expect(b.name).not.toMatch(/-[A-Za-z0-9_-]{8}\./);
    }
  });
});

describe('theme and navigation', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch {}
    document.documentElement.removeAttribute('data-accent');
  });

  it('ThemeProvider renders without crash and sets data-accent', () => {
    render(
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
          <div>theme child</div>
        </ThemeProvider>
      </QueryClientProvider>
    );
    expect(document.documentElement.getAttribute('data-accent')).toBeTruthy();
  });

  it('setTheme updates data-accent on <html> synchronously', () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setTheme('purple');
    });
    expect(document.documentElement.getAttribute('data-accent')).toBe('purple');
  });

  it('cycleTheme advances to the next theme in the list', () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    const start = result.current.theme;
    act(() => {
      result.current.cycleTheme();
    });
    const startIdx = THEMES.findIndex((t) => t.id === start);
    const expectedNext = THEMES[(startIdx + 1) % THEMES.length].id;
    expect(result.current.theme).toBe(expectedNext);
  });

  it('setTheme ignores unknown theme ids (no crash, no change)', () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    const before = result.current.theme;
    act(() => {
      result.current.setTheme('not-a-real-theme');
    });
    expect(result.current.theme).toBe(before);
  });

  it('project slugs are stable for routing', () => {
    for (const p of projects) {
      if (p.isPlaceholder) continue;
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(5);
    }
  });
});

describe('ProjectVisual placeholder fallback', () => {
  it('renders generated thumbnail for placeholder projects (no imageUrl)', () => {
    const placeholder = projects.find((p) => p.isPlaceholder);
    if (!placeholder) return; // none defined — invariant is vacuous
    const { container } = render(
      <QueryClientProvider client={queryClientInstance}>
        <ProjectVisual project={placeholder} />
      </QueryClientProvider>
    );
    // GeneratedThumbnail renders an icon from lucide-react, not an <img>
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders an <img> when project has an imageUrl', () => {
    const withImage = projects.find((p) => p.imageUrl && !p.isPlaceholder);
    expect(withImage).toBeTruthy();
    const { container } = render(
      <QueryClientProvider client={queryClientInstance}>
        <ProjectVisual project={withImage} />
      </QueryClientProvider>
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(withImage.imageUrl);
  });
});
