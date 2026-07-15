import React, { useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { X, ZoomIn } from 'lucide-react';

const photos = [
  {
    id: 1,
    src: "/gallery/original/gedung-perkantoran.webp",
    thumbSrc: "/gallery/preview-modern-office-building.webp",
    alt: "Modern office building",
    span: "col-span-2 row-span-2"
  },
  {
    id: 2,
    src: "/gallery/original/menara-kembar-my3.webp",
    thumbSrc: "/gallery/thumb-menara-kembar-my3.webp",
    alt: "Petronas Twin Towers",
    span: "col-span-1 row-span-1"
  },
  {
    id: 3,
    src: "/gallery/original/cafe.webp",
    thumbSrc: "/gallery/thumb-cafe.webp",
    alt: "Cafe atmosphere",
    span: "col-span-1 row-span-1"
  },
  {
    id: 4,
    src: "/gallery/original/changi-airport.webp",
    thumbSrc: "/gallery/thumb-changi-airport.webp",
    alt: "Changi Airport Singapore",
    span: "col-span-1 row-span-1"
  },
  {
    id: 5,
    src: "/gallery/original/masjid-my.webp",
    thumbSrc: "/gallery/preview-mosque-malaysia.webp",
    alt: "Mosque in Malaysia",
    span: "col-span-1 row-span-1",
    objectPosition: "bottom"
  },
  {
    id: 6,
    src: "/gallery/original/gedung-pencakar-langit-sg.webp",
    thumbSrc: "/gallery/preview-skyscraper-singapore.webp",
    alt: "Skyscraper Singapore",
    span: "col-span-1 row-span-1",
    objectPosition: "bottom"
  }
];

export default function GallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <section id="gallery" className="py-24 md:py-32 relative overflow-hidden scroll-mt-20" ref={ref}>
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block"
          >
            Creative
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            Capturing <span className="text-zinc-700">Moments</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg italic"
          >
            "Photography is the story I fail to put into words."
          </motion.p>
        </div>

        {/* Masonry Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-6 auto-rows-[250px] md:auto-rows-[300px]"
        >
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${photo.span} relative group cursor-pointer overflow-hidden rounded-[2rem] bg-zinc-900 border border-white/5 shadow-xl shadow-black/20`}
              onClick={() => setSelectedImage(photo)}
            >
              <img
                src={photo.thumbSrc || photo.src}
                alt={photo.alt}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1`}
              style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
              />
              
              {/* Overlay with glassmorphism */}
              <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-zinc-950/40 transition-colors duration-500" />
              
              {/* Floating label */}
              <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
                <div className="px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{photo.alt}</span>
                  <ZoomIn className="w-4 h-4 text-white/50" aria-hidden="true" />
                </div>
              </div>

              {/* Decorative light effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </motion.div>

        {/* Action Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <a 
            href="https://www.instagram.com/qoid_r.a/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-emerald-400 font-bold uppercase tracking-widest text-xs transition-colors group"
          >
            <span>More on Instagram</span>
            <div className="w-8 h-[1px] bg-zinc-800 group-hover:bg-emerald-400 group-hover:w-12 transition-all duration-300" />
          </a>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/90 backdrop-blur-2xl flex items-center justify-center p-6"
            style={{ zIndex: 100 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.button
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              className="absolute top-8 right-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              onClick={() => setSelectedImage(null)}
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </motion.button>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative max-w-6xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="max-w-full max-h-[75vh] object-contain rounded-[2.5rem] shadow-2xl border border-white/5"
                loading="eager"
              />
              <div className="mt-8 px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/5 rounded-2xl">
                <p className="text-white font-bold uppercase tracking-[0.2em] text-sm">{selectedImage.alt}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
