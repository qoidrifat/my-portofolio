import React from 'react';
import HeroSection from '@/components/portofolio/HeroSection';
import AboutSection from '@/components/portofolio/AboutSection';
import TechStackSection from '@/components/portofolio/TechStackSection';
import ProjectSection from '@/components/portofolio/ProjectSection';
import GallerySection from '@/components/portofolio/GallerySection';
import ContactSection from '@/components/portofolio/ContactSection';

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <AboutSection />
      <TechStackSection />
      <ProjectSection />
      <GallerySection />
      <ContactSection />
    </div>
  );
}