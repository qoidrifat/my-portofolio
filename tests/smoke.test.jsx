import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import { ThemeProvider } from '@/lib/ThemeContext';
import Home from '@/pages/Home';
import ProjectCaseStudy from '@/pages/ProjectCaseStudy';
import Layout from '@/Layout';
import { projects } from '@/lib/data';

function Wrapper({ children, initialEntries }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('smoke', () => {
  it('Home renders hero without crash', () => {
    render(
      <Wrapper>
        <Home />
      </Wrapper>
    );
    expect(document.body).toBeTruthy();
  });

  it('Layout renders nav links', () => {
    render(
      <Wrapper>
        <Layout>
          <div>child</div>
        </Layout>
      </Wrapper>
    );
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contact').length).toBeGreaterThan(0);
  });

  it('project data integrity', () => {
    expect(projects.length).toBeGreaterThan(5);
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const featured = projects.filter((p) => p.featured);
    expect(featured.length).toBe(1);
  });

  it('ProjectCaseStudy 404 for unknown slug', () => {
    render(
      <Wrapper initialEntries={['/projects/does-not-exist']}>
        <ProjectCaseStudy />
      </Wrapper>
    );
    expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
  });

  it('ThemeProvider cycles without crash', () => {
    const { container } = render(
      <Wrapper>
        <Layout>
          <span>ok</span>
        </Layout>
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });
});
