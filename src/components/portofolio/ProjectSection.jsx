import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Github, Brain, Globe, Cpu, ArrowUpRight, Star } from 'lucide-react';
import ProjectModal from './ProjectModal'; // Import the modal component

// --- PORTOFOLIO DATA ---
const projects = [
  {
    id: 1,
    title: "Facial Expression Recognition System with VGG16 & SE-Block Attention",
    category: "AI / Machine Learning",
    imageUrl: "/project1.png",
    technologies: ["Python", "TensorFlow", "Keras", "OpenCV", "Gradio", "Hugging Face", "Pandas", "NumPy", "Matplotlib", "Seaborn"],
    longDescription: 
`This project is a final-year thesis research focused on developing a robust facial expression classification system using the 'in-the-wild' FER-2013 dataset, which presents significant challenges due to extreme variations in lighting and pose. The system is built upon a Convolutional Neural Network (CNN) architecture utilizing a VGG16 backbone with a Transfer Learning approach.

A key innovation of this project is the integration of the Squeeze-and-Excitation (SE-Block) attention mechanism immediately following the VGG16 backbone. This mechanism enables the model to adaptively recalibrate feature weights, effectively prioritizing crucial facial regions (such as the eyes and mouth) while suppressing background noise.

To achieve optimal performance, an 'Aggressive Fine-Tuning' strategy was implemented by unfreezing high-level convolutional layers (blocks 4 & 5). Furthermore, advanced regularization techniques, including Label Smoothing and Class Weights, were applied to mitigate overfitting and address data imbalance. Experimental results demonstrate that this method (Optimized Scenario) achieved a validation accuracy of 66.9%, a significant 15.2% improvement over the baseline model. The final system has been deployed using Gradio on Hugging Face Spaces for real-time inference.`,
    challenges: 
`1. Class Imbalance: The FER-2013 dataset exhibits extreme disparity in class distribution (e.g., 'Happy' is far more prevalent than 'Disgust'). 
   Solution: Implemented Class Weights within the Loss Function to penalize misclassifications of minority classes more heavily.
2. Inter-class Similarity: Expressions such as 'Fear' and 'Surprise' share highly similar visual features. 
   Solution: The application of the SE-Block attention mechanism assisted the model in distinguishing micro-features in the eye and lip regions.
3. Noisy Labels: The dataset contains labels that are not 100% accurate. 
   Solution: Utilized Label Smoothing (0.1) to prevent the model from becoming 'overconfident' in its predictions.
4. Pose Variations (In-the-wild): Test images often feature non-frontal poses. 
   Solution: Applied Test Time Augmentation (TTA) during the inference phase to average predictions across multiple augmented variations of the input image.`,
    githubUrl: "https://github.com/qoidrifat/facial-expression-recognition-system",
    demoUrl: "https://huggingface.co/spaces/qoidrifat/demo-sidang",
    featured: true,
    icon: Brain,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 2,
    title: "Web Development Portfolio",
    category: "Web Dev",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    technologies: ["Laravel", "PHP", "MySQL", "Tailwind CSS", "REST API"],
    longDescription: "A collection of web applications built with Laravel and PHP. Includes e-commerce platforms, content management systems, and custom business solutions. This project demonstrates my ability to build full-stack applications from scratch.",
    challenges: "The main challenge was to design a multi-tenant architecture for the e-commerce platform, allowing different vendors to manage their own products and orders. This required careful database design and implementation of access control policies.",
    githubUrl: "#",
    demoUrl: "#",
    featured: false,
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 3,
    title: "IoT & Hardware Modifications",
    category: "Hardware",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
    technologies: ["IoT", "Hardware", "Embedded Systems", "Modifications"],
    longDescription: "Experience in modifying and customizing hardware devices, including mobile devices and IoT components. This involves flashing custom firmware, soldering components, and integrating devices with software to create new functionalities.",
    challenges: "Working with hardware always presents unique challenges, such as dealing with proprietary software, reverse-engineering protocols, and the risk of bricking devices. Patience and meticulous research are key to success in this area.",
    githubUrl: "#",
    demoUrl: "#",
    featured: false,
    icon: Cpu,
    color: "from-emerald-500 to-teal-500",
  }
];

const ProjectCard = ({ project, index, isInView, onProjectSelect }) => {
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
      <div className="relative h-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500 flex flex-col">
        {project.featured && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-xs font-semibold">Featured Project</span>
          </div>
        )}

        <div className="relative h-48 md:h-64 overflow-hidden">
          <motion.img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
          <div className={`absolute top-4 right-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-lg`}>
            <project.icon className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col flex-grow">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              {project.category}
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">
              {project.title}
            </h3>
          <p className="text-zinc-400 text-sm leading-relaxed my-4 flex-grow">
            {project.longDescription.substring(0, 100)}...
          </p>
          
          <div className="mt-auto flex items-center gap-3">
            <motion.button
              onClick={() => onProjectSelect(project)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Details
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
            <motion.a
              href={project.githubUrl}
              target="_blank" rel="noopener noreferrer"
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
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="projects" className="py-20 md:py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              isInView={isInView}
              onProjectSelect={setSelectedProject}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-zinc-500 text-sm">
            More projects available on{' '}
            <a href="https://github.com/qory-rosyada" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
              GitHub →
            </a>
          </p>
        </motion.div>
      </div>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </section>
  );
}
