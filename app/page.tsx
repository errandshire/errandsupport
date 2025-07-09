"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.h1 
            variants={fadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-neutral-900 mb-6"
          >
            Your Trusted Errand
            <br />
            Support
            <br />
            Marketplace
          </motion.h1>

          <motion.p 
            variants={fadeIn}
            className="text-lg md:text-xl text-neutral-600 mb-8"
          >
            Connect with verified local professionals for all your daily tasks.
            From cleaning to delivery, we make life easier with trusted workers at your
            fingertips.
          </motion.p>

          <motion.div 
            variants={fadeIn}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-14 px-8 text-lg"
              asChild
            >
              <Link href="/register">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-neutral-200 hover:border-emerald-500 hover:text-emerald-500 rounded-full h-14 px-8 text-lg"
              asChild
            >
              <Link href="/workers">Browse Workers</Link>
            </Button>
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-24 text-center"
        >
          <motion.h2 
            variants={fadeIn}
            className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-6"
          >
            Why Choose Errand Support?
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            className="text-lg text-neutral-600 mb-12"
          >
            We've built the most trusted platform for connecting with local service professionals.
          </motion.p>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Verified Professionals",
                description: "Every worker is thoroughly vetted and verified for your safety"
              },
              {
                title: "Secure Payments",
                description: "Safe and transparent payment processing for every service"
              },
              {
                title: "Quality Service",
                description: "Consistently high-rated services with satisfaction guarantee"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="p-6 rounded-2xl bg-white shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                <h3 className="text-xl font-bold text-neutral-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
