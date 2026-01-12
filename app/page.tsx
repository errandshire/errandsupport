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
          className="relative z-20 text-center max-w-4xl mx-auto px-4"
        >
          <motion.h1
            variants={fadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6"
          >
            Too Busy to Do Everything Yourself?
          </motion.h1>

          <motion.p
            variants={fadeIn}
            className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Hire cleaners, pickups, support, errand runners and more in minutes. Post your errand and get available workers applying fast in under 30 minutes.
          </motion.p>

          <motion.div
            variants={fadeIn}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-14 px-8 text-lg font-semibold"
              asChild
            >
              <Link href="/register">
                Post an Errand Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-white/80 text-white hover:bg-white/10 hover:border-white rounded-full h-14 px-8 text-lg font-semibold backdrop-blur-sm"
              asChild
            >
              <Link href="/workers">See Available Workers</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeIn}
            className="text-sm text-white/80 italic"
          >
            Verified workers • Pay only when the job is accepted
          </motion.p>
        </motion.section>
      </div>

      {/* How It Works Section */}
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
            How It Works
          </motion.h2>
          <motion.p
            variants={fadeIn}
            className="text-lg text-neutral-600 mb-12 max-w-3xl mx-auto"
          >
            Simple, fast, and stress-free. Get your errands handled in 4 easy steps.
          </motion.p>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16"
          >
            {[
              {
                step: "1",
                title: "Describe the task",
                description: "Tell us what you need done"
              },
              {
                step: "2",
                title: "Add location & budget",
                description: "Set where and how much you'll pay"
              },
              {
                step: "3",
                title: "We alert nearby workers",
                description: "Get applications in under 30 minutes"
              },
              {
                step: "4",
                title: "You pick who works",
                description: "That's all. Simple as that."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="relative p-6 rounded-2xl bg-white shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2 mt-6">
                  {item.title}
                </h3>
                <p className="text-neutral-600 text-sm">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

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
                Learn How ErandWork Works <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.section>

        {/* Why ErandWork Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
        >
          <motion.div
            variants={fadeIn}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-6">
              Why ErandWork?
            </h2>
            <div className="max-w-2xl mx-auto space-y-4 text-lg text-neutral-700">
              <p>
                <strong>LinkedIn</strong> is for long-term hires.
                <br />
                <strong>ErandWork</strong> is for "please handle this now."
              </p>
              <p className="text-neutral-600">
                WhatsApp referrals fail.
                <br />
                Calling takes time.
                <br />
                Following up is exhausting.
              </p>
              <p className="font-semibold text-emerald-600">
                ErandWork replaces all that.
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* Trust Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-16"
        >
          <motion.div
            variants={fadeIn}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-8">
              Trust Without Overexplaining
            </h2>
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
            >
              {[
                {
                  title: "Verified workers only",
                  description: "Every worker is thoroughly vetted for your safety",
                  image: "/u9499386881_Professional_house_cleaner_in_uniform_modern_home_28121819-2540-4dd2-9ec1-d8e014753d4a_2.png",
                  alt: "Professional house cleaner in green uniform"
                },
                {
                  title: "Secure payments",
                  description: "Safe escrow system - pay only when job is accepted",
                  image: "/secure-payment-phone.png",
                  alt: "Secure mobile payment interface"
                },
                {
                  title: "Used by busy professionals",
                  description: "Trusted by professionals and businesses daily",
                  image: "/busy-professionals-coworking.png",
                  alt: "Busy professionals working in modern office"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  className="p-6 rounded-2xl bg-white shadow-soft hover:shadow-medium transition-shadow duration-300"
                >
                  <div className="mb-4 relative h-48 rounded-lg overflow-hidden">
                    <Image
                      src={feature.image}
                      alt={feature.alt}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeIn}>
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-14 px-8 text-lg font-semibold"
                asChild
              >
                <Link href="/register">
                  Post Your Errand Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.section>
      </main>
    </div>
    <Footer />
    </>
  );
}
