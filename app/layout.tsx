import type { Metadata, Viewport } from "next";
import { Inter, Libre_Baskerville, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
// import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  display: "swap",
});



// const playfair = Playfair_Display({
//   subsets: ["latin"],
//   variable: "--font-playfair",
//   display: "swap",
// });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  colorScheme: 'light dark',
}

export const metadata: Metadata = {
  title: "Errand Support Platform - Premium Marketplace for Local Services",
  description: "Premium web-based marketplace connecting clients with local errand-support workers. Find trusted professionals for cleaning, delivery, grocery shopping, and more.",
  keywords: ["errand services", "local workers", "marketplace", "home services", "task assistance"],
  authors: [{ name: "Errand Support Platform" }],
  creator: "Errand Support Platform",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://erandwork.com"),
  openGraph: {
    title: "Errand Support Platform - Premium Marketplace for Local Services",
    description: "Premium web-based marketplace connecting clients with local errand-support workers.",
    type: "website",
    locale: "en_US",
    siteName: "Errand Support Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "Errand Support Platform - Premium Marketplace for Local Services",
    description: "Premium web-based marketplace connecting clients with local errand-support workers.",
    creator: "@errandsupport",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorantGaramond.variable}`}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '1rem',
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
