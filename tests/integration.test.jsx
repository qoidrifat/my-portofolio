import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import { ThemeProvider } from '@/lib/ThemeContext';
import ProjectCaseStudy from '@/pages/ProjectCaseStudy';
import { projects, featuredProjectId } from '@/lib/data';
import performanceMetrics from '@/data/performance-metrics.json';

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
});

describe('featured project invariant', () => {
  it('featuredProjectId matches a featured project', () => {
    const featured = projects.find((p) => p.id === featuredProjectId);
    expect(featured).toBeTruthy();
    expect(featured.featured).toBe(true);
  });
});

describe('performance metrics', () => {
  it('performance-metrics.json has expected shape', () => {
    expect(performanceMetrics).toBeTruthy();
    expect(typeof performanceMetrics).toBe('object');
  });
});

describe('theme and navigation', () => {
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

  it('project slugs are stable for routing', () => {
    for (const p of projects) {
      if (p.isPlaceholder) continue;
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(5);
    }
  });
});
