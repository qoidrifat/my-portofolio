import React, { Suspense, lazy } from 'react';
import HeroSection from '@/components/portofolio/HeroSection';
import LazySection from '@/components/LazySection';

// Lazy-load below-the-fold sections — code is fetched on demand
const AboutSection = lazy(() => import('@/components/portofolio/AboutSection'));
const CareerTimelineSection = lazy(() => import('@/components/portofolio/CareerTimelineSection'));
const TechStackSection = lazy(() => import('@/components/portofolio/TechStackSection'));
const ProjectSection = lazy(() => import('@/components/portofolio/ProjectSection'));
const GallerySection = lazy(() => import('@/components/portofolio/GallerySection'));
const ContactSection = lazy(() => import('@/components/portofolio/ContactSection'));
const GitHubSection = lazy(() => import('@/components/portofolio/GitHubSection'));
const PerformanceSection = lazy(() => import('@/components/portofolio/PerformanceSection'));

// Stable placeholder shown while waiting for code or viewport proximity.
// minHeight approximates the mounted section's real height so that anchor
// offsets (navbar "Contact" etc.) and scroll-spy stay accurate before mount,
// and the page doesn't shift when a section mounts mid-scroll.
function SectionFallback({ minHeight = '100vh' }) {
  return <div style={{ minHeight }} aria-hidden="true" />;
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />

      <LazySection id="about" threshold={500} placeholder={<SectionFallback minHeight="120vh" />}>
        <Suspense fallback={<SectionFallback minHeight="120vh" />}>
          <AboutSection />
        </Suspense>
      </LazySection>

      <LazySection id="journey" threshold={500} placeholder={<SectionFallback minHeight="150vh" />}>
        <Suspense fallback={<SectionFallback minHeight="150vh" />}>
          <CareerTimelineSection />
        </Suspense>
      </LazySection>

      <LazySection id="projects" threshold={500} placeholder={<SectionFallback minHeight="200vh" />}>
        <Suspense fallback={<SectionFallback minHeight="200vh" />}>
          <ProjectSection />
        </Suspense>
      </LazySection>

      <LazySection id="skills" threshold={500} placeholder={<SectionFallback minHeight="100vh" />}>
        <Suspense fallback={<SectionFallback minHeight="100vh" />}>
          <TechStackSection />
        </Suspense>
      </LazySection>

      <LazySection id="gallery" threshold={500} placeholder={<SectionFallback minHeight="120vh" />}>
        <Suspense fallback={<SectionFallback minHeight="120vh" />}>
          <GallerySection />
        </Suspense>
      </LazySection>

      <LazySection id="github" threshold={500} placeholder={<SectionFallback minHeight="120vh" />}>
        <Suspense fallback={<SectionFallback minHeight="120vh" />}>
          <GitHubSection />
        </Suspense>
      </LazySection>

      <LazySection id="contact" threshold={500} placeholder={<SectionFallback minHeight="100vh" />}>
        <Suspense fallback={<SectionFallback minHeight="100vh" />}>
          <ContactSection />
        </Suspense>
      </LazySection>
    </div>
  );
}