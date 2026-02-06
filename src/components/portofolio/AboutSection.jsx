import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { GraduationCap, MapPin, Rocket, Brain, Code, Camera } from 'lucide-react';

export default function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const highlights = [
    {
      icon: GraduationCap,
      title: "Education",
      description: "Final-year Informatics Engineering student at Universitas Trunojoyo Madura"
    },
    {
      icon: Brain,
      title: "AI Integration",
      description: "Passionate about bridging Web Development with Artificial Intelligence"
    },
    {
      icon: Code,
      title: "Full Stack",
      description: "Experienced in building end-to-end web applications with Laravel & Python"
    },
    {
      icon: Camera,
      title: "Creative Side",
      description: "Photography enthusiast capturing moments between lines of code"
    }
  ];

  return (
    <section id="about" className="py-20 md:py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-blue-400 text-sm font-semibold tracking-wider uppercase">
            About Me
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Hello, I'm <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Qoid Rif'at</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image/Visual Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-3xl transform rotate-6" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-3xl transform -rotate-3" />
              
              {/* Main card */}
              <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full flex flex-col justify-center">
                {/* Profile placeholder */}
                <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white">QR</span>
                </div>
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Qoid Rif'at</h3>
                  <p className="text-blue-400 font-medium mb-4">Web Developer & AI Enthusiast</p>
                  
                  <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>Madura, Indonesia</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="mt-6 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 text-sm font-medium">Ready for Challenges</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <p className="text-lg text-zinc-300 leading-relaxed">
              I'm a <span className="text-white font-semibold">final-year Informatics Engineering student</span> at 
              Universitas Trunojoyo Madura, currently awaiting graduation and eager to take on professional challenges 
              in the tech industry.
            </p>
            
            <p className="text-zinc-400 leading-relaxed">
              My journey in tech revolves around creating intelligent web solutions that bridge the gap between 
              traditional web development and artificial intelligence. I believe in writing clean, efficient code 
              and building experiences that matter.
            </p>

            <p className="text-zinc-400 leading-relaxed">
              When I'm not coding, you'll find me exploring photography, capturing moments that tell stories. 
              This creative outlet helps me bring a unique perspective to my technical work.
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              {highlights.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}