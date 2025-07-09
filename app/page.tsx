import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, CheckCircle, Star, Users, Shield, Clock } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-neutral-900 mb-6">
                Your Trusted
                <span className="text-primary-600"> Errand Support</span>
                <br />
                Marketplace
              </h1>
              <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
                Connect with verified local professionals for all your daily tasks. 
                From cleaning to delivery, we make life easier with trusted workers at your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/register" className="inline-flex items-center">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/workers">Browse Workers</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 mb-4">
                Why Choose Errand Support?
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                We've built the most trusted platform for connecting with local service professionals.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card variant="elevated" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary-600" />
                  </div>
                  <CardTitle>Verified Workers</CardTitle>
                  <CardDescription>
                    All workers undergo thorough background checks and identity verification
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card variant="elevated" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-accent-600" />
                  </div>
                  <CardTitle>Quick & Reliable</CardTitle>
                  <CardDescription>
                    Book services instantly and get matched with available workers in minutes
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card variant="elevated" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Trusted Community</CardTitle>
                  <CardDescription>
                    Join thousands of satisfied customers and top-rated service providers
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-neutral-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-neutral-600">
                Getting help with your errands is simple and straightforward
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-6">
                  1
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Book a Service</h3>
                <p className="text-neutral-600">
                  Choose from our wide range of services and describe what you need help with
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-6">
                  2
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Get Matched</h3>
                <p className="text-neutral-600">
                  We'll connect you with verified workers in your area who can help
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-6">
                  3
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Relax & Enjoy</h3>
                <p className="text-neutral-600">
                  Sit back while our trusted professionals take care of your tasks
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-600">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust us with their daily tasks
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Sign Up Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600" asChild>
                <Link href="/become-worker">Become a Worker</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
