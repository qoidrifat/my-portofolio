
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const ProjectModal = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-zinc-900/80 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 md:p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{project.title}</h2>
            <p className="text-zinc-400 mb-6">{project.category}</p>

            <div className="mb-6">
              <img src={project.imageUrl} alt={project.title} className="rounded-lg w-full object-cover" />
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">About the Project</h3>
                <p className="text-zinc-300 whitespace-pre-wrap">{project.longDescription}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Technologies Used</h3>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map(tech => (
                    <span key={tech} className="bg-white/10 text-white text-xs font-medium px-2.5 py-1 rounded-full">{tech}</span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Challenges & Solutions</h3>
                <p className="text-zinc-300 whitespace-pre-wrap">{project.challenges}</p>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-semibold">
                Live Demo
              </a>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-white/10 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all font-semibold">
                GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectModal;
