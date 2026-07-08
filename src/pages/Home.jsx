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

// Stable placeholder shown while waiting for code or viewport proximity
function SectionFallback() {
  return <div className="h-64 md:h-96" aria-hidden="true" />;
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />

      <LazySection id="about" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <AboutSection />
        </Suspense>
      </LazySection>

      <LazySection id="journey" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <CareerTimelineSection />
        </Suspense>
      </LazySection>

      <LazySection id="skills" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <TechStackSection />
        </Suspense>
      </LazySection>

      <LazySection id="projects" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <ProjectSection />
        </Suspense>
      </LazySection>

      <LazySection id="gallery" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <GallerySection />
        </Suspense>
      </LazySection>

      <LazySection id="contact" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <ContactSection />
        </Suspense>
      </LazySection>

      <LazySection id="github" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <GitHubSection />
        </Suspense>
      </LazySection>

      <LazySection id="perf" threshold={500} placeholder={<SectionFallback />}>
        <Suspense fallback={<SectionFallback />}>
          <PerformanceSection />
        </Suspense>
      </LazySection>
    </div>
  );
}