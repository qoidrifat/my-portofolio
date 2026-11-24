import { motion } from 'framer-motion';
import { MASCOT_EXPRESSIONS } from './mascot.constants';

const cheerPose = {
  right: { y: [-20, -28, -20], rotate: [-38, -52, -38], transition: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } },
  left: { y: [-20, -28, -20], rotate: [38, 52, 38], transition: { duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: 0.08 } },
};
const happyPose = {
  right: { rotate: [-12, 12, -12], y: [-2, 2, -2], transition: { duration: 0.6, repeat: Infinity } },
  left: { rotate: [12, -12, 12], y: [2, -2, 2], transition: { duration: 0.6, repeat: Infinity } },
};

const ARM_POSES = {
  [MASCOT_EXPRESSIONS.GREETING]: {
    right: { y: [0, -26, -18, -28, 0], rotate: [0, -42, -16, -44, 0], transition: { duration: 1.8, repeat: Infinity } },
    left: { y: -3, rotate: 6, transition: { duration: 0.3 } },
  },
  [MASCOT_EXPRESSIONS.CELEBRATING]: cheerPose,
  [MASCOT_EXPRESSIONS.EXCITED]: cheerPose,
  [MASCOT_EXPRESSIONS.HAPPY]: happyPose,
  [MASCOT_EXPRESSIONS.CURIOUS]: { right: { y: 0, rotate: 0 }, left: { y: -16, x: 4, rotate: 26, transition: { duration: 0.3 } } },
  [MASCOT_EXPRESSIONS.THINKING]: { right: { y: 0, rotate: 0 }, left: { y: -14, x: 3, rotate: 20, transition: { duration: 0.3 } } },
  [MASCOT_EXPRESSIONS.SURPRISED]: { right: { y: -6, rotate: -18, transition: { duration: 0.2 } }, left: { y: -6, rotate: 18, transition: { duration: 0.2 } } },
  [MASCOT_EXPRESSIONS.PLAYFUL]: { right: { y: 0, rotate: 0 }, left: { y: -12, rotate: 20, transition: { duration: 0.4 } } },
};

/**
 * MascotCharacter — Cubie-inspired 3D Volumetric Digital Companion.
 */
export default function MascotCharacter({
  expression = MASCOT_EXPRESSIONS.NEUTRAL,
  isBlinking = false,
  isReduced = false,
  className = '',
  size = 220,
  lookX,
  lookY,
  headTilt,
}) {
  const isHappy = expression === MASCOT_EXPRESSIONS.HAPPY || expression === MASCOT_EXPRESSIONS.GREETING;
  const isCelebrating = expression === MASCOT_EXPRESSIONS.CELEBRATING || expression === MASCOT_EXPRESSIONS.EXCITED;
  const isThinking = expression === MASCOT_EXPRESSIONS.THINKING;
  const isCurious = expression === MASCOT_EXPRESSIONS.CURIOUS;
  const isSurprised = expression === MASCOT_EXPRESSIONS.SURPRISED;
  const isPlayful = expression === MASCOT_EXPRESSIONS.PLAYFUL;
  const isSleepy = expression === MASCOT_EXPRESSIONS.SLEEPY;
  const isGuide = expression === MASCOT_EXPRESSIONS.GUIDE;

  const bL1 = isCurious ? 68 : isSurprised ? 66 : isThinking ? 75 : 73;
  const bL2 = isCurious ? 71 : isSurprised ? 67 : isThinking ? 71 : 73;
  const bR1 = isCurious ? 75 : isSurprised ? 67 : isThinking ? 71 : 73;
  const bR2 = isCurious ? 77 : isSurprised ? 66 : isThinking ? 75 : 73;

  const gazeX = isThinking ? 3.5 : isCurious ? 3 : isGuide ? 4 : 0;
  const gazeY = isThinking ? -3.5 : isCurious ? -1 : isGuide ? 1 : isSleepy ? 2 : 0;
  const blinkScaleY = isReduced ? 1 : isBlinking ? 0.08 : isSleepy ? 0.45 : 1;

  const bodyRotation = isReduced ? 0 : isCurious ? [0, 5, 4] : isThinking ? -3 : isPlayful ? [-2.5, 2.5, -2.5] : isHappy ? [-1.5, 1.5, -1.5] : isCelebrating ? [-3, 3, -3] : 0;
  const bodyY = isReduced ? 0 : isCelebrating ? [-9, 0, -9] : isSurprised ? -5 : isHappy ? [-4, 0, -4] : isCurious ? -2 : isSleepy ? [0, 2.5, 0] : 0;
  const bodyTrans = isReduced ? { duration: 0 } : isHappy || isCelebrating || isPlayful ? { duration: 0.65, repeat: Infinity, ease: 'easeInOut' } : isSleepy ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 240, damping: 20 };

  const poses = ARM_POSES[expression] || {};
  const rightArm = isReduced ? {} : poses.right || { y: 0, x: 0, rotate: 0 };
  const leftArm = isReduced ? {} : poses.left || { y: 0, x: 0, rotate: 0 };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_16px_36px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <linearGradient id="cHelm" x1="120" y1="46" x2="120" y2="126" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3f3f46" /><stop offset="35%" stopColor="#27272a" /><stop offset="85%" stopColor="#18181b" /><stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <radialGradient id="cBody" cx="120" cy="155" r="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3f3f46" /><stop offset="55%" stopColor="#27272a" /><stop offset="90%" stopColor="#18181b" /><stop offset="100%" stopColor="#09090b" />
          </radialGradient>
          <linearGradient id="cVisor" x1="120" y1="60" x2="120" y2="114" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0c0a09" /><stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <linearGradient id="qTail" x1="140" y1="170" x2="210" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--accent-web))" stopOpacity="0.85" /><stop offset="65%" stopColor="hsl(var(--accent-ai))" stopOpacity="0.95" /><stop offset="100%" stopColor="hsl(var(--accent-web))" stopOpacity="0.4" />
          </linearGradient>
          <filter id="qGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="qShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <radialGradient id="qAura" cx="120" cy="120" r="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--accent-web))" stopOpacity="0.18" /><stop offset="65%" stopColor="hsl(var(--accent-ai))" stopOpacity="0.06" /><stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="120" cy="120" r="95" fill="url(#qAura)" />

        {/* ── 3D Torso Pod ── */}
        <motion.g animate={{ rotate: bodyRotation, y: bodyY }} transition={bodyTrans} style={{ transformOrigin: '120px 175px' }}>
          <ellipse cx="120" cy="204" rx="22" ry="5" fill="hsl(var(--accent-web))" opacity="0.35" filter="url(#qGlow)" />
          <motion.path
            d="M 136 178 C 154 188, 175 200, 198 195 C 208 193, 210 182, 199 177 C 185 170, 162 166, 146 165"
            stroke="url(#qTail)" strokeWidth="7" strokeLinecap="round" fill="none" style={{ transformOrigin: '146px 165px' }}
            animate={isReduced ? {} : { rotate: [0, 4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <path d="M 88 142 C 88 132, 152 132, 152 142 C 158 170, 154 202, 120 202 C 86 202, 82 170, 88 142 Z" fill="url(#cBody)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
          <path d="M 94 140 C 104 135, 136 135, 146 140" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M 86 168 C 100 174, 140 174, 154 168" stroke="hsl(var(--accent-web))" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#qGlow)" />

          <motion.g animate={leftArm} style={{ transformOrigin: '72px 146px' }}>
            <path d="M 68 138 C 60 144, 52 158, 54 170 C 55 174, 60 176, 64 172 C 69 166, 73 154, 73 144 Z" fill="url(#cHelm)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            <circle cx="60" cy="166" r="2.8" fill="hsl(var(--accent-web))" filter="url(#qGlow)" />
          </motion.g>

          <motion.g animate={rightArm} style={{ transformOrigin: '168px 146px' }}>
            <path d="M 172 138 C 180 144, 188 158, 186 170 C 185 174, 180 176, 176 172 C 171 166, 167 154, 167 144 Z" fill="url(#cHelm)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            <circle cx="180" cy="166" r="2.8" fill="hsl(var(--accent-web))" filter="url(#qGlow)" />
          </motion.g>

          <ellipse cx="120" cy="140" rx="30" ry="6" fill="#000" opacity="0.65" filter="url(#qShadow)" />
        </motion.g>

        {/* ── 3D Floating Squircle Head ── */}
        <motion.g
          style={{ transformOrigin: '120px 92px', rotate: headTilt || 0 }}
          animate={isReduced ? {} : { y: isHappy || isCelebrating ? [-4, 2, -4] : [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g>
            <line x1="120" y1="52" x2="120" y2="34" stroke="hsl(var(--accent-ai))" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8" />
            <motion.ellipse
              cx="120" cy="32" rx="6" ry="4" fill="hsl(var(--accent-ai))" filter="url(#qGlow)"
              animate={isReduced ? {} : isThinking ? { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] } : { scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: isThinking ? 0.9 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </g>

          {/* Ear dials */}
          <rect x="66" y="74" width="7" height="26" rx="3.5" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <rect x="167" y="74" width="7" height="26" rx="3.5" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* Outer Squircle Helmet */}
          <rect x="70" y="52" width="100" height="76" rx="26" fill="url(#cHelm)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
          <path d="M 84 56 Q 120 50 156 56" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Inset Screen Bezel & Curved Glass Visor */}
          <rect x="77" y="59" width="86" height="62" rx="20" fill="#09090b" stroke="#000" strokeWidth="1.5" />
          <rect x="81" y="63" width="78" height="54" rx="16" fill="url(#cVisor)" stroke="hsl(var(--accent-web))" strokeWidth="1.2" strokeOpacity="0.45" />
          <path d="M 87 67 Q 120 62 153 67" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Eyebrows */}
          <motion.line x1="93" y1={bL1} x2="107" y2={bL2} stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round" animate={{ y1: bL1, y2: bL2 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} />
          <motion.line x1="133" y1={bR1} x2="147" y2={bR2} stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round" animate={{ y1: bR1, y2: bR2 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} />

          {/* Eyes with Parallax Gaze */}
          <motion.g style={{ x: lookX || 0, y: lookY || 0 }}>
            <motion.g animate={{ x: gazeX, y: gazeY }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              {isHappy ? (
                <path d="M 94 90 C 96 81, 106 81, 108 90 M 132 90 C 134 81, 144 81, 146 90" stroke="hsl(var(--accent-web))" strokeWidth="3.6" strokeLinecap="round" fill="none" filter="url(#qGlow)" />
              ) : isCelebrating ? (
                <g fill="hsl(var(--accent-web))" filter="url(#qGlow)">
                  <circle cx="101" cy="88" r="7.5" /><circle cx="103" cy="85" r="2.5" fill="#fff" />
                  <circle cx="139" cy="88" r="7.5" /><circle cx="141" cy="85" r="2.5" fill="#fff" />
                </g>
              ) : isPlayful ? (
                <>
                  <path d="M 94 90 Q 101 94 108 90" stroke="hsl(var(--accent-web))" strokeWidth="3.2" strokeLinecap="round" fill="none" filter="url(#qGlow)" />
                  <ellipse cx="139" cy="89" rx="7.5" ry="9" fill="hsl(var(--accent-web))" filter="url(#qGlow)" />
                  <circle cx="141" cy="86" r="2.4" fill="#fff" />
                </>
              ) : isSleepy ? (
                <path d="M 94 89 Q 101 93 108 89 M 132 89 Q 139 93 146 89" stroke="hsl(var(--accent-web))" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#qGlow)" />
              ) : (
                <motion.g animate={{ scaleY: blinkScaleY }} style={{ transformOrigin: '120px 89px' }}>
                  <ellipse cx="101" cy="89" rx={isCurious ? 8 : isSurprised ? 8.5 : 6.5} ry={isCurious ? 10 : isSurprised ? 10 : 8.5} fill="hsl(var(--accent-web))" filter="url(#qGlow)" />
                  <circle cx="103" cy="86" r="2.2" fill="#fff" />
                  <ellipse cx="139" cy="89" rx={isSurprised ? 8.5 : 6.5} ry={isSurprised ? 10 : 8.5} fill="hsl(var(--accent-web))" filter="url(#qGlow)" />
                  <circle cx="141" cy="86" r="2.2" fill="#fff" />
                </motion.g>
              )}
            </motion.g>
          </motion.g>

          {/* Rosy Cheeks */}
          <motion.ellipse cx="89" cy="98" rx="5" ry="2.6" fill="hsl(var(--accent-ai))" animate={{ opacity: isHappy || isCelebrating || isPlayful ? 0.85 : 0.08 }} transition={{ duration: 0.35 }} />
          <motion.ellipse cx="151" cy="98" rx="5" ry="2.6" fill="hsl(var(--accent-ai))" animate={{ opacity: isHappy || isCelebrating || isPlayful ? 0.85 : 0.08 }} transition={{ duration: 0.35 }} />

          {/* Mouth LED */}
          {isHappy || isCelebrating ? (
            <path d="M 112 101 Q 120 110 128 101" stroke="hsl(var(--accent-web))" strokeWidth="2.8" strokeLinecap="round" fill="none" filter="url(#qGlow)" />
          ) : isThinking ? (
            <line x1="116" y1="102" x2="124" y2="102" stroke="hsl(var(--accent-web))" strokeWidth="2" strokeLinecap="round" />
          ) : isSurprised ? (
            <ellipse cx="120" cy="102" rx="3.2" ry="4.2" fill="none" stroke="hsl(var(--accent-web))" strokeWidth="2.2" filter="url(#qGlow)" />
          ) : isCurious ? (
            <ellipse cx="120" cy="102" rx="2.5" ry="3.2" fill="hsl(var(--accent-web))" opacity="0.9" />
          ) : isPlayful ? (
            <path d="M 114 101 Q 120 103 127 98" stroke="hsl(var(--accent-web))" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M 115 101 Q 120 105 125 101" stroke="hsl(var(--accent-web))" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}

          {isCelebrating && (
            <g fill="hsl(var(--accent-ai))" filter="url(#qGlow)">
              <circle cx="56" cy="48" r="3.5" /><circle cx="184" cy="42" r="3.5" fill="hsl(var(--accent-web))" />
            </g>
          )}
        </motion.g>
      </svg>
    </div>
  );
}
