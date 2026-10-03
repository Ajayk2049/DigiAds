'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function AboutUsSection() {
  return (
    <section id="about" className="py-10 px-6 bg-muted/10 relative overflow-hidden">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          {/* Logo Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-5 flex justify-center"
          >
            <div className="relative group p-8 token-card rounded-card border border-border shadow-card hover:border-accent/40 transition-all duration-300 max-w-[320px] w-full aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-accent/5 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                src="/digiads-logo.svg"
                alt="DigiAds Brand Logo"
                width={200}
                height={80}
                className="w-full h-full object-contain max-h-[160px] filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 select-none"
              />
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-7 space-y-5 text-left"
          >
            <div className="space-y-2.5">
              <span className="text-xs font-extrabold text-accent tracking-widest uppercase bg-accent/10 px-3 py-1 rounded-pill border border-accent/20">
                About Aibot Ink
              </span>
              <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                Driving Innovation <br />
                <span className="text-accent">
                  To Serve Society
                </span>
              </h2>
            </div>
            <div className="space-y-3.5 text-base text-muted-foreground leading-relaxed font-normal">
              <p>
                Aibot Ink is an innovative technology enterprise formed by visionary engineers and industry veterans dedicated to serving society through cutting-edge technology. We believe advanced hardware and software must be accessible, reliable, and affordable to every business and individual.
              </p>
              <p>
                We research, engineer, and manufacture state-of-the-art solutions spanning Automation, Digital Kiosks, and Smart IoT Ecosystems — powering reliable, high-performance customer engagement worldwide.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
