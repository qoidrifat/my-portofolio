import { Brain, Building2, Globe, MapPinned, Wallet, Activity, Sparkles } from 'lucide-react';

// Project + case-study content. Split out of data.js so the app shell
// (Layout, Hero, intro) does not ship ~54 KB of case studies on the LCP path.
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
      'Agent Status is a local-first observability and monitoring platform purpose-built for AI coding agents. It provides real-time visibility into provider health, token consumption, and error patterns.\n\nBuilt with TypeScript and Node.js, the platform features a WebSocket-powered dashboard with interactive Recharts visualizations and responsive layouts. Supports Model Context Protocol (MCP) for automatic multi-provider discovery with local SQLite storage.',
    challenges:
      '1. Real-time Data Architecture: Event-driven WebSocket architecture with batched updates and configurable provider polling intervals.\n2. MCP Integration: Flexible provider abstraction layer normalizing MCP responses into a unified data model.\n3. Dashboard Performance: Recharts with hardware-accelerated transitions and virtual scrolling for error logs.',
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
      'AI-powered facial landmark analysis for personalized style & outfit recommendations from selfies',
      'Laravel 13 backend with Sanctum-protected API and TailwindCSS + AlpineJS frontend',
      'Python FastAPI microservice architecture with MediaPipe FaceLandmarker for real-time inference',
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
      'Selfie upload with instant landmark detection',
      'Laravel Sanctum for secure API authentication',
      'Python FastAPI microservice with MediaPipe integration',
      'Responsive TailwindCSS + AlpineJS frontend',
      'Clean separation between PHP business logic and Python AI pipeline',
      'MySQL production / SQLite local development',
    ],
    longDescription:
      'AUREX is an AI style intelligence platform analyzing 3D facial landmarks and skin tones from selfies for style recommendations. Features a Laravel 13 backend with TailwindCSS and AlpineJS.\n\nAI inference runs via a Python FastAPI microservice powered by Google MediaPipe FaceLandmarker and OpenCV, delivering sub-100ms inference with Sanctum authentication.',
    challenges:
      '1. Microservice Architecture: Defined an OpenAPI specification between Laravel and Python FastAPI with graceful fallbacks.\n2. Landmark Detection: Client-side downscaling with MediaPipe GPU delegate processing for sub-100ms inference.\n3. Skin Tone Robustness: Multi-point sampling across facial landmarks for stable detection under varied lighting.',
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
      'CashFlow is a personal finance app that eliminates manual expense tracking using Vertex AI for receipt scanning and the Gmail API for automated transaction extraction.\n\nConnects to Gmail via OAuth2 to parse Indonesian bank and e-wallet emails (BCA, Mandiri, GoPay, OVO), providing real-time budget tracking and monthly spending reports.',
    challenges:
      '1. Email Parsing: Template regex parser with ML fallback for bank/e-wallet formats.\n2. Vertex AI Integration: Structured prompts with confidence thresholds for receipt OCR.\n3. OAuth2 Security: Token encryption at rest and automatic token refresh handling.',
    githubUrl: 'https://github.com/qoidrifat/cashflow',
    demoUrl: 'https://qoidrifat.github.io/cashflow/',
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
      'PayrollPro is an open-source HR, attendance, and payroll platform for Indonesian companies with BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, and PTKP tax compliance.\n\nBuilt with Laravel 12, Vue 3, Inertia.js 2, and Tailwind CSS 3. Features three attendance capture adapters (manual, signed QR URLs, and Sanctum mobile API with GPS geofencing) backed by 262 PHPUnit tests (568 assertions), DomPDF payslips, and Laravel Pulse monitoring.',
    challenges:
      '1. Payroll Compliance: Dedicated Services layer (payroll, tax, BPJS) with type-safe Enums, Action orchestration, and DomPDF generation.\n2. Device Attendance: Unified attendance model supporting manual forms, signed QR codes, and Sanctum mobile API with GPS geofencing.\n3. Multi-Surface State: Spatie Permission RBAC with isolated self-service employee portal.\n4. Sensitive PII: Field-level encryption at rest, CSP headers, rate limiting, and CI security audits.',
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

