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
import { Brain, Building2, Globe, MapPinned, Wallet, Activity, Sparkles } from 'lucide-react';
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
      { name: 'React',      icon: SiReact,      experience_level: 60, years: 1.5, projectIds: [] },
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
      { name: 'DeepFace',     icon: FaBrain,        experience_level: 60, years: 1.5, projectIds: [1] },
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
      { name: 'React Native', icon: SiReact, experience_level: 25, years: 0.5, projectIds: [] },
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

/** @type {Project[]} */
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

  // ── Agent Status: AI agent observability platform ──
  {
    id: 2,
    slug: 'agent-status',
    title: 'Agent Status — AI Agent Observability Platform',
    category: 'AI Infrastructure / Monitoring',
    filterCategory: 'AI Infrastructure',
    accent: 'ai',
    year: '2026',
    role: 'Developer & Architect',
    impact: [
      'Local-first monitoring for AI coding agents with real-time WebSocket updates',
      'Provider health (latency/uptime), token analytics, and error intelligence dashboards',
      'Interactive Recharts visualizations with animated gauges and responsive layout',
      'MCP (Model Context Protocol) support for automatic model discovery across providers',
    ],
    imageUrl: '/project-agent-status.webp',
    visual: 'agent-status',
    technologies: [
      'TypeScript', 'Node.js', 'SQLite', 'Recharts',
      'WebSocket', 'MCP', 'OpenAI API', 'Anthropic API',
    ],
    features: [
      'Real-time provider health monitoring (latency & uptime)',
      'Token usage analytics and cost tracking',
      'Error intelligence with pattern detection',
      'Interactive gauges and live charts',
      'MCP support for multi-provider model discovery',
      'Local-first architecture with SQLite storage',
      'Dark-mode responsive dashboard',
      'WebSocket-powered live updates',
    ],
    longDescription:
      'Agent Status is a local-first observability and monitoring platform purpose-built for AI coding agents. It provides real-time visibility into provider health, token consumption, and error patterns — helping developers understand exactly how their AI agents are performing.\n\nBuilt with TypeScript and Node.js, the platform features a sophisticated WebSocket-powered dashboard with interactive Recharts visualizations, animated gauges, and responsive layouts. It supports the Model Context Protocol (MCP) for automatic discovery of models from multiple providers (OpenAI, Anthropic, Google, and more), making it a versatile tool for any AI-assisted development workflow.\n\nThe local-first architecture ensures all data stays on-device with SQLite storage, while the real-time WebSocket updates provide instant visibility into agent behavior without polling overhead.',
    challenges:
      '1. Real-time Data Architecture: Designing a WebSocket system that can handle multiple concurrent agent connections without overwhelming the client.\n   Solution: Implemented an efficient event-driven architecture with batched updates and configurable polling intervals per provider.\n\n2. MCP Integration: Supporting the Model Context Protocol required careful schema design to handle varying provider capabilities.\n   Solution: Built a flexible provider abstraction layer that normalizes MCP responses into a unified data model while preserving provider-specific metadata.\n\n3. Interactive Dashboard Performance: Rendering real-time charts with animated transitions without jank.\n   Solution: Used Recharts for declarative chart components with hardware-accelerated CSS transitions, and implemented virtual scrolling for the error log.',
    githubUrl: 'https://github.com/qoidrifat/agent_status',
    demoUrl: null,
    featured: false,
    icon: Activity,
    color: 'from-violet-500 to-cyan-500',
  },

  // ── AUREX: AI-powered style intelligence ──
  {
    id: 3,
    slug: 'aurex',
    title: 'AUREX — AI Style Intelligence',
    category: 'AI-Powered Web Application',
    filterCategory: 'AI Web App',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer',
    impact: [
      'AI-powered facial analysis for personalized style/outfit recommendations from selfies',
      'Laravel 13 backend with Sanctum-protected API and TailwindCSS + AlpineJS frontend',
      'Python FastAPI microservice architecture — swappable for real MediaPipe/OpenCV models',
    ],
    imageUrl: null,
    visual: 'aurex',
    technologies: [
      'Laravel', 'PHP', 'Tailwind CSS', 'AlpineJS',
      'Python', 'FastAPI', 'MySQL', 'SQLite',
    ],
    features: [
      'AI-powered facial feature & skin tone analysis',
      'Personalized outfit and style recommendations',
      'Selfie upload with instant analysis',
      'Laravel Sanctum for secure API authentication',
      'Python FastAPI microservice for AI inference',
      'Responsive TailwindCSS + AlpineJS frontend',
      'Plugin-ready AI model architecture (swap mock <-> real)',
      'MySQL production / SQLite local development',
    ],
    longDescription:
      'AUREX is an AI-powered style intelligence platform that analyzes facial features and skin tones from selfies to deliver personalized style and outfit recommendations. The application blends a robust Laravel 13 backend with a modern TailwindCSS and AlpineJS frontend, creating a seamless user experience from photo upload to style suggestion.\n\nThe AI inference layer runs as a separate Python FastAPI microservice, currently using mock analyses designed for easy replacement with real models like MediaPipe or OpenCV. This plugin-ready architecture means the system can be upgraded to production-grade AI without any changes to the Laravel application code.\n\nBuilt with developer experience in mind, AUREX features Sanctum-protected APIs, MySQL for production deployment, SQLite for local development, and a clean separation between the PHP web layer and the Python AI layer.',
    challenges:
      '1. Microservice Architecture: Designing a clean interface between Laravel (PHP) and Python FastAPI for AI inference required careful API contract design.\n   Solution: Defined a strict OpenAPI specification for the inference endpoint, with versioned requests/responses and graceful fallback when the AI service is unavailable.\n\n2. Mock-to-Real AI Migration: The system needed to work with mock analyses during development but be ready for real models.\n   Solution: Implemented a provider pattern in FastAPI — the inference endpoint delegates to a configurable provider (mock, MediaPipe, OpenCV), making the swap a one-line config change.\n\n3. Skin Tone Analysis Accuracy: Analyzing skin tones from varied lighting conditions is challenging.\n   Solution: Implemented color correction pre-processing and multiple reference points across the face image for more consistent tone detection.',
    githubUrl: 'https://github.com/qoidrifat/aurex',
    demoUrl: null,
    featured: false,
    icon: Sparkles,
    color: 'from-amber-500 to-rose-500',
  },

  {
    id: 7,
    slug: 'cashflow',
    title: 'Project CashFlow — AI-Powered Finance',
    category: 'Personal Finance Management',
    filterCategory: 'Finance',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer',
    impact: [
      'Vertex AI receipt scanning eliminates manual expense entry',
      'Gmail API integration auto-detects bank & e-wallet transactions',
      'Real-time budget insights with monthly spending reports',
    ],
    imageUrl: '/project-cashflow.webp',
    visual: 'cashflow',
    technologies: [
      'React', 'Node.js', 'Vertex AI', 'Gmail API', 'Google Cloud',
      'PostgreSQL', 'Tailwind CSS', 'TypeScript',
    ],
    features: [
      'AI receipt scanner using Vertex AI Vision',
      'Automated email parsing for bank & e-wallet transactions',
      'Real-time budget tracking and insights',
      'Monthly spending reports with category breakdown',
      'Custom spending categories and budgets',
      'Multi-account support',
      'Secure OAuth2 Gmail integration',
      'Responsive finance dashboard',
    ],
    longDescription:
      'CashFlow is a comprehensive personal finance management application that eliminates manual expense tracking. By leveraging Vertex AI for receipt scanning and the Gmail API for automated transaction extraction, CashFlow provides a truly hands-off financial tracking experience.\n\nThe application connects to your Gmail inbox via OAuth2 and intelligently parses transaction emails from Indonesian banks and e-wallet services (BCA, Mandiri, GoPay, OVO, etc.), automatically categorizing each transaction. For physical receipts, simply snap a photo — Vertex AI Vision extracts merchant, amount, date, and item details.\n\nAll transactions are consolidated into a unified dashboard with real-time budget tracking, spending insights, and customizable monthly reports. CashFlow makes it effortless to understand where your money goes without manual data entry.',
    challenges:
      '1. Email Parsing Variability: Transaction emails from different banks and e-wallets have wildly different formats. \n   Solution: Built a flexible template-based parser with regex patterns for each known provider, with a fallback ML classifier for unknown formats.\n\n2. Vertex AI Integration: Setting up Vision API for receipt scanning required careful prompt engineering to get accurate and consistent extraction results. \n   Solution: Used structured prompts with few-shot examples and implemented confidence thresholds with manual review for low-confidence scans.\n\n3. OAuth2 Security: Handling Gmail API access required secure token storage and refresh token management. \n   Solution: Implemented token encryption at rest, automatic refresh handling, and clear user consent screens explaining exactly what data is accessed.',
    githubUrl: '#',
    demoUrl: null,
    featured: false,
    icon: Wallet,
    color: 'from-emerald-500 to-teal-500',
  },

  {
    id: 4,
    slug: 'payrollpro',
    title: 'PayrollPro — HR, Attendance & Payroll Management System',
    subtitle: 'Modern HR & Payroll Platform for Indonesian Companies',
    category: 'Payroll & Employee Attendance Management System',
    filterCategory: 'Payroll',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer & Architect',
    status: 'Production Ready',
    description:
      'An open-source HR, attendance & payroll platform for Indonesian companies — Laravel 12 + Vue 3 + Inertia.js, QR & mobile attendance, BPJS/PPh 21 tax engine, payslip PDFs, self-service employee portal, and a public status page.',
    impact: [
      '262 PHPUnit tests / 568 assertions covering services, policies, auth, attendance, payroll, portal, reports & settings',
      'QR + mobile attendance with GPS geofence and offline sync via a Sanctum-protected API',
      'Indonesian tax engine — BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, PTKP, proration, payslip PDF',
      'Self-service employee portal + public status page + Laravel Pulse monitoring',
    ],
    imageUrl: '/projects/payrollpro/cover.webp',
    technologies: [
      'Laravel 12', 'PHP 8.2+', 'Vue 3', 'Inertia.js 2', 'Tailwind CSS 3', 'Vite 7',
      'ApexCharts', 'Breeze', 'Sanctum', 'Spatie Permission', 'MySQL 8', 'PostgreSQL',
      'SQLite', 'Redis', 'DomPDF', 'Laravel Excel', 'PHPWord', 'PHPUnit 11', 'GitHub Actions',
    ],
    techGroups: [
      {
        label: 'Backend',
        items: ['Laravel 12', 'PHP 8.2+', 'Breeze', 'Sanctum', 'Spatie Permission'],
      },
      {
        label: 'Frontend',
        items: ['Vue 3', 'Inertia.js 2', 'Tailwind CSS 3', 'Vite 7', 'ApexCharts', 'Heroicons'],
      },
      {
        label: 'Database',
        items: ['MySQL 8', 'PostgreSQL / Supabase', 'SQLite', 'Redis'],
      },
      {
        label: 'Export',
        items: ['DomPDF (payslips)', 'Laravel Excel (reports)', 'PHPWord (docx)'],
      },
      {
        label: 'Security',
        items: ['RBAC (Spatie)', 'Encrypted PII', 'CSP Headers', 'Rate Limiting', 'Audit Trails'],
      },
      {
        label: 'Monitoring',
        items: ['Laravel Pulse', 'Sentry', 'Scheduler', 'Queue Workers'],
      },
      {
        label: 'CI/CD',
        items: ['GitHub Actions (ci.yml)', 'security-audit.yml'],
      },
      {
        label: 'Testing',
        items: ['PHPUnit 11', '262 tests', '568 assertions'],
      },
    ],
    features: [
      'Role-based access control — Admin, HR & Employee workspaces via Spatie Permission + Policies',
      'QR attendance with signed URLs — clock-in/out through /scan endpoints',
      'Mobile attendance API — Sanctum-protected status, clock-in/out, offline sync with GPS geofence',
      'Payroll runs — salary components, BPJS, PPh 21, PTKP, proration',
      'Payslip PDF generation with DomPDF',
      'Excel import/export for employees & reports via Laravel Excel',
      'Employee self-service portal — attendance history, payslips, tax info, leave requests',
      'Leave & overtime approval workflow with notifications',
      'Public status page — service status, health API, incidents & maintenance windows',
      'Dashboard analytics — payroll, attendance & employee overviews with ApexCharts',
      'Security hardening — encrypted PII, CSP headers, rate limiting, audit trails',
      'Monitoring — Laravel Pulse dashboards + scheduled maintenance commands',
      'Light & dark mode with a modern responsive UI',
    ],
    metrics: [
      { value: '262', label: 'PHPUnit Tests' },
      { value: '568', label: 'Assertions' },
      { value: '11', label: 'Modules' },
      { value: '3', label: 'User Roles' },
      { value: '4', label: 'Mobile Endpoints' },
      { value: '3', label: 'Export Libraries' },
      { value: '760', label: 'Attendance Records' },
      { value: '8', label: 'Demo Employees' },
    ],
    architecture: {
      summary:
        'PayrollPro is a layered Laravel 12 application — controllers stay as thin HTTP adapters, business rules live in Services, multi-step workflows are orchestrated in Actions, data access goes through Repositories, and domain constants are type-safe Enums. Web (Vue 3 + Inertia.js) and mobile (Sanctum API) clients share one HTTP kernel.',
      lanes: [
        {
          id: 'access',
          label: 'Access Layer',
          nodes: [
            { id: 'web', label: 'Web Browser', sub: 'Vue 3 + Inertia.js', icon: 'browser' },
            { id: 'mobile', label: 'Mobile App', sub: 'Sanctum API · GPS', icon: 'monitor' },
            { id: 'status', label: 'Status Page', sub: 'public · health API', icon: 'globe' },
          ],
        },
        {
          id: 'http',
          label: 'HTTP & Auth',
          nodes: [
            { id: 'kernel', label: 'Laravel 12 Kernel', sub: 'HTTP · queue · scheduler', icon: 'server' },
            { id: 'controllers', label: 'Controllers', sub: 'thin HTTP adapters', icon: 'workflow' },
            { id: 'auth', label: 'Breeze + Sanctum', sub: 'web + mobile auth', icon: 'key' },
          ],
        },
        {
          id: 'core',
          label: 'Core Logic',
          nodes: [
            { id: 'actions', label: 'Actions Layer', sub: 'workflow orchestration', icon: 'calendar' },
            { id: 'services', label: 'Services Layer', sub: 'payroll · tax · BPJS', icon: 'layout' },
            { id: 'contracts', label: 'DTOs + Enums', sub: 'type-safe contracts', icon: 'archive' },
          ],
        },
        {
          id: 'data',
          label: 'Data Access',
          nodes: [
            { id: 'repos', label: 'Repositories', sub: 'data access seams', icon: 'store' },
            { id: 'eloquent', label: 'Eloquent Models', sub: 'factories · scopes', icon: 'database' },
            { id: 'policies', label: 'Policies', sub: 'authorization rules', icon: 'lock' },
          ],
        },
        {
          id: 'security',
          label: 'Security Layer',
          nodes: [
            { id: 'rbac', label: 'Spatie RBAC', sub: 'roles · permissions', icon: 'breaker' },
            { id: 'pii', label: 'Encrypted PII', sub: 'sensitive fields', icon: 'lock' },
            { id: 'csp', label: 'CSP + Rate Limit', sub: 'headers · throttling', icon: 'gauge' },
          ],
        },
        {
          id: 'runtime',
          label: 'Runtime & Storage',
          nodes: [
            { id: 'db', label: 'MySQL / PG / SQLite', sub: 'primary datastore', icon: 'database' },
            { id: 'redis', label: 'Redis', sub: 'queue · cache · session', icon: 'workflow' },
            { id: 'workers', label: 'Queue + Scheduler', sub: 'async · backups', icon: 'calendar' },
          ],
        },
      ],
      foot: [
        { id: 'pulse', label: 'Laravel Pulse', sub: 'server health', icon: 'gauge' },
        { id: 'tests', label: 'PHPUnit ×262', sub: '568 assertions', icon: 'flask' },
        { id: 'ci', label: 'GitHub Actions', sub: 'lint · test · audit', icon: 'workflow' },
      ],
    },
    screenshots: [
      { src: '/projects/payrollpro/dashboard.webp', label: 'Admin Dashboard' },
      { src: '/projects/payrollpro/login.webp', label: 'Authentication' },
      { src: '/projects/payrollpro/employees.webp', label: 'Employee Management' },
      { src: '/projects/payrollpro/employee-detail.webp', label: 'Employee Detail' },
      { src: '/projects/payrollpro/attendance.webp', label: 'Attendance' },
      { src: '/projects/payrollpro/my-qr.webp', label: 'QR Clock-In' },
      { src: '/projects/payrollpro/payroll.webp', label: 'Payroll Processing' },
      { src: '/projects/payrollpro/payroll-detail.webp', label: 'Payroll Detail' },
      { src: '/projects/payrollpro/reports.webp', label: 'Reports' },
      { src: '/projects/payrollpro/portal-dashboard.webp', label: 'Employee Portal' },
      { src: '/projects/payrollpro/portal-attendance.webp', label: 'Portal Attendance' },
      { src: '/projects/payrollpro/portal-payroll.webp', label: 'Portal Payslips' },
      { src: '/projects/payrollpro/portal-tax.webp', label: 'Portal Tax Info' },
      { src: '/projects/payrollpro/settings.webp', label: 'Settings' },
      { src: '/projects/payrollpro/dashboard-dark.webp', label: 'Dark Mode' },
      { src: '/projects/payrollpro/mobile.webp', label: 'Mobile Responsive', portrait: true },
    ],
    docs: [
      { label: 'README', href: 'https://github.com/qoidrifat/payrollpro#readme' },
      { label: 'Mobile API (OpenAPI)', href: 'https://github.com/qoidrifat/payrollpro/blob/main/docs/mobile-api.yaml' },
      { label: 'Engineering Audit', href: 'https://github.com/qoidrifat/payrollpro/blob/main/docs/reports/AUDIT.md' },
      { label: 'Performance Optimization', href: 'https://github.com/qoidrifat/payrollpro/blob/main/docs/reports/PAYROLLPRO_PERFORMANCE_OPTIMIZATION_REPORT.md' },
      { label: 'My QR Feature Report', href: 'https://github.com/qoidrifat/payrollpro/blob/main/docs/reports/MANUAL_ATTENDANCE_MY_QR_FEATURE_REPORT.md' },
      { label: 'Security Fix Report', href: 'https://github.com/qoidrifat/payrollpro/blob/main/docs/reports/SUPABASE_ADVISOR_SECURITY_FIX_REPORT.md' },
    ],
    lessons: [
      {
        title: 'Local-domain complexity is the product',
        detail:
          'BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, PTKP and proration are not add-on features — they are the core engine. Modeling them as a dedicated Services layer with type-safe Enums is what makes the system trustworthy.',
      },
      {
        title: 'Layered architecture earns its keep',
        detail:
          'Keeping controllers as thin HTTP adapters and moving rules into Actions/Services/Repositories made a 262-test suite possible without test doubles fighting the framework.',
      },
      {
        title: 'One attendance model, many adapters',
        detail:
          'Manual entry, QR signed URLs and the mobile API all feed the same attendance pipeline — each surface is an adapter, not a separate data path, so state never drifts.',
      },
      {
        title: 'Security is table stakes for HR data',
        detail:
          'Encrypted sensitive fields, CSP headers, rate limiting and audit trails were designed in from the start rather than bolted on after an audit.',
      },
      {
        title: 'CI catches regressions early',
        detail:
          'A GitHub Actions pipeline running lint, tests, build and a security audit kept the 262-test suite green while the feature surface grew to 11 modules.',
      },
    ],
    roadmap: [
      {
        phase: 'Phase 1',
        title: 'Expand Test Coverage',
        status: 'In Progress',
        tone: 'active',
        detail:
          'Grow beyond the current ≥20% coverage badge while keeping all 262 tests / 568 assertions green — prioritizing payroll proration and tax edge cases.',
      },
      {
        phase: 'Phase 2',
        title: 'Production Deployment Path',
        status: 'Planned',
        tone: 'planned',
        detail:
          'The docker/nginx configuration is already shipped — productionize the Redis queue + scheduler stack and the multi-database (MySQL/PostgreSQL/SQLite) deployment story.',
      },
      {
        phase: 'Phase 3',
        title: 'Supabase / PostgreSQL Hardening',
        status: 'Planned',
        tone: 'planned',
        detail:
          'RLS migrations and rollbacks are already in supabase/ — validate row-level security for multi-tenant HR data and complete the production Postgres path.',
      },
      {
        phase: 'Phase 4',
        title: 'Deeper Analytics & Exports',
        status: 'Planned',
        tone: 'planned',
        detail:
          'Annual PPh 21 reports, richer ApexCharts dashboards, and additional Excel exports — extending the reporting module from monthly to annual tax cycles.',
      },
    ],
    longDescription:
      'PayrollPro is a modern HR, attendance and payroll management system built for Indonesian companies — where payroll means dealing with BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, PTKP, attendance policies, and monthly payroll runs that most small teams still manage in spreadsheets. The platform is the open-source answer to that problem: a complete HR back office combined with a self-service employee portal and a public status page, wrapped in a modern, responsive UI with light & dark mode.\n\nUnder the hood it is a layered Laravel 12 application. Controllers act as thin HTTP adapters, business rules live in a Services layer (payroll, tax, BPJS, geofence), multi-step workflows are orchestrated in an Actions layer, and data access flows through Repositories with type-safe DTOs and Enums. The frontend is Vue 3 + Inertia.js 2 with Tailwind CSS 3 and ApexCharts — one codebase serving admin, HR, and employee experiences. Attendance is captured through three adapters — manual entry, QR signed URLs (/scan/in|out/{employee}), and a Sanctum-protected mobile API with GPS geofencing and offline sync — all feeding a single attendance model.\n\nEngineering rigor is first-class: 262 PHPUnit tests with 568 assertions across services, policies, auth, attendance, payroll, portal, reports, settings, and payslips; GitHub Actions CI running lint, tests, build, and a security audit; Laravel Pulse for monitoring; encrypted sensitive fields with CSP headers, rate limiting, and audit trails; and DomPDF payslip generation plus Laravel Excel exports. The repo ships a full OpenAPI spec for the mobile API, an engineering audit, and a documented capture pipeline with a realistic seeded dataset (8 employees, 5 payroll runs, 760 attendance records).',
    challenges:
      '1. Indonesian Payroll Complexity: BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, PTKP and proration rules make payroll a compliance problem, not a CRUD problem.\n   Solution: A dedicated Services layer (payroll, tax, BPJS) with type-safe Enums, payroll-run orchestration in the Actions layer, and DomPDF payslip generation.\n\n2. Attendance Across Devices: Manual entry, QR kiosks and mobile phones each need a reliable capture path — with GPS geofencing and offline sync for field staff.\n   Solution: One attendance model with three adapters — manual forms, signed QR URLs for clock-in/out, and a Sanctum-protected mobile API (/api/mobile/clock-in|clock-out|sync-offline).\n\n3. Three Distinct User Surfaces: Admin, HR and Employee views must share state while exposing completely different capabilities.\n   Solution: Spatie Permission RBAC plus per-module Laravel Policies, and a self-service portal that deliberately surfaces only an employee\'s own data.\n\n4. Sensitive PII Protection: Employee records contain bank, tax and BPJS identity data.\n   Solution: Encrypted sensitive fields, CSP headers, rate limiting, audit trails, and a documented security-audit workflow in CI.\n\n5. Keeping a Growing Suite Green: 11 modules with 262 tests must stay reliable as features ship.\n   Solution: GitHub Actions CI with lint, tests, build and a security audit — plus Laravel Pulse and scheduled maintenance commands for production visibility.',
        githubUrl: 'https://github.com/qoidrifat/payrollpro',
    demoUrl: null,
    featured: false,
    icon: Building2,
    color: 'from-sky-500 to-emerald-500',
  },
  {
    id: 5,
    slug: 'explore-bali',
    title: 'Explore Bali — Travel & Tour Booking Platform',
    subtitle: 'PHP-Native Bali Travel Portal for Destinations, Tickets & Transport',
    category: 'Travel Booking & Tourism Website',
    filterCategory: 'Travel',
    accent: 'web',
    year: '2026',
    role: 'Full-stack Developer & Architect',
    status: 'Production Ready',
    description:
      'A PHP-native Bali travel booking platform — destination showcase with detail galleries, flight / hotel / bus / car search flows, tiket.com booking deep-links, and visa info. Pure PHP + MySQL, zero framework, shared-hosting ready.',
    impact: [
      'Zero-framework PHP + MySQL architecture — 16+ pages deployable on shared hosting',
      '6 destinations with detail galleries and a 14-table MySQL schema',
      'Flight (Lion Air · Garuda Indonesia), hotel, bus & car search flows with real booking deep-links',
      'Shared navbar + per-page CSS with a fully responsive, no-build-step frontend',
    ],
    imageUrl: '/projects/explore-bali/cover.webp',
    visual: 'travel-booking',
    technologies: [
      'PHP Native', 'MySQL / MariaDB', 'mysqli', 'HTML5',
      'CSS3', 'Vanilla JavaScript', 'Apache',
    ],
    techGroups: [
      {
        label: 'Backend',
        items: ['PHP Native', 'mysqli', 'Prepared Statements'],
      },
      {
        label: 'Frontend',
        items: ['HTML5', 'CSS3', 'Vanilla JavaScript', 'Font Awesome'],
      },
      {
        label: 'Database',
        items: ['MySQL / MariaDB', '14 Tables', 'bali.sql Seed Dump'],
      },
      {
        label: 'Runtime',
        items: ['Apache', 'XAMPP', 'Shared Hosting'],
      },
    ],
    features: [
      'Destination showcase — 6 curated Bali destinations with detail pages',
      'Destination detail pages with multi-image galleries',
      'Flight search (Surabaya ↔ Denpasar) with real operators (Lion Air, Garuda Indonesia)',
      'Hotel booking flow with check-in/check-out, room selection & tiket.com deep-links',
      'Car rental flow with pickup city, dates & tiket.com booking links',
      'Bus ticket search with operator routing',
      'Transport menu hub — flights, cars & buses in one place',
      'Ticket menu hub — bus, hotel & car rental options',
      'Visa information page with the e-Visa application guide',
      'About & contact pages',
      'Shared navbar + per-page CSS architecture',
      'Fully responsive — no build step, no framework',
    ],
    metrics: [
      { value: '16+', label: 'PHP Pages' },
      { value: '14', label: 'MySQL Tables' },
      { value: '6', label: 'Destinations' },
      { value: '10', label: 'Hotels' },
      { value: '4', label: 'Flight Operators' },
      { value: '10', label: 'Rental Cars' },
      { value: '7', label: 'Bus Operators' },
      { value: '0', label: 'Build Steps' },
    ],
    architecture: {
      summary:
        'Explore Bali is a zero-framework PHP + MySQL travel portal. Every module is a plain .php page sharing a single mysqli adapter (connection.php) and a common navbar — no routing layer, no ORM, no build step. Booking search flows query real operator data through prepared statements and hand checkout off to tiket.com deep-links, keeping the app light enough to run on shared hosting.',
      lanes: [
        {
          id: 'access',
          label: 'Access Layer',
          nodes: [
            { id: 'browser', label: 'Web Browser', sub: 'responsive · vanilla JS', icon: 'browser' },
            { id: 'visitor', label: 'Visitor Flow', sub: 'home → detail → booking', icon: 'layout' },
          ],
        },
        {
          id: 'pages',
          label: 'Public Pages',
          nodes: [
            { id: 'dest-grid', label: 'Destination Grid', sub: '6 curated spots', icon: 'globe' },
            { id: 'dest-detail', label: 'Detail Pages', sub: 'multi-image galleries', icon: 'store' },
          ],
        },
        {
          id: 'booking',
          label: 'Booking Modules',
          nodes: [
            { id: 'transport', label: 'Transport Hub', sub: 'flights · cars · buses', icon: 'workflow' },
            { id: 'hotel', label: 'Hotel Booking', sub: 'dates · rooms', icon: 'calendar' },
            { id: 'rental', label: 'Car Rental', sub: 'pickup city · dates', icon: 'archive' },
          ],
        },
        {
          id: 'search',
          label: 'Search & Results',
          nodes: [
            { id: 'forms', label: 'Search Forms', sub: 'GET params', icon: 'server' },
            { id: 'results', label: 'Results Pages', sub: 'hasil.*.php', icon: 'workflow' },
            { id: 'deep', label: 'Booking Deep-links', sub: 'tiket.com checkout', icon: 'globe' },
          ],
        },
        {
          id: 'data',
          label: 'Data Layer',
          nodes: [
            { id: 'conn', label: 'connection.php', sub: 'mysqli adapter', icon: 'database' },
            { id: 'schema', label: 'bali.sql', sub: '14 tables · seed data', icon: 'archive' },
            { id: 'stmt', label: 'Prepared Statements', sub: 'parameterized queries', icon: 'lock' },
          ],
        },
        {
          id: 'runtime',
          label: 'Runtime & Delivery',
          nodes: [
            { id: 'apache', label: 'Apache + PHP', sub: 'XAMPP · shared hosting', icon: 'server' },
            { id: 'css', label: 'Per-page CSS', sub: '16 stylesheets', icon: 'layout' },
            { id: 'assets', label: 'Static Assets', sub: 'images · fonts', icon: 'download' },
          ],
        },
      ],
      foot: [
        { id: 'resp', label: 'Responsive CSS', sub: 'no framework', icon: 'monitor' },
        { id: 'vanilla', label: 'Vanilla JS', sub: 'progressive enhancement', icon: 'gauge' },
        { id: 'open', label: 'Open Source', sub: 'public GitHub repo', icon: 'flask' },
      ],
    },
    screenshots: [
      { src: '/projects/explore-bali/home.webp', label: 'Homepage Hero' },
      { src: '/projects/explore-bali/destinations.webp', label: 'Destinations' },
      { src: '/projects/explore-bali/destination-detail.webp', label: 'Destination Detail' },
      { src: '/projects/explore-bali/transport.webp', label: 'Transport Hub' },
      { src: '/projects/explore-bali/ticket-menu.webp', label: 'Ticket Menu' },
      { src: '/projects/explore-bali/hotel-booking.webp', label: 'Hotel Booking' },
      { src: '/projects/explore-bali/car-rental.webp', label: 'Car Rental' },
      { src: '/projects/explore-bali/flight-results.webp', label: 'Flight Results' },
      { src: '/projects/explore-bali/hotel-results.webp', label: 'Hotel Results' },
      { src: '/projects/explore-bali/bus-results.webp', label: 'Bus Results' },
      { src: '/projects/explore-bali/visa.webp', label: 'Visa Info' },
      { src: '/projects/explore-bali/contact.webp', label: 'Contact' },
      { src: '/projects/explore-bali/about.webp', label: 'About' },
      { src: '/projects/explore-bali/mobile-home.webp', label: 'Mobile Home', portrait: true },
      { src: '/projects/explore-bali/mobile-destinations.webp', label: 'Mobile Destinations', portrait: true },
      { src: '/projects/explore-bali/mobile-tickets.webp', label: 'Mobile Tickets', portrait: true },
    ],
    lessons: [
      {
        title: 'Constraints sharpen decisions',
        detail:
          'With no framework and no build step, structure had to come from convention — one page per module, a shared navbar, and a single database adapter kept the app navigable as it grew to 16+ pages.',
      },
      {
        title: 'Deep-links beat re-implementing payments',
        detail:
          'Booking flows query real operators and hand checkout to tiket.com URLs stored in the schema — delivering genuine booking capability without building a payment stack.',
      },
      {
        title: 'A schema dump is a deployable artifact',
        detail:
          'bali.sql ships the entire app data — 14 tables with seed destinations, hotels, flights, cars and bus operators — so the demo is reproducible on any LAMP stack.',
      },
      {
        title: 'Per-page CSS scales to a point',
        detail:
          '16 hand-written stylesheets worked, but the duplication made the ceiling visible — exactly the pain point that motivates CSS preprocessors and component frameworks.',
      },
      {
        title: 'Prepared statements matter even in raw PHP',
        detail:
          'Multi-table search joins across bookings_hotel, bookings_pesawat and routes_bus used parameterized queries with optional date/room filters — safe and correct without an ORM.',
      },
    ],
    roadmap: [
      {
        phase: 'Phase 1',
        title: 'Booking Confirmation & Invoices',
        status: 'Planned',
        tone: 'planned',
        detail:
          'Persist local booking records and render printable invoice pages instead of only handing off to tiket.com deep-links.',
      },
      {
        phase: 'Phase 2',
        title: 'Authentication & User Dashboard',
        status: 'Planned',
        tone: 'planned',
        detail:
          'Login/register with sessions plus a My Bookings dashboard so visitors can review past reservations.',
      },
      {
        phase: 'Phase 3',
        title: 'Framework Modernization',
        status: 'Planned',
        tone: 'planned',
        detail:
          'Migrate to Laravel with Blade templates, Eloquent models and migrations to replace the per-page CSS and hand-written SQL.',
      },
      {
        phase: 'Phase 4',
        title: 'Real Payment Gateway',
        status: 'Planned',
        tone: 'planned',
        detail:
          'Integrate Midtrans / Xendit to complete purchases in-app, replacing the external deep-link checkout flow.',
      },
    ],
    longDescription:
      'Explore Bali is a PHP-native travel and tour booking platform that guides visitors through Bali\'s destinations, transport options and ticket flows without a single framework dependency. Six curated destinations — Kuta Beach, Tanah Lot, Nusa Penida, Mount Batur, Pandawa Beach and Garuda Wisnu Kencana — are presented through a destination grid with rich detail pages and multi-image galleries, all served by a plain PHP + MySQL backend.\n\nOn the product side, the site is organized as a set of booking journeys. A transport hub centralizes flight, car and bus search; a ticket menu surfaces bus tickets, hotel booking and car rental; and each flow submits a search form to a hasil.* results page that queries real operator data — Lion Air and Garuda Indonesia flights, hotels across Surabaya and Bali, PO bus fleets and rental cars — then hands the final checkout to tiket.com deep-links stored in the schema. A visa information page walks foreign visitors through the Indonesian e-Visa application steps, and about/contact pages complete the public site.\n\nEngineering is deliberately constraint-driven: zero framework, zero build step, shared-hosting ready. Every module is a plain .php page sharing one mysqli adapter and a common navbar; data lives in a 14-table MySQL schema shipped as a bali.sql dump with realistic seed records; multi-table search joins use prepared statements with optional date and room filters; and 16 hand-written stylesheets deliver a responsive experience. The entire application is reproducible on any LAMP stack with a single database import.',
    challenges:
      '1. Zero-Framework Constraint: Building a multi-page travel site without Laravel, Composer or a build step requires strong conventions to stay maintainable.\n   Solution: One page per module with a shared navbar, a single mysqli adapter (connection.php) and per-page stylesheets kept the 16+ page codebase navigable.\n\n2. Real Booking Data Without Payments: The app cannot process real payments, yet search flows must feel genuine.\n   Solution: Prepared-statement queries return real operators (Lion Air, Garuda Indonesia, PO bus fleets) and hand checkout to tiket.com deep-links stored in the schema.\n\n3. Multi-Table Search Joins: Flight, hotel and bus results each need joined queries with date and room filters.\n   Solution: Parameterized SQL joining pesawat + bookings_pesawat, hotel + bookings_hotel and buses + routes_bus with optional return-date and passenger filters.\n\n4. Schema & Seed Management: A working demo needs realistic, reproducible data.\n   Solution: bali.sql ships the full dump — 6 destinations, 10 hotels, 4 flights, 10 cars and 7 bus operators across 14 tables.\n\n5. Responsive Without a Framework: Consistent mobile UX with raw CSS.\n   Solution: Hand-written media queries per page and a shared navbar, with zero build tooling to ship.',
    githubUrl: 'https://github.com/qoidrifat/explore-bali',
    demoUrl: null,
    featured: false,
    icon: MapPinned,
    color: 'from-cyan-500 to-blue-500',
  },

  // ── SuperFood OFD Scraper: enterprise data acquisition platform ──
  {
    id: 8,
    slug: 'superfood-ofd-scraper',
    title: 'SuperFood OFD Scraper — Enterprise Data Acquisition Platform',
    subtitle: 'Enterprise OFD Data Platform for GoFood · GrabFood · ShopeeFood',
    category: 'Data Engineering / Web Scraping',
    filterCategory: 'Data Engineering',
    accent: 'web',
    year: '2026',
    role: 'Data Engineer & Platform Architect',
    status: 'Production Ready',
    description:
      'An enterprise-grade data acquisition platform for Indonesian online food delivery — four-tier scraping strategy, merchant portal integration, distributed task queues, REST API, and a modern analytics dashboard.',
    impact: [
      'Four-tier acquisition strategy — merchant portal lane delivers 95%+ reliability with a clean legal posture',
      '150 unit tests across 13 modules covering parser, vault, circuit breaker, merchant API, and archive layers',
      'Production-ready merchant connectors for GoBiz, GrabMerchant, and Shopee Seller Center',
      'Real-world validation: 128 merchants, 192 menu items, and 124 promotions captured from GrabFood Jakarta',
    ],
    imageUrl: '/projects/superfood/cover.webp',
    visual: 'superfood',
    technologies: [
      'Python 3.11', 'FastAPI', 'Playwright', 'Playwright Stealth', 'httpx', 'Pydantic v2',
      'SQLAlchemy 2', 'Alembic', 'PostgreSQL 16', 'Redis', 'Celery', 'Airflow',
      'Svelte', 'Chart.js', 'Vite', 'Tailwind CSS', 'Docker', 'GitHub Actions',
      'Prometheus', 'Grafana', 'pytest', 'ruff', 'mypy', 'Fernet', 'slowapi',
    ],
    techGroups: [
      {
        label: 'Backend',
        items: ['Python 3.11', 'FastAPI', 'SQLAlchemy 2', 'Pydantic v2', 'Alembic', 'httpx', 'typer'],
      },
      {
        label: 'Automation',
        items: ['Playwright', 'Playwright Stealth', 'Celery', 'Redis', 'Airflow', 'tenacity', 'fake-useragent'],
      },
      {
        label: 'Frontend',
        items: ['Svelte', 'Chart.js', 'Vite', 'Tailwind CSS'],
      },
      {
        label: 'Database',
        items: ['PostgreSQL 16', 'Redis', 'S3 Raw Archive'],
      },
      {
        label: 'Security',
        items: ['Fernet Vault', 'TOTP (2FA)', 'slowapi', 'API-Key Auth'],
      },
      {
        label: 'Monitoring',
        items: ['Prometheus', 'Grafana', 'loguru'],
      },
      {
        label: 'Testing & QA',
        items: ['pytest', 'pytest-asyncio', 'respx', 'ruff', 'mypy'],
      },
      {
        label: 'DevOps',
        items: ['Docker', 'Docker Compose', 'GitHub Actions'],
      },
    ],
    features: [
      'Four-tier acquisition strategy — public → mobile → merchant portal → partner API',
      'Playwright StealthBrowser with 7 anti-bot layers (proxy, UA, fingerprint, jitter, backoff, breaker)',
      'Merchant portal integration — GoBiz, GrabMerchant, and Shopee Seller Center connectors',
      'Fernet-encrypted credential vault with TOTP (2FA) seed management',
      'Redis + Celery distributed task queue with Flower monitoring (or Airflow DAG)',
      'FastAPI REST API with API-key auth + slowapi rate limiting',
      'Svelte analytics dashboard with Chart.js panels and platform status matrix',
      'Time-series menu snapshots in PostgreSQL 16 with immutable rows',
      'JSON/CSV streaming exports + S3 raw payload archive for replayable parsing',
      'Prometheus /metrics + pre-built Grafana dashboard with alerting',
      'Docker Compose stack — API, worker ×4, beat, and Flower',
      'GitHub Actions CI gate — ruff lint + full unit test suite',
    ],
    metrics: [
      { value: '4', label: 'Acquisition Tiers' },
      { value: '3', label: 'Supported Platforms' },
      { value: '3', label: 'Merchant Connectors' },
      { value: '150', label: 'Unit Tests' },
      { value: '13', label: 'Test Modules' },
      { value: '8+', label: 'REST Endpoints' },
      { value: '5', label: 'Cities Monitored' },
      { value: '7', label: 'Anti-Bot Layers' },
    ],
    architecture: {
      summary:
        'SuperFood is built as a pipeline of decoupled stages — each with a single responsibility and a versioned contract between them. Browser-heavy discovery runs separately from HTTP-only detail scraping so the cheap parts scale horizontally.',
      lanes: [
        {
          id: 'access',
          label: 'Access Layer',
          nodes: [
            { id: 'dashboard', label: 'Svelte Dashboard', sub: 'Analytics UI', icon: 'layout' },
            { id: 'cli', label: 'Typer CLI', sub: 'run-once operator', icon: 'terminal' },
          ],
        },
        {
          id: 'api',
          label: 'API & Scheduler',
          nodes: [
            { id: 'fastapi', label: 'FastAPI', sub: 'REST · slowapi · API-key', icon: 'server' },
            { id: 'celery', label: 'Celery + Redis', sub: 'worker/beat · Flower', icon: 'workflow' },
            { id: 'airflow', label: 'Airflow DAG', sub: 'daily · 5 cities', icon: 'calendar' },
          ],
        },
        {
          id: 'engine',
          label: 'Core Engine',
          nodes: [
            { id: 'browser', label: 'StealthBrowser', sub: 'Playwright + stealth', icon: 'browser' },
            { id: 'breaker', label: 'Circuit Breaker', sub: 'per-platform failover', icon: 'breaker' },
            { id: 'proxy', label: 'ProxyPool', sub: 'ID exits · rotation', icon: 'globe' },
          ],
        },
        {
          id: 'scrapers',
          label: 'Scrapers & Connectors',
          nodes: [
            { id: 'tier1', label: 'Tier 1 Public Scrapers', sub: 'GoFood · GrabFood · ShopeeFood', icon: 'bug' },
            { id: 'tier3', label: 'Tier 3 Merchant Connectors', sub: 'GoBiz · GrabMerchant · Shopee', icon: 'store' },
          ],
        },
        {
          id: 'security',
          label: 'Auth & Vault',
          nodes: [
            { id: 'auth', label: 'Merchant Authenticators', sub: 'session refresh', icon: 'key' },
            { id: 'vault', label: 'Fernet Vault', sub: 'encrypted · TOTP', icon: 'lock' },
          ],
        },
        {
          id: 'storage',
          label: 'Storage & Delivery',
          nodes: [
            { id: 'pg', label: 'PostgreSQL 16', sub: 'time-series menus', icon: 'database' },
            { id: 's3', label: 'S3 Raw Archive', sub: 'replayable payloads', icon: 'archive' },
            { id: 'export', label: 'JSON/CSV Exports', sub: 'streaming API', icon: 'download' },
          ],
        },
      ],
      foot: [
        { id: 'prom', label: 'Prometheus', sub: '/metrics', icon: 'gauge' },
        { id: 'grafana', label: 'Grafana', sub: 'dashboards · alerts', icon: 'monitor' },
        { id: 'tests', label: 'pytest ×150', sub: 'ruff · mypy · CI', icon: 'flask' },
      ],
    },
    tiers: [
      {
        tier: 'Tier 1',
        name: 'Public Scraping + Residential Proxy',
        reliability: '60–80%',
        legal: 'Grey',
        status: 'Implemented',
        detail: 'Stealth browser automation with 7 anti-bot layers for bootstrap data and non-customer restaurants.',
      },
      {
        tier: 'Tier 2',
        name: 'Mobile-App Reverse Engineering',
        reliability: '70–90%',
        legal: 'Grey',
        status: 'Recipe',
        detail: 'mitmproxy + Frida recipe documented for ShopeeFood (web frontend decommissioned) and WAF-heavy fallbacks.',
      },
      {
        tier: 'Tier 3',
        name: 'Merchant Portal Integration',
        reliability: '95%+',
        legal: 'Clean',
        status: 'Production Ready',
        recommended: true,
        detail: 'Opt-in merchants connect GoBiz / GrabMerchant / Shopee Seller — ~50 fields per restaurant, no anti-bot war.',
      },
      {
        tier: 'Tier 4',
        name: 'Partner / Open Platform API',
        reliability: '99%+',
        legal: 'Clean',
        status: 'BD Roadmap',
        detail: 'Official partner programs (Grab, Gojek, Shopee) as the long-term sanctioned ceiling.',
      },
    ],
    platforms: [
      {
        name: 'GrabFood',
        public: 'Requires residential proxy',
        publicStatus: 'warning',
        merchant: 'Production Ready',
        lane: 'Tier 3',
      },
      {
        name: 'GoFood',
        public: 'Blocked by WAF',
        publicStatus: 'blocked',
        merchant: 'Production Ready',
        lane: 'Tier 3',
      },
      {
        name: 'ShopeeFood',
        public: 'Web decommissioned',
        publicStatus: 'blocked',
        merchant: 'Production Ready',
        lane: 'Tier 3',
      },
    ],
    screenshots: [
      { src: '/projects/superfood/landing.webp', label: 'Landing Page' },
      { src: '/projects/superfood/dashboard.webp', label: 'Analytics Dashboard' },
      { src: '/projects/superfood/analytics.webp', label: 'Analytics Charts' },
      { src: '/projects/superfood/restaurants.webp', label: 'Restaurants Data Browser' },
      { src: '/projects/superfood/results.webp', label: 'Results Table' },
      { src: '/projects/superfood/merchant.webp', label: 'Merchant Portal' },
      { src: '/projects/superfood/mobile.webp', label: 'Mobile Responsive', portrait: true },
    ],
    docs: [
      { label: 'README', href: 'https://github.com/qoidrifat/superfood-ofd-scraper#readme' },
      { label: 'Architecture', href: 'https://github.com/qoidrifat/superfood-ofd-scraper/blob/main/docs/architecture.md' },
      { label: 'Strategy & Anti-Bot', href: 'https://github.com/qoidrifat/superfood-ofd-scraper/blob/main/docs/strategy.md' },
      { label: 'Runbook', href: 'https://github.com/qoidrifat/superfood-ofd-scraper/blob/main/docs/runbook.md' },
      { label: 'Getting Started', href: 'https://github.com/qoidrifat/superfood-ofd-scraper/blob/main/docs/getting-started.md' },
      { label: 'Legal & Ethics', href: 'https://github.com/qoidrifat/superfood-ofd-scraper/blob/main/docs/legal-and-ethics.md' },
    ],
    lessons: [
      {
        title: 'The clean lane is also the reliable lane',
        detail:
          'Tier 3 merchant portals deliver 95%+ reliability with ~50 fields per restaurant versus 60–80% and ~8 fields from public scraping — legal posture and data quality moved in the same direction.',
      },
      {
        title: 'WAFs change architectures, not just configs',
        detail:
          'Tencent EdgeOne + Akamai on GoFood and the ShopeeFood web decommission meant stealth tuning was never going to be enough — the four-tier acquisition strategy was the real fix.',
      },
      {
        title: 'Commit real payloads, not just parsers',
        detail:
          'Real GrabFood capture fixtures (316 KB search + 2.4 MB merchant) power parser regression tests, catching schema drift before it silently breaks a run.',
      },
      {
        title: 'Plan the ceiling while shipping the floor',
        detail:
          'Tier 4 partner APIs carry 4–16 week BD lead times. Starting those conversations while Tier 3 scales is what buys negotiating leverage later.',
      },
      {
        title: 'Never build on a decommissioned surface',
        detail:
          'shopeefood.co.id now resolves to NXDOMAIN. The mobile-app recipe exists as a fallback lane, but the durable answer was always the merchant connector.',
      },
    ],
    roadmap: [
      {
        phase: 'Phase 1',
        title: 'Tier 3 Merchant Portal — Scale-Up',
        status: 'In Progress',
        tone: 'active',
        detail:
          'Grow Tier 3 coverage past 100 opted-in restaurants and keep shipping the self-serve onboarding flow — this is what creates negotiating leverage for Tier 4.',
      },
      {
        phase: 'Phase 2',
        title: 'Tier 2 Mobile Reverse-Engineering',
        status: 'Recipe → Implement',
        tone: 'planned',
        detail:
          'Recipe documented in docs/strategy.md. Production answer: a dedicated ID-region VM with a physical device USB-tunneled via usbipd; treat captured API specs as committed artifacts, not runtime dependencies.',
      },
      {
        phase: 'Phase 3',
        title: 'Tier 4 Partner / Open Platform API',
        status: 'BD Roadmap',
        tone: 'planned',
        detail:
          'Grab Partner Insights API (6–12 wk lead), Gojek Partner / GoBiz Open (8–16 wk), Shopee Open Platform (4–8 wk). Start BD conversations in parallel with Tier 3 shipping.',
      },
      {
        phase: 'Phase 4',
        title: 'Tier 1 Anti-Bot Hardening',
        status: 'Ongoing',
        tone: 'active',
        detail:
          'Patchright / undetected-chromedriver, TLS fingerprint spoofing (curl-impersonate), CAPTCHA fallback (2captcha / Capsolver), and a residential proxy upgrade (Bright Data / Smartproxy / Oxylabs ID exits).',
      },
    ],
    longDescription:
      'SuperFood OFD Scraper is an enterprise-grade data acquisition platform purpose-built for Indonesian online food delivery — GoFood, GrabFood, and ShopeeFood. It is a complete data platform, not just a scraper: a four-tier acquisition strategy, distributed task queues, time-series storage, a versioned REST API, and a modern analytics dashboard.\n\nThe core innovation is the four-tier acquisition strategy. Tier 1 uses a Playwright StealthBrowser with seven anti-bot layers — residential proxy rotation, user-agent rotation, fingerprint randomization, stealth init scripts, jittered human-like delays, exponential backoff, and a per-platform circuit breaker. Tier 2 documents a mobile reverse-engineering recipe for decommissioned or WAF-blocked surfaces. Tier 3 — the recommended production lane — integrates the official merchant portals (GoBiz, GrabMerchant, Shopee Seller Center) where opted-in merchants share their own dashboard credentials, achieving 95%+ reliability with a clean legal posture and roughly 50 fields per restaurant. Tier 4 outlines partner / open-platform APIs as the long-term sanctioned ceiling.\n\nOn the product side, a Redis + Celery task queue (or Airflow DAG) orchestrates discovery, detail, and export jobs across five Indonesian cities. Parsers are Pydantic v2 DTOs — the single versioned contract between scrape and persist. Menus are stored as immutable time-series snapshots in PostgreSQL 16, with raw payloads archived to S3 so every parse is replayable. A FastAPI layer exposes /v1/restaurants, /v1/menus, /v1/promotions, and streaming JSON/CSV exports behind API-key auth and slowapi rate limiting, all surfaced by a Svelte dashboard with Chart.js analytics, a merchant onboarding portal with TOTP 2FA, and Prometheus + Grafana observability.\n\nEngineering rigor is a first-class concern: 150 unit tests across 13 modules, real GrabFood capture fixtures committed for parser regression, ruff + mypy in CI, a four-migration Alembic schema, Docker Compose with four worker replicas, and a full documentation set covering architecture, runbook, strategy, and legal-and-ethics. The pipeline was validated against live GrabFood Jakarta data — 128 merchants, 192 menu items, and 124 promotions captured in a single run.',
    challenges:
      '1. GoFood WAF Hardening: GoFood is protected by Tencent EdgeOne + Akamai, making public scraping unreliable and risky.\n   Solution: Shifted the production lane to Tier 3 merchant portal integration — authenticated GoBiz traffic is treated as first-class, with zero anti-bot war and a clean ToS posture.\n\n2. ShopeeFood Web Decommissioning: shopeefood.co.id now resolves to NXDOMAIN — public scraping is simply impossible.\n   Solution: Documented a Tier 2 mobile reverse-engineering recipe (mitmproxy + Frida + jadx) while delivering the data through the Shopee Seller Center merchant connector instead.\n\n3. IP Rate-Limiting & TLS Fingerprinting: Datacenter IPs get 429s and Python-default TLS is detectable by Akamai/Cloudflare-style WAFs.\n   Solution: Residential proxy pool (Bright Data / Smartproxy / Oxylabs ID exits), playwright-stealth patches, and a jittered 1.5–4.5s delay budget with tenacity exponential backoff.\n\n4. Parser Drift on Live Sites: Selectors and payload schemas change without notice, silently breaking pipelines.\n   Solution: Committed real captured payloads as test fixtures (316 KB search + 2.4 MB merchant), a Pydantic DTO contract, and schema-drift alerting when validation failures exceed 1% of a run.\n\n5. Legal & Ethics: Public scraping violates platform ToS, and Indonesian law (UU ITE, UU PDP) restricts unauthorized access and personal data.\n   Solution: Merchant opt-in first, partner-API roadmap, no reviewer PII stored, ID-only geo-restriction, and a documented legal-and-ethics review in the repo.',
    githubUrl: 'https://github.com/qoidrifat/superfood-ofd-scraper',
    demoUrl: null,
    featured: false,
    icon: Globe,
    color: 'from-orange-500 to-red-500',
  },

  {
    id: 6,
    slug: 'qoid-ra-psd',
    title: 'Next Project — Coming Soon',
    category: 'Upcoming Project',
    filterCategory: 'Upcoming',
    accent: 'web',
    year: '2026',
    role: 'Currently Under Development',
    impact: [
      'A new case study will be published soon',
      'This portfolio is continuously evolving',
    ],
    imageUrl: null,
    technologies: [],
    features: [],
    longDescription:
      'This portfolio is continuously evolving. A brand new case study featuring cutting-edge technology and novel solutions is currently under development. Check back soon for the full story, including the challenges, architecture decisions, and key results.',
    challenges:
      'Stay tuned — the full case study will be published once development is complete.',
    githubUrl: '#',
    demoUrl: null,
    featured: false,
    isPlaceholder: true,
    icon: Sparkles,
    color: 'from-violet-500 to-fuchsia-500',
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
      'A year of intense hands-on development. I built PayrollPro — a production-grade HR, attendance & payroll platform for Indonesian companies with QR attendance, a BPJS/PPh 21 tax engine, a self-service employee portal, and a 262-test suite — and Explore Bali, a travel booking platform. Both projects sharpened my full-stack skills and taught me about authentication, role-based access, and responsive design at scale. This portfolio itself is a React + Vite project with AI-powered features.',
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
