import React from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Phone, MapPin } from 'lucide-react';

const ContactSection = () => {
  // TODO: Ganti dengan URL Formspree Anda
  const formspreeUrl = "https://formspree.io/f/mgolwqae";

  return (
    <section id="contact" className="py-24 md:py-32 relative overflow-hidden bg-zinc-950 scroll-mt-20">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block"
          >
            Connection
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            Get In <span className="text-zinc-700">Touch</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Have a project in mind or just want to say hello? 
            Let's collaborate to build something exceptional.
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
                { icon: Mail, label: "Email", value: "qoidrifat23@gmail.com", color: "blue", hoverBorder: 'hover:border-blue-500/30', iconStyle: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
                { icon: Phone, label: "Phone", value: "+62 823 3775 3394", color: "emerald", hoverBorder: 'hover:border-emerald-500/30', iconStyle: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
                { icon: MapPin, label: "Location", value: "Surabaya, Indonesia", color: "purple", hoverBorder: 'hover:border-purple-500/30', iconStyle: 'border-purple-500/30 bg-purple-500/10 text-purple-400' }
              ].map((info, idx) => (
                <div key={idx} className={`group p-6 rounded-[2rem] bg-white/5 border border-white/5 ${info.hoverBorder} transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl ${info.iconStyle} flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
                      <info.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{info.label}</p>
                      <p className="text-white font-bold">{info.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Proof/CTA */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600/10 to-emerald-600/10 border border-white/5 backdrop-blur-sm">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">                  <Send className="w-5 h-5 text-blue-500" aria-hidden="true" />
                Social Presence
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Feel free to connect with me on any of these platforms. I'm always open to discussing new ideas.
              </p>
              <div className="flex gap-4">
                {/* Social icons could go here */}
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
              action={formspreeUrl} 
              method="POST"
              className="p-10 rounded-[3rem] bg-zinc-900/40 border border-white/5 backdrop-blur-2xl space-y-8 shadow-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="name" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" name="name" id="name" required 
                    placeholder="John Doe"
                    className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-300 hover:border-blue-500/20" 
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="email" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" name="email" id="email" required 
                    placeholder="john@example.com"
                    className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-300 hover:border-blue-500/20" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="message" className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Your Message</label>
                <textarea 
                  name="message" id="message" rows="6" required 
                  placeholder="Tell me about your project..."
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-[2rem] py-4 px-6 text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-300 resize-none hover:border-blue-500/20"
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="group relative w-full overflow-hidden px-8 py-5 bg-blue-600 rounded-[2rem] text-white font-black text-sm uppercase tracking-[0.2em] transition-all hover:bg-blue-700 shadow-xl shadow-blue-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Transmit Message
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
                </span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
