'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { faqs } from '@/data/landingData';

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section id="faq" className="py-4 px-6 bg-muted/20 relative">
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 space-y-3"
        >
          <span className="text-xs font-extrabold text-accent tracking-widest uppercase bg-accent/10 px-3 py-1 rounded-pill border border-accent/20">
            Questions & Answers
          </span>
          <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Everything you need to know about placing tablets in your venue or booking commercial ad campaigns.
          </p>
        </motion.div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="token-card rounded-card border border-border overflow-hidden transition-all shadow-card"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex justify-between items-center font-outfit text-base md:text-lg font-bold text-foreground hover:text-accent transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-4 ${
                    openFaq === idx ? 'rotate-180 text-accent' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed border-t border-border pt-3.5"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
