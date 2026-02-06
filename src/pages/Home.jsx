import React from 'react';
import HeroSection from '@/components/portfolio/HeroSection';
import AboutSection from '@/components/portfolio/AboutSection';
import TechStackSection from '@/components/portfolio/TechStackSection';
import ProjectsSection from '@/components/portfolio/ProjectsSection';
import GallerySection from '@/components/portfolio/GallerySection';
import ContactSection from '@/components/portfolio/ContactSection';

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <AboutSection />
      <TechStackSection />
      <ProjectsSection />
      <GallerySection />
      <ContactSection />
    </div>
  );
}