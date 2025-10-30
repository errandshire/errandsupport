"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

const staggerContainer: Variants = {
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
    <>
    <Header />
    <div className="min-h-screen bg-white">
      {/* Hero Section with Video Background */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/social_u9499386881_A_professional_Black_male_house_cleaner_in_real-l_5e1f6994-7766-461f-8618-8ff46629580d_1.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        
        {/* Hero Content */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-20 text-center max-w-3xl mx-auto px-4"
        >
          <motion.h1 
            variants={fadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6"
          >
            Your Trusted Errand
            <br />
            Support
            <br />
            Marketplace
          </motion.h1>

          <motion.p 
            variants={fadeIn}
            className="text-lg md:text-xl text-white/90 mb-8"
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
      </div>

      {/* Features Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2 
            variants={fadeIn}
            className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-6"
          >
            Why Choose Errand Support?
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            className="text-lg text-neutral-600 mb-6"
          >
            We've built the most trusted platform for connecting with local service professionals.
          </motion.p>
          
          <motion.div 
            variants={fadeIn}
            className="mb-12"
          >
            <Button 
              variant="outline"
              size="lg"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              asChild
            >
              <Link href="/how-it-works">
                Learn How It Works <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Verified Professionals",
                description: "Every worker is thoroughly vetted and verified for your safety",
                showImage: true
              },
              {
                title: "Secure Payments",
                description: "Safe and transparent payment processing for every service",
                showImage: false
              },
              {
                title: "Quality Service",
                description: "Consistently high-rated services with satisfaction guarantee",
                showImage: false
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="p-6 rounded-2xl bg-white shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                {feature.showImage && (
                  <div className="mb-4 relative h-48 rounded-lg overflow-hidden">
                    <Image
                      src="/u9499386881_Professional_house_cleaner_in_uniform_modern_home_28121819-2540-4dd2-9ec1-d8e014753d4a_2.png"
                      alt="Professional house cleaner in green uniform"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
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
    </div>
    <Footer />
    </>
  );
}
