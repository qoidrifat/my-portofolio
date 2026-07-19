import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import { profile } from '@/lib/data';

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const scrollToProjects = () => {
    const element = document.getElementById('projects');
    if (element) {
      const offset = element.offsetTop - 80;
      window.scrollTo({ top: offset, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  };

  const stats = [
    { value: '5+', label: 'Projects Done' },
    { value: '<1', label: 'Year Experience' },
    { value: '99%', label: 'Commitment' },
  ];

  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-20" aria-label="Hero">
      {/* Background — subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[hsl(var(--accent-web))]/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-[hsl(var(--accent-ai))]/8 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 w-full text-center flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs sm:text-sm font-medium mb-8 md:mb-10"
        >
          <span className="relative flex h-2 w-2">
            {!shouldReduceMotion && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          {profile.status}
        </motion.div>

        {/* Main Heading — clean, centered */}
        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl md:text-7xl font-black leading-[1.1] mb-4 md:mb-6 tracking-tight"
        >
          <span className="text-white">Hi, I'm</span>
          <br />
          {/* #hero-name — FLIP anchor for the intro's shared-element exit */}
          <span id="hero-name" className="text-gradient">{profile.name}</span>
        </motion.h1>

        {/* Role subtitle */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="text-lg sm:text-2xl text-zinc-400 font-medium mb-3 md:mb-4"
        >
          {profile.role}
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="text-sm sm:text-base md:text-lg text-zinc-500 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed"
        >
          {profile.tagline}
          <br />
          <span className="italic">Based in {profile.location}.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 md:mb-12"
        >
          <motion.button
            onClick={scrollToProjects}
            className="group relative px-8 py-4 bg-blue-600 rounded-2xl text-white font-bold flex items-center justify-center gap-2 overflow-hidden hover:bg-blue-500 transition-all duration-300"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            <span>View Work</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </motion.button>

          <motion.a
            href={profile.resumeUrl}
            download
            className="group px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            <span>Download CV</span>
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform text-blue-400" aria-hidden="true" />
          </motion.a>
        </motion.div>

        {/* Stats — clean, centered */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="flex items-center justify-center gap-8 sm:gap-16 md:gap-20 border-t border-white/10 pt-6 md:pt-10 max-w-lg mx-auto"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <motion.div
                className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1"
                whileHover={shouldReduceMotion ? undefined : { y: -3 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator — tepat di bawah stats, centered, animasi kontinu */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-8 md:mt-12 flex justify-center w-full"
        >
          {shouldReduceMotion ? (
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Explore</span>
              <div className="w-px h-12 bg-gradient-to-b from-blue-500/50 to-transparent" />
            </div>
          ) : (
            <motion.div
              animate={{ y: [-28, 28, -28] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-3 text-zinc-500"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Explore</span>
              <motion.div
                className="w-px h-14 bg-gradient-to-b from-blue-400 to-transparent"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
