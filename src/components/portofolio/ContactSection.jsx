import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Phone, MapPin, CheckCircle2, AlertCircle, Loader2, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useCopy } from '@/lib/LanguageContext';

// Formspree form id is a public identifier, not a secret — it ships in the
// client bundle by design. Abuse is handled by the honeypot below plus the
// provider-side filters in the Formspree dashboard.
const FORMSPREE_URL = 'https://formspree.io/f/mgolwqae';

// UX-level throttle after a successful send. Not a rate limiter: a determined
// sender can call the endpoint directly. See docs/security/CONTACT-FORM-ABUSE.md
const COOLDOWN_MS = 60_000;

const COPY = {
  en: {
    eyebrow: 'Connection',
    headingMain: 'Get In',
    headingAccent: 'Touch',
    intro: "Have a project in mind or just want to say hello? Let's collaborate to build something exceptional.",
    emailLabel: 'Email Address',
    nameLabel: 'Full Name',
    emailPlaceholder: 'john@example.com',
    messageLabel: 'Your Message',
    messagePlaceholder: 'Tell me about your project...',
    recruiterHeading: 'Fast-Track for Recruiters',
    recruiterIntro: 'Prefer immediate communication? Reach out via WhatsApp or copy my direct email in one click.',
    copyEmail: 'Copy Email',
    whatsapp: 'Direct WhatsApp',
    submitLabel: 'Transmit Message',
    transmitting: 'Transmitting…',
    success: 'Message sent! I\'ll get back to you as soon as possible.',
    cooldown: 'Message already sent. You can send another one in',
    error: 'Something went wrong. Please try again, or email me directly at',
  },
  id: {
    eyebrow: 'Kontak',
    headingMain: 'Hubungi',
    headingAccent: 'Saya',
    intro: 'Memiliki proyek dalam pikiran atau hanya ingin menyapa? Mari kita bangkit sesuatu yang luar biasa bersama.',
    emailLabel: 'Email',
    nameLabel: 'Nama Lengkap',
    emailPlaceholder: 'john@example.com',
    messageLabel: 'Pesan Anda',
    messagePlaceholder: 'Ceritakan tentang proyek Anda...',
    recruiterHeading: 'Pantas untuk Rekrutmen',
    recruiterIntro: 'Memprediksi komunikasi segera? Hubungi melalui WhatsApp atau salin email langsung saya dengan satu klik.',
    copyEmail: 'Disalin!',
    whatsapp: 'WhatsApp Langsung',
    submitLabel: 'Kirim Pesan',
    transmitting: 'Mentransmisikan…',
    success: 'Pesan terkirim! Saya akan segera membalas.',
    cooldown: 'Pesan sudah terkirim. Anda dapat mengirim lagi dalam',
    error: 'Terjadi kesalahan. Silakan coba lagi, atau hubungi saya langsung di',
  },
};

export default function ContactSection() {
  const [status, setStatus] = useState('idle');
  const [copied, setCopied] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const autoDismissRef = useRef(null);
  const t = useCopy(COPY);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isCoolingDown = cooldownLeft > 0;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('qoidrifat23@gmail.com');
      setCopied(true);
      toast({
        title: "Email Copied to Clipboard! 📋",
        description: "qoidrifat23@gmail.com ready to paste into your mail app.",
        duration: 3500,
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Clipboard unavailable",
        description: "Please manually copy: qoidrifat23@gmail.com",
        duration: 4000,
      });
    }
  };

  // Tick only while a cooldown is pending, so no timer runs at idle.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // Auto-dismiss success/error after 6 seconds
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      autoDismissRef.current = setTimeout(() => {
        setStatus('idle');
      }, 6000);
    }
    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
      }
    };
  }, [status]);

  // Submit via fetch so visitors stay on the page instead of being sent to
  // Formspree's generic thank-you screen
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'submitting' || isCoolingDown) return;
    const form = e.currentTarget;
    setStatus('submitting');
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
      form.reset();
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setNow(Date.now());
      setStatus('success');
      // Also show a toast notification for extra visibility
      toast({
        title: "Message sent! 🎉",
        description: "Thanks for reaching out — I'll get back to you as soon as possible.",
        duration: 5000,
      });
    } catch {
      setStatus('error');
      toast({
        title: "Something went wrong",
        description: "Please try again or email me directly at qoidrifat23@gmail.com",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-zinc-950 scroll-mt-20">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[hsl(var(--accent-web))]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-[hsl(var(--accent-web))]/10 border border-[hsl(var(--accent-web))]/20 text-[hsl(var(--accent-web))] text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block"
          >
            {t.eyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            {t.headingMain} <span className="text-zinc-500">{t.headingAccent}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            {t.intro}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email", value: "qoidrifat23@gmail.com", href: "mailto:qoidrifat23@gmail.com", color: "blue", hoverBorder: 'hover:border-[hsl(var(--accent-web))]/30', iconStyle: 'border-[hsl(var(--accent-web))]/30 bg-[hsl(var(--accent-web))]/10 text-[hsl(var(--accent-web))]' },
                { icon: Phone, label: "Phone", value: "+62 823 3775 3394", href: "tel:+6282337753394", color: "emerald", hoverBorder: 'hover:border-[hsl(var(--accent-ai))]/30', iconStyle: 'border-[hsl(var(--accent-ai))]/30 bg-[hsl(var(--accent-ai))]/10 text-[hsl(var(--accent-ai))]' },
                { icon: MapPin, label: "Location", value: "Surabaya, Indonesia", color: "purple", hoverBorder: 'hover:border-purple-500/30', iconStyle: 'border-purple-500/30 bg-purple-500/10 text-purple-400' }
              ].map((info, idx) => {
                const content = (
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl ${info.iconStyle} flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
                      <info.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{info.label}</p>
                      <p className="text-white font-bold">{info.value}</p>
                    </div>
                  </div>
                );
                if (info.href) {
                  return (
                    <a key={idx} href={info.href} className={`group block p-6 rounded-[2rem] bg-white/5 border border-white/5 ${info.hoverBorder} transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
                      {content}
                    </a>
                  );
                }
                return (
                  <div key={idx} className={`group p-6 rounded-[2rem] bg-white/5 border border-white/5 ${info.hoverBorder} transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
                    {content}
                  </div>
                );
              })}
            </div>

            {/* Social Proof & Quick Recruiter Actions */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[hsl(var(--accent-web))]/10 to-[hsl(var(--accent-ai))]/10 border border-white/5 backdrop-blur-sm space-y-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-[hsl(var(--accent-web))]" aria-hidden="true" />
                {t.recruiterHeading}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t.recruiterIntro}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white text-xs font-semibold hover:bg-white/10 transition-all duration-300 active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[hsl(var(--accent-web))]" />}
                  <span>{copied ? 'Copied!' : t.copyEmail}</span>
                </button>
                <a
                  href="https://wa.me/6282337753394?text=Hi%20Qoid,%20I%20saw%20your%20portfolio%20and%20would%20like%20to%20connect%20regarding%20an%20opportunity."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all duration-300 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.whatsapp}</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-3"
          >
            <form
              onSubmit={handleSubmit}
              className="p-10 rounded-[3rem] bg-zinc-900/40 border border-white/5 backdrop-blur-2xl space-y-8 shadow-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="name" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">{t.nameLabel}</label>
                  <input 
                    type="text" name="name" id="name" required 
                    autoComplete="name"
                    placeholder="John Doe"
                    className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[hsl(var(--accent-web))]/50 focus:border-[hsl(var(--accent-web))]/50 outline-none transition-all duration-300 hover:border-[hsl(var(--accent-web))]/20" 
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="email" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">{t.emailLabel}</label>
                  <input 
                    type="email" name="email" id="email" required 
                    autoComplete="email"
                    placeholder="john@example.com"
                    className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[hsl(var(--accent-web))]/50 focus:border-[hsl(var(--accent-web))]/50 outline-none transition-all duration-300 hover:border-[hsl(var(--accent-web))]/20" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="message" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">{t.messageLabel}</label>
                <textarea 
                  name="message" id="message" rows="6" required 
                  autoComplete="off"
                  placeholder="Tell me about your project..."
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-[2rem] py-4 px-6 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[hsl(var(--accent-web))]/50 focus:border-[hsl(var(--accent-web))]/50 outline-none transition-all duration-300 resize-none hover:border-[hsl(var(--accent-web))]/20"
                ></textarea>
              </div>
              {/* Honeypot — Formspree rejects any submission that fills _gotcha.
                  Off-screen instead of display:none so autofill bots still see it;
                  aria-hidden + tabIndex -1 keep it out of the a11y and tab order. */}
              <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="_gotcha">Leave this field empty</label>
                <input
                  type="text" name="_gotcha" id="_gotcha" tabIndex={-1}
                  autoComplete="off" defaultValue=""
                />
              </div>
              <button
                type="submit"
                disabled={status === 'submitting' || isCoolingDown}
                className="group relative w-full overflow-hidden px-8 py-5 bg-[hsl(var(--accent-web-btn))] rounded-[2rem] text-white font-black text-sm uppercase tracking-[0.2em] transition-all hover:brightness-110 shadow-xl shadow-[hsl(var(--accent-web))]/20 disabled:opacity-60 disabled:cursor-wait"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent-web))] to-[hsl(var(--accent-web-btn))] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {status === 'submitting' ? (
                    <>
                      {t.transmitting}
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      {isCoolingDown ? `${t.submitLabel} (${cooldownLeft}s)` : t.submitLabel}
                      <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
                    </>
                  )}
                </span>
              </button>

              {/* Submission feedback — auto-dismissed after 6s */}
              <div aria-live="polite" className="min-h-[24px]">
                {status === 'success' && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-sm font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {t.success}
                  </motion.p>
                )}
                {isCoolingDown && status === 'success' && (
                  <p className="text-zinc-400 text-xs mt-2">
                    {t.cooldown} {cooldownLeft}s.
                  </p>
                )}
                {status === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm font-semibold"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {t.error}
                    <a href="mailto:qoidrifat23@gmail.com" className="underline hover:text-red-300">qoidrifat23@gmail.com</a>.
                  </motion.p>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}