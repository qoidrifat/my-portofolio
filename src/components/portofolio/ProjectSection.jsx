import React, { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ExternalLink, Github, Brain, Globe, Cpu, ArrowUpRight, Star } from 'lucide-react';

const projects = [
  {
    id: 1,
    title: "Facial Expression Classification System",
    description: "My thesis project utilizing DeepFace library and CNN Transfer Learning to classify human facial expressions. Built with Python backend for real-time emotion detection and analysis.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    tags: ["Python", "TensorFlow", "DeepFace", "CNN", "Transfer Learning"],
    category: "AI/ML",
    featured: true,
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    github: "#",
    demo: "#"
  },
  {
    id: 2,
    title: "Web Development Portfolio",
    description: "A collection of web applications built with Laravel and PHP. Includes e-commerce platforms, content management systems, and custom business solutions.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    tags: ["Laravel", "PHP", "MySQL", "Tailwind CSS", "REST API"],
    category: "Web Dev",
    featured: false,
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
    github: "#",
    demo: "#"
  },
  {
    id: 3,
    title: "IoT & Hardware Modifications",
    description: "Experience in modifying and customizing hardware devices, including mobile devices and IoT components. Exploring the intersection of software and hardware.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
    tags: ["IoT", "Hardware", "Embedded Systems", "Modifications"],
    category: "Hardware",
    featured: false,
    icon: Cpu,
    color: "from-emerald-500 to-teal-500",
    github: "#",
    demo: "#"
  }
];

const ProjectCard = ({ project, index, isInView }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${project.featured ? 'md:col-span-2' : ''}`}
    >
      <div className="relative h-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500">
        {/* Featured badge */}
        {project.featured && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-xs font-semibold">Featured Project</span>
          </div>
        )}

        {/* Image section */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <motion.img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
          
          {/* Category icon */}
          <div className={`absolute top-4 right-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-lg`}>
            <project.icon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Content section */}
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                {project.category}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">
                {project.title}
              </h3>
            </div>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 hover:bg-white/10 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.a
              href={project.demo}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Project
              <ArrowUpRight className="w-4 h-4" />
            </motion.a>
            <motion.a
              href={project.github}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Github className="w-5 h-5" />
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ProjectsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="projects" className="py-20 md:py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-blue-400 text-sm font-semibold tracking-wider uppercase">
            Portfolio
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Featured Projects
          </h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            A showcase of my work spanning web development, AI integration, and hardware modifications
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>

        {/* View more hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-zinc-500 text-sm">
            More projects available on{' '}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
              GitHub →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}