import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  FaPhp, FaLaravel, FaPython, FaGitAlt, FaJsSquare, FaHtml5, FaCss3Alt, FaBrain
} from 'react-icons/fa';
import { SiTensorflow, SiTailwindcss } from 'react-icons/si';
import { DiMysql } from 'react-icons/di';

const technologies = [
  { 
    name: 'PHP', 
    icon: <FaPhp />,
    category: 'Backend'
  },
  { 
    name: 'Laravel', 
    icon: <FaLaravel />,
    category: 'Framework'
  },
  { 
    name: 'Python', 
    icon: <FaPython />,
    category: 'AI/ML'
  },
  { 
    name: 'TensorFlow', 
    icon: <SiTensorflow />,
    category: 'Deep Learning'
  },
  { 
    name: 'MySQL', 
    icon: <DiMysql />,
    category: 'Database'
  },
  { 
    name: 'Git', 
    icon: <FaGitAlt />,
    category: 'Version Control'
  },
  { 
    name: 'Tailwind', 
    icon: <SiTailwindcss />,
    category: 'Styling'
  },
  { 
    name: 'JavaScript', 
    icon: <FaJsSquare />,
    category: 'Frontend'
  },
  { 
    name: 'HTML5', 
    icon: <FaHtml5 />,
    category: 'Frontend'
  },
    { 
    name: 'CSS3', 
    icon: <FaCss3Alt />,
    category: 'Frontend'
  },
  { 
    name: 'DeepFace', 
    icon: <FaBrain />,
    category: 'AI Library'
  },
];

const MarqueeRow = ({ items, direction = 'left', speed = 30 }) => {
  const duplicatedItems = [...items, ...items, ...items];
  
  return (
    <div className="relative overflow-hidden py-3">
      <motion.div
        animate={{
          x: direction === 'left' ? ['0%', '-33.33%'] : ['-33.33%', '0%'],
        }}
        transition={{
          x: {
            duration: speed,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
        className="flex gap-4"
      >
        {duplicatedItems.map((tech, index) => (
          <div
            key={`${tech.name}-${index}`}
            className="flex-shrink-0 group"
          >
            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-3">
              <span className="text-2xl text-white">{tech.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{tech.name}</div>
                <div className="text-zinc-500 text-xs">{tech.category}</div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default function TechStackSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const row1 = technologies.slice(0, 6);
  const row2 = technologies.slice(6);

  return (
    <section id="skills" className="py-20 md:py-32 relative overflow-hidden" ref={ref}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-blue-400 text-sm font-semibold tracking-wider uppercase">
            Tech Stack
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Tools & Technologies
          </h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            The technologies I use to bring ideas to life
          </p>
        </motion.div>

        {/* Marquee Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
          
          <MarqueeRow items={row1} direction="left" speed={40} />
          <MarqueeRow items={row2} direction="right" speed={35} />
        </motion.div>

        {/* Skills Categories */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Frontend', items: ['HTML5', 'CSS3', 'JavaScript', 'Tailwind'], color: 'blue' },
            { label: 'Backend', items: ['PHP', 'Laravel', 'Python'], color: 'emerald' },
            { label: 'Database', items: ['MySQL', 'SQLite'], color: 'purple' },
            { label: 'AI/ML', items: ['TensorFlow', 'DeepFace', 'CNN'], color: 'orange' },
          ].map((category, index) => (
            <div
              key={category.label}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className={`text-${category.color}-400 font-semibold mb-3 text-sm`}>
                {category.label}
              </div>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div key={item} className="text-zinc-400 text-sm flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${category.color}-500`} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}