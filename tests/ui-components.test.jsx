import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import { ThemeProvider } from '@/lib/ThemeContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import HeroSection from '@/components/portofolio/HeroSection';
import ContactSection from '@/components/portofolio/ContactSection';
import Layout from '@/Layout';
import RepoCard from '@/components/portofolio/github/RepoCard';
import TechStackSection from '@/components/portofolio/TechStackSection';

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider>
        <LanguageProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('UI Component Test Suite', () => {
  describe('HeroSection', () => {
    it('renders profile headline and role', () => {
      render(
        <Wrapper>
          <HeroSection />
        </Wrapper>
      );
      expect(screen.getByText("Qoid Rif'at")).toBeInTheDocument();
      expect(screen.getByText(/Full-Stack Developer/)).toBeInTheDocument();
    });

    it('renders aligned 4+ Years Coding stat', () => {
      render(
        <Wrapper>
          <HeroSection />
        </Wrapper>
      );
      expect(screen.getByText(/4\+/)).toBeInTheDocument();
      expect(screen.getByText(/Engineering Experience|Years Coding/)).toBeInTheDocument();
    });

    it('renders View Work and Download CV CTA controls', () => {
      render(
        <Wrapper>
          <HeroSection />
        </Wrapper>
      );
      expect(screen.getByRole('button', { name: /explore my work|view work/i })).toBeInTheDocument();
      const cvLink = screen.getByRole('link', { name: /download cv/i });
      expect(cvLink).toBeInTheDocument();
      expect(cvLink).toHaveAttribute('href', '/Qoid-Rifat-CV.pdf');
    });
  });

  describe('ContactSection', () => {
    it('renders contact heading and form controls', () => {
      render(
        <Wrapper>
          <ContactSection />
        </Wrapper>
      );
      expect(screen.getByText('Get In')).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeRequired();
      expect(screen.getByLabelText(/email address/i)).toBeRequired();
      expect(screen.getByLabelText(/your message/i)).toBeRequired();
    });

    it('renders submit button with submit type', () => {
      render(
        <Wrapper>
          <ContactSection />
        </Wrapper>
      );
      const submitBtn = screen.getByRole('button', { name: /transmit message/i });
      expect(submitBtn).toHaveAttribute('type', 'submit');
    });
  });

  describe('Layout Navigation & Ergonomics', () => {
    it('renders mobile menu trigger with accessible label and minimum size', () => {
      render(
        <Wrapper>
          <Layout>
            <div>Content</div>
          </Layout>
        </Wrapper>
      );
      const menuBtn = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuBtn).toBeInTheDocument();
      expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles mobile menu drawer on click', () => {
      render(
        <Wrapper>
          <Layout>
            <div>Content</div>
          </Layout>
        </Wrapper>
      );
      const menuBtn = screen.getByRole('button', { name: /toggle menu/i });
      fireEvent.click(menuBtn);
      expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    });

    it('renders desktop navigation links', () => {
      render(
        <Wrapper>
          <Layout>
            <div>Content</div>
          </Layout>
        </Wrapper>
      );
      expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Skills').length).toBeGreaterThan(0);
    });

    it('renders theme switcher controls with accessible labels', () => {
      render(
        <Wrapper>
          <Layout>
            <div>Content</div>
          </Layout>
        </Wrapper>
      );
      const themeBtn = screen.getByRole('button', { name: /current theme:/i });
      expect(themeBtn).toBeInTheDocument();
    });
  });

  describe('RepoCard', () => {
    const dummyRepo = {
      id: 101,
      name: 'smart-portfolio',
      description: 'AI & Web portfolio showcase',
      language: 'TypeScript',
      stars: 12,
      forks: 3,
      htmlUrl: 'https://github.com/qoidrifat/smart-portfolio',
      updatedAt: '2026-11-01T00:00:00Z',
      topics: ['react', 'vite', 'tailwind'],
    };

    it('renders repo details and secure external link', () => {
      render(
        <Wrapper>
          <RepoCard repo={dummyRepo} index={0} isInView={true} shouldReduceMotion={true} />
        </Wrapper>
      );
      expect(screen.getByText('smart-portfolio')).toBeInTheDocument();
      expect(screen.getByText('AI & Web portfolio showcase')).toBeInTheDocument();
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', dummyRepo.htmlUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('TechStackSection', () => {
    it('renders filter tabs and evidence-based labels', () => {
      render(
        <Wrapper>
          <TechStackSection />
        </Wrapper>
      );
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^frontend$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^backend$/i })).toBeInTheDocument();
    });

    it('renders tech cards without arbitrary percentage progress bars', () => {
      render(
        <Wrapper>
          <TechStackSection />
        </Wrapper>
      );
      expect(screen.getAllByText('JavaScript').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tailwind').length).toBeGreaterThan(0);
    });
});
});
