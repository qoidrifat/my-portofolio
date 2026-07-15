// =============================================================================
// src/lib/data.js — Single source of truth for portfolio content
// =============================================================================
//
// All section components consume from this file.
// Icons are imported as component references (not JSX) — consumers render
// them via <item.icon className="..." /> for consistency with existing
// patterns in TechStackSection.jsx and ProjectSection.jsx.

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
    imageUrl: null,
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
    imageUrl: null,
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
      'The key product challenge was bringing HR operations into one coherent workflow: employee records, attendance capture, payroll processing, payslip output, approval states, reports, and role-aware dashboard access — all while keeping state consistent across admin, HR, and employee views.',
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

  // ── SuperFood OFD Scraper: Indonesian food delivery data pipeline ──
  {
    id: 8,
    slug: 'superfood-ofd-scraper',
    title: 'SuperFood OFD Scraper — Food Delivery Data Pipeline',
    category: 'Data Engineering / Web Scraping',
    filterCategory: 'Data Engineering',
    accent: 'web',
    year: '2026',
    role: 'Data Engineer & Developer',
    impact: [
      'Anti-bot scraping pipeline for GoFood, GrabFood, and ShopeeFood with Playwright Stealth',
      'Distributed task queue with FastAPI REST API for restaurant, menu, and CSV export endpoints',
      'Time-series menu storage in PostgreSQL with regression tests using captured API payloads',
    ],
    imageUrl: null,
    visual: 'superfood',
    technologies: [
      'Python', 'Playwright', 'FastAPI', 'PostgreSQL',
    ],
    features: [
      'Multi-platform scraping (GoFood, GrabFood, ShopeeFood)',
      'Anti-bot evasion with Playwright Stealth',
      'Distributed task queue for concurrent scraping',
      'REST API: GET /v1/restaurants, /v1/menus, /v1/exports/csv',
      'Time-series menu storage and versioning',
      'Captured JSON payload regression tests',
      'PostgreSQL-backed data persistence',
      'FastAPI-powered async web server',
    ],
    longDescription:
      'SuperFood OFD Scraper is a production-grade web scraping and automation pipeline purpose-built for Indonesian food delivery platforms — GoFood, GrabFood, and ShopeeFood. The system uses Playwright with Stealth plugin to intelligently navigate anti-bot defenses, enabling reliable data collection at scale.\n\nScraped data flows through a distributed task queue into a PostgreSQL database, preserving time-series menu changes for competitive analysis and market research. A FastAPI REST layer exposes structured data through versioned endpoints (/v1/restaurants, /v1/menus, /v1/exports/csv), making it easy to integrate scraped data into analytics dashboards or research pipelines.\n\nThe project includes a comprehensive test suite using captured raw JSON payloads from GrabFood to validate parser accuracy across menu updates and structural changes — ensuring the pipeline stays reliable even as target sites evolve.',
    challenges:
      '1. Anti-Bot Evasion: Indonesian food delivery platforms employ sophisticated anti-bot measures including CAPTCHAs, rate limiting, and dynamic content loading.\n   Solution: Used Playwright with Stealth plugin to mimic real browser behavior, implemented randomized human-like interaction patterns, and built a distributed task queue to manage rate limits across multiple IPs.\n\n2. Platform Structure Variance: GoFood, GrabFood, and ShopeeFood each have vastly different HTML structures and API patterns.\n   Solution: Built a platform adapter pattern — each platform has its own parser module with a common data interface, making it straightforward to add new platforms.\n\n3. Data Consistency: Restaurant menus change frequently, making it hard to track historical data.\n   Solution: Implemented time-series storage with versioned menu snapshots, enabling before/after comparisons and historical trend analysis.',
    githubUrl: 'https://github.com/qoidrifat/superfood-ofd-scraper',
    demoUrl: null,
    featured: false,
    icon: Globe,
    color: 'from-orange-500 to-red-500',
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
