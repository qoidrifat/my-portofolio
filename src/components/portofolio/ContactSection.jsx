import React from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Phone, MapPin } from 'lucide-react';

const ContactSection = () => {
  // TODO: Ganti dengan URL Formspree Anda
  const formspreeUrl = "https://formspree.io/f/mgolwqae";

  return (
    <section id="contact" className="py-20 md:py-32 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-blue-400 text-sm font-semibold tracking-wider uppercase">
            Contact
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Get In Touch
          </h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            Have a project in mind or just want to say hello? Feel free to reach out.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <form 
              action={formspreeUrl} 
              method="POST"
              className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                <input type="text" name="name" id="name" required className="w-full bg-white/5 border-white/10 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                <input type="email" name="email" id="email" required className="w-full bg-white/5 border-white/10 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">Message</label>
                <textarea name="message" id="message" rows="5" required className="w-full bg-white/5 border-white/10 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"></textarea>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300">
                Send Message
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="space-y-6 flex flex-col justify-center"
          >
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Email</h3>
                <p className="text-zinc-400">qoidrifat23@gmail.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Phone</h3>
                <p className="text-zinc-400">+62 823 3775 3394</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Location</h3>
                <p className="text-zinc-400">Madura, Indonesia</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
