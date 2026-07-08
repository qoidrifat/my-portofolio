import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { GraduationCap, MapPin, Rocket, Brain, Code, Camera, Download } from 'lucide-react';
import { profile } from '@/lib/data';
import OptimizedImage from '@/components/OptimizedImage';

export default function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const highlights = [
    {
      icon: GraduationCap,
      title: "Education",
      description: "Final-year Informatics Engineering student at Universitas Trunojoyo Madura",
      color: "blue"
    },
    {
      icon: Brain,
      title: "AI Integration",
      description: "Passionate about bridging Web Development with Artificial Intelligence",
      color: "emerald"
    },
    {
      icon: Code,
      title: "Full Stack",
      description: "Experienced in building end-to-end web applications with Laravel & Python",
      color: "purple"
    },
    {
      icon: Camera,
      title: "Creative Side",
      description: "Photography enthusiast capturing moments between lines of code",
      color: "orange"
    }
  ];

  return (
    <section id="about" className="py-24 md:py-32 relative overflow-hidden scroll-mt-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block"
          >
            Discovery
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            About <span className="text-zinc-700">Me</span>
          </motion.h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Image/Visual Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative aspect-[4/5] max-w-md mx-auto">
              {/* Decorative background blobs */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[80px]" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-[80px]" />
              
              {/* Main Profile Card */}
              <div className="relative h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-10 overflow-hidden group shadow-2xl">
                {/* Profile picture frame */}
                <div className="relative w-48 h-48 mx-auto mb-10 group-hover:scale-105 transition-transform duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-[2.5rem] rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-[2.5rem] -rotate-3 group-hover:-rotate-6 transition-transform duration-500 opacity-20" />
                  <OptimizedImage 
                    src={profile.photoUrl} 
                    alt="Qoid Rif'at"
                    className="relative w-full h-full rounded-[2.5rem] object-cover border border-white/10 shadow-2xl"
                  />
                </div>
                
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-black text-white">Qoid Rif'at</h3>
                  <p className="text-zinc-400 font-medium text-lg italic">
                    Web Developer & AI Enthusiast
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                    <MapPin className="w-4 h-4 text-blue-500" aria-hidden="true" />
                    <span>Surabaya, Indonesia</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-10 flex justify-center">
                  <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Ready to Innovate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Side */}
          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">                    <Rocket className="w-6 h-6 text-blue-500" aria-hidden="true" />
                My Journey
              </h3>
              <p className="text-xl text-zinc-400 leading-relaxed">
                I'm a <span className="text-white font-black underline decoration-blue-500/50 decoration-4 underline-offset-4">final-year Informatics Engineering student</span> at 
                Universitas Trunojoyo Madura, dedicated to crafting high-performance digital solutions.
              </p>
              <p className="text-zinc-400 leading-relaxed text-lg">
                I specialize in bridging the gap between sophisticated backend logic and 
                intuitive frontend experiences, with a growing focus on integrating 
                Artificial Intelligence to solve real-world challenges.
              </p>
            </motion.div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highlights.map((item, index) => {
                const iconColor = item.color;
                const iconRing = {
                  blue:    'hover:border-blue-500/30',
                  emerald: 'hover:border-emerald-500/30',
                  purple:  'hover:border-purple-500/30',
                  orange:  'hover:border-orange-500/30',
                };
                const iconBg = {
                  blue:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
                  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                  purple:  'border-purple-500/30 bg-purple-500/10 text-purple-400',
                  orange:  'border-orange-500/30 bg-orange-500/10 text-orange-400',
                };
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={`group p-6 rounded-[2rem] bg-white/5 border border-white/5 ${iconRing[iconColor]} transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${iconBg[iconColor]} flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-white font-bold text-base mb-2 group-hover:text-blue-300 transition-colors duration-300">{item.title}</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <button className="group relative px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold flex items-center gap-3 hover:bg-white/10 transition-all overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>Download Resume</span>
                <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform text-blue-500" aria-hidden="true" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}