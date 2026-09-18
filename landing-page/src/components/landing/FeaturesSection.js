'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { features, fadeInUp, staggerContainer } from '@/data/landingData';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-10 px-6 bg-muted/20 relative">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
            Complete Ecosystem
          </span>
          <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            All-In-One Hardware & Software Network
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Custom Android firmware combined with responsive cloud management for seamless tablet onboarding, menu ordering, and localized ad delivery.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-7"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -3 }}
              className="glassmorphism-card p-7 md:p-9 rounded-xl flex flex-col md:flex-row items-start md:space-x-6 hover:border-[#0069a8]/50 transition-all duration-300 shadow-md relative group"
            >
              <div className="p-3.5 bg-background border border-border/80 rounded-lg mb-4 md:mb-0 shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                {feature.icon}
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${feature.accentColor}`}>
                    {feature.tag}
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-bold text-foreground tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
