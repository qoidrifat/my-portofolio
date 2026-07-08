// =============================================================================
// src/lib/data.js — Single source of truth for portfolio content
// =============================================================================
//
// All section components consume from this file.
// Icons are imported as component references (not JSX) — consumers render
// them via <item.icon className="..." /> for consistency with existing
// patterns in TechStackSection.jsx and ProjectSection.jsx.

import { Github, Linkedin, Instagram, Mail, MessageCircle, Copy, MapPin, Phone } from 'lucide-react';
import { Brain, Building2, Globe, MapPinned } from 'lucide-react';
import {
  FaPhp, FaLaravel, FaPython, FaGitAlt, FaJsSquare, FaHtml5, FaCss3Alt,
  FaBrain, FaNodeJs, FaMobileAlt, FaRobot,
} from 'react-icons/fa';
import {
  SiTensorflow, SiTailwindcss, SiKeras, SiOpencv, SiScikitlearn,
  SiHuggingface, SiReact, SiSqlite,
} from 'react-icons/si';
import { VscVscode } from 'react-icons/vsc';
import { DiMysql } from 'react-icons/di';


// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export const profile = {
  name: "Qoid Rif'at",
  role: 'Web Developer & AI Enthusiast',
  tagline: 'Turning data into logic and logic into experience.',
  location: 'Surabaya, Indonesia',
  status: 'Available for new opportunities',
  email: 'qoidrifat23@gmail.com',
  phone: '+62 823 3775 3394',
  photoUrl: '/profile.webp',
  resumeUrl: '/Qoid-Rifat-CV.pdf',
  logoUrl: '/logo.webp',
};


// -----------------------------------------------------------------------------
// Navigation (6 entries — Featured stays anchor-only, not a nav item)
// DO NOT add a "Featured" entry — Risk R1 confirmed.
// -----------------------------------------------------------------------------

export const navLinks = [
  { name: 'Home',     href: '#hero' },
  { name: 'About',    href: '#about' },
  { name: 'Journey',  href: '#journey' },
  { name: 'Skills',   href: '#skills' },
  { name: 'Projects', href: '#projects' },
  { name: 'Gallery',  href: '#gallery' },
  { name: 'GitHub',   href: '#github' },
  { name: 'Perf',     href: '#perf' },
  { name: 'Contact',  href: '#contact' },
];


// -----------------------------------------------------------------------------
// Socials (used in Layout footer + Contact section)
// icon = lucide-react component reference — consumers render via <s.icon />
// TODO: Replace placeholder '#' hrefs with real URLs (Risk §1.10)
// -----------------------------------------------------------------------------

export const socials = [
  { name: 'GitHub',    href: 'https://github.com/qoidrifat',       icon: Github },
  { name: 'LinkedIn',  href: 'https://linkedin.com/in/qoidrifat',  icon: Linkedin },  // TODO: verify real LinkedIn URL
  { name: 'Instagram', href: 'https://instagram.com/qoidrifat',    icon: Instagram }, // TODO: verify real Instagram URL
  { name: 'Email',     href: 'mailto:qoidrifat23@gmail.com',       icon: Mail },
];


// -----------------------------------------------------------------------------
// Contact channels — quick-action panel for ContactSection
// No Telegram, no Calendly per design decision.
// 'copy-email' has no href — triggers clipboard via useCopyToClipboard hook.
// -----------------------------------------------------------------------------

export const contactChannels = [
  {
    kind: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/6282337753394',
    icon: MessageCircle,
  },
  {
    kind: 'copy-email',
    label: 'Copy Email',
    value: 'qoidrifat23@gmail.com',
    icon: Copy,
  },
  {
    kind: 'linkedin',
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/qoidrifat',  // TODO: verify real LinkedIn URL
    icon: Linkedin,
  },
  {
    kind: 'github',
    label: 'GitHub',
    href: 'https://github.com/qoidrifat',
    icon: Github,
  },
  {
    kind: 'mailto',
    label: 'Email',
    href: 'mailto:qoidrifat23@gmail.com',
    icon: Mail,
  },
];


// -----------------------------------------------------------------------------
// Contact info — the Email / Phone / Location triplet from ContactSection
// Matches existing lines 57-60 of ContactSection.jsx
// -----------------------------------------------------------------------------

export const contactInfo = [
  { icon: Mail,   label: 'Email',    value: 'qoidrifat23@gmail.com',  color: 'blue' },
  { icon: Phone,  label: 'Phone',    value: '+62 823 3775 3394',      color: 'emerald' },
  { icon: MapPin, label: 'Location', value: 'Surabaya, Indonesia',      color: 'purple' },
];


// -----------------------------------------------------------------------------
// Tech categories (6 groups) — enhanced with experience levels & project associations
// accent: 'web' | 'ai' drives theming via design-system tokens
// icon fields are component references — consumers render via <cat.icon />
// experience_level: 0-100 (percentage)
// projectIds: references to project.id in the projects array
// -----------------------------------------------------------------------------

export const techCategories = [
  {
    id: 'frontend',
    label: 'Frontend',
    accent: 'web',
    icon: FaJsSquare,
    items: [
      { name: 'HTML5',      icon: FaHtml5,      experience_level: 85, years: 4, projectIds: [4, 5] },
      { name: 'CSS3',       icon: FaCss3Alt,    experience_level: 80, years: 4, projectIds: [4, 5] },
      { name: 'JavaScript', icon: FaJsSquare,   experience_level: 78, years: 4, projectIds: [4, 5, 6] },
      { name: 'Tailwind',   icon: SiTailwindcss,  experience_level: 72, years: 2, projectIds: [4] },
      { name: 'React',      icon: SiReact,      experience_level: 60, years: 1.5, projectIds: [] },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    accent: 'web',
    icon: FaPhp,
    items: [
      { name: 'PHP',     icon: FaPhp,     experience_level: 82, years: 3.5, projectIds: [4, 5] },
      { name: 'Laravel', icon: FaLaravel, experience_level: 78, years: 3, projectIds: [4] },
      { name: 'Python',  icon: FaPython,  experience_level: 70, years: 2.5, projectIds: [1, 6] },
      { name: 'Node.js', icon: FaNodeJs,  experience_level: 45, years: 1, projectIds: [] },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    accent: 'web',
    icon: DiMysql,
    items: [
      { name: 'MySQL',  icon: DiMysql,  experience_level: 75, years: 3, projectIds: [4, 5] },
      { name: 'SQLite', icon: SiSqlite, experience_level: 55, years: 2, projectIds: [6] },
    ],
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    accent: 'ai',
    icon: FaBrain,
    items: [
      { name: 'TensorFlow',   icon: SiTensorflow,   experience_level: 72, years: 2, projectIds: [1] },
      { name: 'Keras',        icon: SiKeras,        experience_level: 70, years: 2, projectIds: [1] },
      { name: 'DeepFace',     icon: FaBrain,        experience_level: 60, years: 1.5, projectIds: [1] },
      { name: 'OpenCV',       icon: SiOpencv,       experience_level: 58, years: 1.5, projectIds: [1] },
      { name: 'scikit-learn', icon: SiScikitlearn,  experience_level: 55, years: 1.5, projectIds: [6] },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    accent: 'web',
    icon: FaGitAlt,
    items: [
      { name: 'Git',          icon: FaGitAlt,    experience_level: 75, years: 3.5, projectIds: [1, 4, 5, 6] },
      { name: 'VS Code',      icon: VscVscode,   experience_level: 85, years: 4, projectIds: [1, 4, 5, 6] },
      { name: 'Hugging Face', icon: SiHuggingface, experience_level: 50, years: 1.5, projectIds: [1] },
      { name: 'Gradio',       icon: FaRobot,     experience_level: 48, years: 1, projectIds: [1] },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    accent: 'web',
    icon: FaMobileAlt,
    items: [
      { name: 'React Native', icon: SiReact, experience_level: 25, years: 0.5, projectIds: [] },
    ],
  },
];


// -----------------------------------------------------------------------------
// Projects
// accent: 'ai' | 'web' — drives theming; icon = lucide component reference
// impact is string[] (3-4 short outcome bullets)
// year indicates project completion / primary year
// -----------------------------------------------------------------------------

export const projects = [
  {
    id: 1,
    slug: 'facial-expression-recognition',
    title: 'Facial Expression Recognition System with VGG16 & SE-Block Attention',
    category: 'AI / Machine Learning',
    accent: 'ai',
    year: '2024',
    role: 'Researcher & Developer',
    impact: [
      '+15.2% validation accuracy vs baseline',
      '66.9% accuracy on FER-2013 in-the-wild dataset',
      'Deployed real-time inference on Hugging Face Spaces',
      'SE-Block attention for adaptive feature recalibration',
    ],
    imageUrl: '/project1.webp',
    technologies: [
      'Python', 'TensorFlow', 'Keras', 'OpenCV', 'Gradio',
      'Hugging Face', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
    ],
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
    githubUrl: 'https://github.com/qoidrifat/facial-expression-recognition-system',
    demoUrl: 'https://huggingface.co/spaces/qoidrifat/demo-sidang',
    featured: true,
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
  },

  {
    id: 4,
    slug: 'payrollpro',
    title: 'PayrollPro',
    category: 'Payroll & Employee Attendance Management System',
    filterCategory: 'Payroll',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer',
    impact: [
      'Employee, attendance, payroll, payslip, approval, and report modules',
      'QR attendance flow with admin and employee dashboards',
      'Role-based access for Admin, HR, and Employee workflows',
    ],
    imageUrl: '/project-payrollpro.webp',
    technologies: [
      'Laravel', 'PHP', 'Vue 3', 'Inertia.js', 'Tailwind CSS',
      'MySQL / Supabase', 'JavaScript', 'DomPDF', 'Spatie Permission',
    ],
    features: [
      'Employee management',
      'QR attendance system',
      'Payroll calculation',
      'Payslip generation',
      'Admin & employee dashboard',
      'Approval workflow',
      'Attendance report',
      'Role-based access',
    ],
    longDescription:
      'A comprehensive web-based payroll and employee attendance management system designed to streamline HR operations. The platform enables companies to efficiently manage employee records, QR-based attendance tracking, payroll calculations, payslip generation, approval workflows, and detailed reporting — all within a modern, unified dashboard.',
    challenges:
      'The key product challenge was bringing HR operations into one coherent workflow: employee records, attendance capture, payroll processing, payslip output, approval states, reports, and role-based dashboard access all need to stay consistent across admin, HR, and employee views.',
    githubUrl: '#',
    demoUrl: null,
    featured: false,
    icon: Building2,
    color: 'from-sky-500 to-emerald-500',
  },
  {
    id: 5,
    slug: 'explore-bali',
    title: 'Explore Bali',
    category: 'Travel Booking & Tourism Website',
    filterCategory: 'Travel',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer',
    impact: [
      'Destination, package, booking, invoice, admin, and user flows',
      'PHP-native file-based monolith optimized for shared hosting',
      'Responsive public travel UI with internal booking dashboard',
    ],
    imageUrl: '/project-explore-bali.webp',
    technologies: [
      'PHP Native', 'MySQL / MariaDB', 'mysqli', 'HTML',
      'Custom CSS', 'JavaScript', 'Apache',
    ],
    features: [
      'Destination showcase',
      'Travel package management',
      'Booking system',
      'Internal booking flow',
      'Invoice page',
      'User dashboard',
      'Admin dashboard',
      'Responsive travel UI',
    ],
    longDescription:
      'A feature-rich Bali travel and tour booking website that empowers users to explore stunning destinations, browse curated travel packages, make seamless bookings, and manage invoices with ease. The platform also provides administrators with a modern, responsive dashboard for comprehensive travel data management.',
    challenges:
      'The main challenge was keeping a PHP-native travel website maintainable while covering public destination pages, booking flows, invoice history, authentication, role-aware admin screens, and responsive styling without a frontend build stack.',
    githubUrl: '#',
    demoUrl: null,
    featured: false,
    icon: MapPinned,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 6,
    slug: 'qoid-ra-psd',
    title: 'Data Mining Jupyter Book',
    category: 'Data Mining Documentation / Jupyter Book',
    filterCategory: 'Data Science',
    accent: 'web',
    year: '2023',
    role: 'Data Science Notebook Author',
    impact: [
      'Structured Proyek Sains Data coursework into browsable documentation',
      'Published notebook-based experiments as a static GitHub Pages site',
      'Documented audio feature extraction and dataset classification workflows',
    ],
    imageUrl: '/project-qoid-ra-psd.webp',
    technologies: ['Jupyter Book', 'Python', 'Streamlit', 'scikit-learn', 'Pandas', 'librosa', 'GitHub Pages'],
    features: [
      'Jupyter Book static documentation',
      'Audio data exploration',
      'Zero Crossing Rate feature extraction',
      'Audio classification notebooks',
      'Wholesale Customers dataset analysis',
      'Streamlit prototype scripts',
      'GitHub Pages deployment',
    ],
    longDescription:
      'A comprehensive Jupyter Book documentation project developed for the Data Science Project coursework. It encompasses in-depth data exploration, audio classification, and feature extraction analysis — including Zero Crossing Rate, standard deviation, skewness, and kurtosis — alongside a thorough analysis of the Wholesale Customers dataset. The project is published as a static GitHub Pages site featuring structured documentation navigation, HTML notebook pages, and well-organized experiment reports for seamless browsing and reference.',
    challenges:
      'The main challenge was turning notebook-based experiments and Python analysis scripts into readable static documentation while keeping datasets, model workflows, and experiment outputs easy to scan from a published GitHub Pages site.',
    githubUrl: 'https://github.com/qoidrifat/qoid_ra.psd',
    demoUrl: 'https://qoidrifat.github.io/qoid_ra.psd/intro.html',
    featured: false,
    icon: Globe,
    color: 'from-blue-500 to-indigo-500',
  },
];


// -----------------------------------------------------------------------------
// Featured project — the FER project (id: 1)
// Used by FeaturedProjectSection (to highlight) and ProjectSection (to exclude)
// -----------------------------------------------------------------------------

export const featuredProjectId = 1;


// -----------------------------------------------------------------------------
// Journey timeline (used by CareerTimelineSection)
// icon = lucide-react component reference — consumers render via <item.icon />
// category: 'education' | 'career' | 'project' | 'milestone' — drives color coding
// details: optional longer text for expandable card
// technologies: optional array of skills/tools used at that time
// -----------------------------------------------------------------------------

export const journey = [
  {
    year: '2021',
    title: 'Enrolled in Informatics Engineering',
    description:
      'Began studying at Universitas Trunojoyo Madura, building a strong foundation in algorithms, data structures, and software engineering.',
    details:
      'Started my academic journey in the heart of Madura. The curriculum covered everything from discrete mathematics and algorithm design to database systems and object-oriented programming. It was here that I wrote my first lines of Java and fell in love with the logic behind software.',
    icon: 'GraduationCap',
    category: 'education',
    technologies: ['Java', 'Python', 'MySQL', 'Algorithms', 'Data Structures'],
  },
  {
    year: '2022',
    title: 'First Laravel Project',
    description:
      'Built my first full-stack web application using Laravel and MySQL — an inventory management system for a local business.',
    details:
      'A pivotal moment — my first real-world project for a local business. I designed the database schema, built RESTful APIs with Laravel, and crafted a responsive frontend. This project taught me MVC architecture, migrations, Eloquent ORM, and the importance of clean, maintainable code.',
    icon: 'Code',
    category: 'project',
    technologies: ['Laravel', 'PHP', 'MySQL', 'JavaScript', 'HTML/CSS'],
  },
  {
    year: '2023',
    title: 'AI Focus & Deep Learning',
    description:
      'Pivoted towards AI/ML, diving deep into CNNs, Transfer Learning, and computer vision with TensorFlow and Keras.',
    details:
      'After two years of web development, I became fascinated by Artificial Intelligence. I spent countless nights studying neural networks, implementing CNNs from scratch, and experimenting with Transfer Learning. This pivot redefined my career path — I wanted to bridge web development with intelligent systems.',
    icon: 'Brain',
    category: 'education',
    technologies: ['Python', 'TensorFlow', 'Keras', 'OpenCV', 'scikit-learn', 'Pandas'],
  },
  {
    year: '2024',
    title: 'Thesis: FER with VGG16 & SE-Block',
    description:
      'Completed final-year research achieving +15.2% accuracy improvement on FER-2013, deployed on Hugging Face Spaces.',
    details:
      'My undergraduate thesis tackled one of the toughest challenges in computer vision — facial expression recognition in the wild. I built a VGG16-based CNN with Squeeze-and-Excitation attention blocks, achieving 66.9% validation accuracy on FER-2013 — a +15.2% improvement over the baseline. The model was deployed with Gradio on Hugging Face Spaces for real-time inference.',
    icon: 'FlaskConical',
    category: 'project',
    technologies: ['Python', 'TensorFlow', 'Keras', 'OpenCV', 'Gradio', 'Hugging Face', 'NumPy', 'Matplotlib'],
  },
  {
    year: '2025',
    title: 'Freelance & Portfolio Launch',
    description:
      'Built production-grade web applications (PayrollPro, Explore Bali) and launched this portfolio to showcase my work.',
    details:
      'A year of intense hands-on development. I built PayrollPro — a full-featured employee management system with QR attendance and payroll workflows — and Explore Bali, a travel booking platform. Both projects sharpened my full-stack skills and taught me about authentication, role-based access, and responsive design at scale. This portfolio itself is a React + Vite project with AI-powered features.',
    icon: 'Rocket',
    category: 'project',
    technologies: ['Laravel', 'PHP', 'Vue 3', 'React', 'Tailwind CSS', 'MySQL', 'JavaScript', 'Inertia.js'],
  },
  {
    year: '2026',
    title: 'Project CashFlow — AI-Powered Finance',
    description:
      'Built a personal finance management app integrated with Vertex AI for receipt scanning and Gmail API for automated bank/e-wallet transaction extraction.',
    details:
      'CashFlow is a full-stack finance dashboard that automatically tracks income and expenses by scanning receipt images via Vertex AI Vision and parsing bank/e-wallet transaction emails through the Gmail API on Google Cloud. The app categorizes spending, generates monthly reports, and provides real-time budget insights — eliminating manual entry entirely.',
    icon: 'Wallet',
    category: 'project',
    technologies: ['React', 'Node.js', 'Vertex AI', 'Gmail API', 'Google Cloud', 'PostgreSQL', 'Tailwind CSS', 'TypeScript'],
  },
  {
    year: '2026',
    title: 'Open for Opportunities',
    description:
      'Actively seeking roles where I can combine web development expertise with AI integration to build intelligent digital products.',
    details:
      'I am currently open to full-time, contract, or freelance opportunities. My ideal role bridges full-stack web development with AI/ML integration — building intelligent, user-facing applications that make a real impact. Based in Surabaya, Indonesia, available for remote or hybrid positions.',
    icon: 'Target',
    category: 'milestone',
    technologies: ['React', 'Laravel', 'Python', 'TensorFlow', 'TypeScript', 'Tailwind CSS'],
  },
];
