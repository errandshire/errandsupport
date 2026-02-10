"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, ArrowRight, Users, Share2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { partnerSignupSchema, PartnerSignupFormData } from "@/lib/validations";
import { toast } from "sonner";

export default function PartnerSignupPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    partnerCode: string;
    referralLink: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerSignupFormData>({
    resolver: zodResolver(partnerSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      experience: "",
    },
  });

  const onSubmit = async (data: PartnerSignupFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/partners/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess({
          partnerCode: result.partnerCode,
          referralLink: result.referralLink,
        });
        toast.success("Welcome aboard! Your partner account is ready.");
      } else {
        toast.error(result.message || "Something went wrong");
      }
    } catch {
      toast.error("Failed to create partner account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-50 to-emerald-100 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Become an ErandWork Community Growth Partner
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Earn 5% commission on every completed job from clients you refer.
              No upfront costs, no risk — you earn when real money flows in.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Sign Up</h3>
                <p className="text-neutral-600 text-sm">
                  Fill out the form below and get your unique referral code instantly.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. Share Your Link</h3>
                <p className="text-neutral-600 text-sm">
                  Share your referral link with people in your community, estate, or network.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Banknote className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Earn 5%</h3>
                <p className="text-neutral-600 text-sm">
                  Earn 5% commission on every completed job from clients you refer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Commission Examples */}
        <section className="py-16 px-4 bg-neutral-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">What You Could Earn</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { job: "Home Cleaning", amount: 20000, commission: 1000 },
                { job: "Plumbing Repair", amount: 40000, commission: 2000 },
                { job: "Full Day Service", amount: 80000, commission: 4000 },
              ].map((example) => (
                <Card key={example.job} className="text-center">
                  <CardContent className="pt-6">
                    <p className="text-sm text-neutral-500 mb-1">{example.job}</p>
                    <p className="text-lg text-neutral-700">
                      Job: ₦{example.amount.toLocaleString()}
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">
                      You earn: ₦{example.commission.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Program Rules</h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>Commission applies only to completed and paid jobs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>90-day commission window from the referred client&apos;s first completed job</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>Payouts are processed monthly to your bank account</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>Each client can only be referred by one partner</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>ErandWork reserves the right to modify or end the program</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Signup Form / Success */}
        <section className="py-16 px-4 bg-emerald-50" id="signup">
          <div className="max-w-lg mx-auto">
            {success ? (
              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Your Partner Code</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-white border rounded-lg px-4 py-3 font-mono text-lg font-bold text-emerald-700">
                        {success.partnerCode}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(success.partnerCode)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-600">Your Referral Link</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-white border rounded-lg px-4 py-3 text-sm text-neutral-700 truncate">
                        {success.referralLink}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(success.referralLink)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-500 text-center mt-4">
                    Share this link with people in your community. When they register and complete jobs, you earn 5%.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Become a Partner</CardTitle>
                  <p className="text-neutral-500 text-sm mt-1">
                    Fill out the form to get your referral code instantly
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <FormInput
                      {...register("name")}
                      label="Full Name"
                      placeholder="Your full name"
                      error={errors.name?.message}
                      required
                    />
                    <FormInput
                      {...register("email")}
                      type="email"
                      label="Email Address"
                      placeholder="you@example.com"
                      error={errors.email?.message}
                      required
                    />
                    <FormInput
                      {...register("phone")}
                      label="Phone Number"
                      placeholder="Optional"
                      error={errors.phone?.message}
                    />
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Previous Experience (Optional)
                      </label>
                      <textarea
                        {...register("experience")}
                        placeholder="Tell us about your referral or community work experience..."
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={3}
                      />
                      {errors.experience?.message && (
                        <p className="text-sm text-red-500 mt-1">{errors.experience.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>Creating your account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Get My Referral Code</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
