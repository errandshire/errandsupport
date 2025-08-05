"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Search, UserCheck, Calendar, CreditCard, CheckCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";

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

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const steps = [
  {
    number: "01",
    title: "Browse & Search",
    description: "Explore our marketplace of verified professionals. Filter by service type, location, rating, and availability to find the perfect match for your needs.",
    icon: Search,
    color: "emerald"
  },
  {
    number: "02", 
    title: "Select Your Professional",
    description: "Review profiles, ratings, and reviews. Check availability and pricing. Every professional is verified and background-checked for your safety.",
    icon: UserCheck,
    color: "blue"
  },
  {
    number: "03",
    title: "Book & Schedule",
    description: "Choose your preferred date and time. Add specific requirements and location details. Get instant confirmation from your chosen professional.",
    icon: Calendar,
    color: "purple"
  },
  {
    number: "04",
    title: "Secure Payment",
    description: "Your payment is held securely in escrow until the job is completed to your satisfaction. Multiple payment methods accepted.",
    icon: CreditCard,
    color: "orange"
  },
  {
    number: "05",
    title: "Service Delivery",
    description: "Your professional arrives on time and completes the work. Track progress and communicate directly through our platform.",
    icon: CheckCircle,
    color: "green"
  },
  {
    number: "06",
    title: "Rate & Review",
    description: "Payment is automatically released once you confirm completion. Rate your experience and help others find great professionals.",
    icon: Star,
    color: "yellow"
  }
];

const benefits = [
  {
    title: "For Clients",
    features: [
      "Access to verified professionals",
      "Secure escrow payment system",
      "24/7 customer support",
      "Satisfaction guarantee",
      "Easy booking process",
      "Real-time communication"
    ]
  },
  {
    title: "For Workers",
    features: [
      "Flexible work opportunities",
      "Guaranteed payment protection", 
      "Build your reputation",
      "Set your own rates",
      "Professional verification",
      "Growing customer base"
    ]
  }
];

export default function HowItWorks() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.h1 
                variants={fadeIn}
                className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-neutral-900 mb-6"
              >
                How Errand Support
                <span className="text-emerald-600"> Works</span>
              </motion.h1>
              
              <motion.p 
                variants={fadeIn}
                className="text-lg md:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto"
              >
                Get things done effortlessly with our simple 6-step process. Connect with trusted professionals and experience seamless service delivery.
              </motion.p>
              
              <motion.div 
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button 
                  size="lg" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-14 px-8 text-lg"
                  asChild
                >
                  <Link href="/register">
                    Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-neutral-200 hover:border-emerald-500 hover:text-emerald-500 rounded-full h-14 px-8 text-lg"
                  asChild
                >
                  <Link href="/workers">Browse Professionals</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.h2 
                variants={fadeIn}
                className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-4"
              >
                Simple Steps to Success
              </motion.h2>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-neutral-600"
              >
                From booking to completion, we've streamlined every step
              </motion.p>
            </motion.div>

            <div className="space-y-20">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 0;
                
                return (
                  <motion.div
                    key={step.number}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className={`flex flex-col lg:flex-row items-center gap-12 ${
                      isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                    }`}
                  >
                    {/* Content */}
                    <motion.div 
                      variants={isEven ? slideInLeft : slideInRight}
                      className="lg:w-1/2 space-y-6"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-6xl font-bold text-emerald-100">
                          {step.number}
                        </span>
                        <div className={`p-3 rounded-2xl bg-${step.color}-100`}>
                          <Icon className={`h-8 w-8 text-${step.color}-600`} />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-neutral-900">
                        {step.title}
                      </h3>
                      
                      <p className="text-lg text-neutral-600 leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>

                    {/* Visual */}
                    <motion.div 
                      variants={isEven ? slideInRight : slideInLeft}
                      className="lg:w-1/2"
                    >
                      <div className="relative h-80 w-full bg-gradient-to-br from-emerald-100 to-blue-100 rounded-3xl overflow-hidden shadow-lg">
                        {index === 1 && (
                          <Image
                            src="/u9499386881_Professional_house_cleaner_in_uniform_modern_home_28121819-2540-4dd2-9ec1-d8e014753d4a_2.png"
                            alt="Professional service provider"
                            fill
                            className="object-cover"
                          />
                        )}
                        {index !== 1 && (
                          <div className="flex items-center justify-center h-full">
                            <Icon className={`h-24 w-24 text-${step.color}-400`} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-neutral-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.h2 
                variants={fadeIn}
                className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-4"
              >
                Benefits for Everyone
              </motion.h2>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-neutral-600"
              >
                Whether you're looking for services or offering them, we've got you covered
              </motion.p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  variants={fadeIn}
                  className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <h3 className="text-2xl font-serif font-bold text-neutral-900 mb-6">
                    {benefit.title}
                  </h3>
                  <ul className="space-y-4">
                    {benefit.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-neutral-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-emerald-600">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center"
            >
              <motion.h2 
                variants={fadeIn}
                className="text-3xl md:text-4xl font-serif font-bold text-white mb-6"
              >
                Ready to Get Started?
              </motion.h2>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto"
              >
                Join thousands of satisfied customers and professionals using Errand Support every day
              </motion.p>
              <motion.div 
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button 
                  size="lg" 
                  className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-full h-14 px-8 text-lg"
                  asChild
                >
                  <Link href="/register">
                    Join as Client <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 rounded-full h-14 px-8 text-lg"
                  asChild
                >
                  <Link href="/register">Become a Professional</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}