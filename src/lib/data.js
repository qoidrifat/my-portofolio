// @ts-check
// =============================================================================
// src/lib/data.js — Single source of truth for portfolio content
// =============================================================================
//
// All section components consume from this file.
// Icons are imported as component references (not JSX) — consumers render
// them via <item.icon className="..." /> for consistency with existing
// patterns in TechStackSection.jsx and ProjectSection.jsx.
//
// Type safety: // @ts-check + JSDoc typedefs below validate SSoT. jsconfig
// has checkJs:false globally; this file opts in incrementally.

/**
 * @typedef {import('react').ComponentType<any>} IconComponent
 * @typedef {{ value: string, label: string }} Metric
 * @typedef {{ id: string, label: string, sub: string, icon: string }} ArchNode
 * @typedef {{ id: string, label: string, nodes: ArchNode[] }} ArchLane
 * @typedef {{ summary: string, lanes: ArchLane[], foot: ArchNode[] }} Architecture
 * @typedef {Object} Project
 * @property {number} id
 * @property {string} slug
 * @property {string} title
 * @property {string} category
 * @property {string} [filterCategory]
 * @property {string} [subtitle]
 * @property {string} accent
 * @property {string} year
 * @property {string} role
 * @property {string} [status]
 * @property {string} [description]
 * @property {string[]} [impact]
 * @property {string|null} [imageUrl]
 * @property {string|null} [visual]
 * @property {string[]} [technologies]
 * @property {Array<{label:string,items:string[]}>} [techGroups]
 * @property {string[]} [features]
 * @property {Metric[]} [metrics]
 * @property {Architecture} [architecture]
 * @property {Array<{tier:string,name:string,reliability:string,legal:string,status:string,detail:string,recommended?:boolean}>} [tiers]
 * @property {Array<{name:string,public:string,publicStatus:string,merchant:string,lane:string}>} [platforms]
 * @property {Array<{src:string,label:string,portrait?:boolean}>} [screenshots]
 * @property {Array<{label:string,href:string}>} [docs]
 * @property {Array<{title:string,detail:string}>} [lessons]
 * @property {Array<{phase:string,title:string,status:string,tone:string,detail:string}>} [roadmap]
 * @property {string} [longDescription]
 * @property {string} [challenges]
 * @property {string} [githubUrl]
 * @property {string|null} [demoUrl]
 * @property {boolean} [featured]
 * @property {IconComponent} [icon]
 * @property {string} [color]
 * @property {boolean} [isPlaceholder]
 */

import { Github, Linkedin, Instagram, Mail, MessageCircle, Copy, MapPin, Phone } from 'lucide-react';
import {
  FaPhp, FaLaravel, FaPython, FaGitAlt, FaJsSquare, FaHtml5, FaCss3Alt,
  FaBrain, FaNodeJs, FaMobileAlt, FaRobot,
} from 'react-icons/fa';
import {
  SiTensorflow, SiTailwindcss, SiKeras, SiOpencv, SiScikitlearn,
  SiHuggingface, SiReact, SiSqlite, SiPostgresql, SiFlutter, SiTypescript
} from 'react-icons/si';
import { VscVscode } from 'react-icons/vsc';
import { DiMysql } from 'react-icons/di';


// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export const profile = {
  name: "Qoid Rif'at",
  role: 'Full-Stack Developer',
  tagline: 'Building end-to-end web applications, robust backend architectures, and intelligent digital experiences.',
  location: 'Surabaya, Indonesia',
  status: 'Open to Full-Time & Contract Opportunities',
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
  { name: 'Projects', href: '#projects' },
  { name: 'Skills',   href: '#skills' },
  { name: 'Gallery',  href: '#gallery' },
  { name: 'GitHub',   href: '#github' },
  { name: 'Contact',  href: '#contact' },
];


// -----------------------------------------------------------------------------
// Socials (used in Layout footer + Contact section)
// icon = lucide-react component reference — consumers render via <s.icon />
// TODO: Replace placeholder '#' hrefs with real URLs (Risk §1.10)
// -----------------------------------------------------------------------------

export const socials = [
  { name: 'GitHub',    href: 'https://github.com/qoidrifat',       icon: Github },
  { name: 'LinkedIn',  href: 'https://www.linkedin.com/in/qoid-rif-at-a6b9701b0/',  icon: Linkedin },
  { name: 'Instagram', href: 'https://www.instagram.com/qoid_r.a',    icon: Instagram },
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
    href: 'https://www.linkedin.com/in/qoid-rif-at-a6b9701b0/',
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
      { name: 'React',      icon: SiReact,      experience_level: 60, years: 1.5, projectIds: [7] },
      { name: 'TypeScript', icon: SiTypescript, experience_level: 40, years: 0.5, projectIds: [2, 7] },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    accent: 'web',
    icon: FaPhp,
    items: [
      { name: 'PHP',     icon: FaPhp,     experience_level: 82, years: 3.5, projectIds: [3, 4, 5] },
      { name: 'Laravel', icon: FaLaravel, experience_level: 78, years: 3, projectIds: [3, 4] },
      { name: 'Python',  icon: FaPython,  experience_level: 70, years: 2.5, projectIds: [1, 3, 6, 8] },
      { name: 'Node.js', icon: FaNodeJs,  experience_level: 45, years: 1, projectIds: [2] },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    accent: 'web',
    icon: DiMysql,
    items: [
      { name: 'MySQL',      icon: DiMysql,       experience_level: 75, years: 3, projectIds: [4, 5] },
      { name: 'SQLite',     icon: SiSqlite,      experience_level: 55, years: 2, projectIds: [2, 6] },
      { name: 'PostgreSQL', icon: SiPostgresql,  experience_level: 35, years: 0.5, projectIds: [7, 8] },
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
      { name: 'OpenCV',       icon: SiOpencv,       experience_level: 58, years: 1.5, projectIds: [1] },
      { name: 'scikit-learn', icon: SiScikitlearn,  experience_level: 55, years: 1.5, projectIds: [] },
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
      { name: 'Flutter', icon: SiFlutter, experience_level: 25, years: 0.5, projectIds: [] },
    ],
  },
];


// -----------------------------------------------------------------------------
// Projects
// accent: 'ai' | 'web' — drives theming; icon = lucide component reference
// impact is string[] (3-4 short outcome bullets)
// year indicates project completion / primary year
//
// ORDERING RATIONALE (professional growth narrative):
//   1 → FER (featured) — Thesis research, highest complexity
//   2 → Agent Status   — AI infrastructure, real-time monitoring
//   3 → AUREX          — AI + Laravel full-stack
//   7 → CashFlow       — AI-powered finance
//   4 → PayrollPro     — Enterprise web app
//   5 → Explore Bali   — Full-stack travel web app
//   8 → SuperFood      — Data engineering pipeline
//   6 → Jupyter Book   — Academic foundation
// -----------------------------------------------------------------------------

export const journey = [
  {
    year: '2021',
    title: 'Enrolled in Informatics Engineering',
    organization: 'Universitas Trunojoyo Madura',
    description:
      'Began studying at Universitas Trunojoyo Madura, building a strong foundation in algorithms, data structures, and software engineering.',
    details:
      'Started my academic journey in the heart of Madura. The curriculum covered everything from discrete mathematics and algorithm design to database systems and object-oriented programming. It was here that I wrote my first lines of code and fell in love with the logic behind software.',
    technologies: ['Python', 'MySQL', 'Algorithms', 'Data Structures', 'Software Engineering'],
    category: 'education',
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
    organization: 'Universitas Trunojoyo Madura',
    description:
      'Completed final-year research achieving +15.2% accuracy improvement on FER-2013, deployed on Hugging Face Spaces.',
    details:
      'My undergraduate thesis tackled one of the toughest challenges in computer vision — facial expression recognition in the wild. I built a VGG16-based CNN with Squeeze-and-Excitation attention blocks, achieving 66.9% validation accuracy on FER-2013 — a +15.2% improvement over the baseline. The model was deployed with Gradio on Hugging Face Spaces for real-time inference.',
    icon: 'FlaskConical',
    category: 'project',
    technologies: ['Python', 'TensorFlow', 'Keras', 'OpenCV', 'Gradio', 'Hugging Face', 'NumPy', 'Matplotlib'],
  },
  {
    year: 'Late 2024',
    title: 'Web Developer Intern',
    organization: 'PT Maqna Tech Lab',
    description:
      'Contributed to web development and backend engineering, building REST APIs and interactive interfaces with Laravel, React, and MySQL.',
    details:
      'Completed an internship focusing on production web applications. Developed backend services, optimized database queries with MySQL, built REST APIs tested with Postman, and collaborated on responsive frontend modules using React and Tailwind CSS.',
    icon: 'Briefcase',
    category: 'career',
    technologies: ['Laravel', 'PHP', 'React', 'MySQL', 'REST APIs', 'Postman'],
  },
  {
    year: '2025',
    title: 'Full-Stack Systems & Portfolio Launch',
    description:
      'Built production-grade web applications (PayrollPro, Explore Bali) and launched this portfolio to showcase my work.',
    details:
      'A period of intense hands-on engineering. I built PayrollPro — a production-grade HR, attendance & payroll platform for Indonesian companies with QR attendance, a BPJS/PPh 21 tax engine, a self-service employee portal, and a 262-test suite — and Explore Bali, a travel booking platform. Both projects sharpened my full-stack skills and taught me about authentication, role-based access, and responsive design at scale.',
    technologies: ['Laravel', 'PHP', 'Inertia.js', 'React', 'Tailwind CSS', 'MySQL', 'JavaScript'],
    category: 'project',
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

