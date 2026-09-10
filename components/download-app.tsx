"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Smartphone, Apple } from "lucide-react";

const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.errandwork.app2";
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/ng/app/erandwork/id6792582713";

type Platform = "android" | "ios" | "desktop";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "desktop";
}

interface StoreButtonProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  subLabel: string;
  className?: string;
}

function StoreButton({ href, label, icon, subLabel, className }: StoreButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(
        "h-16 px-6 border-2 border-neutral-800 bg-black text-white hover:bg-neutral-900 hover:text-white rounded-xl flex items-center gap-3 transition-colors",
        className
      )}
    >
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {icon}
        <div className="text-left leading-tight">
          <div className="text-xs opacity-80">{subLabel}</div>
          <div className="text-base font-semibold">{label}</div>
        </div>
      </Link>
    </Button>
  );
}

export function DownloadAppHeader({ className }: { className?: string }) {
  const [platform, setPlatform] = React.useState<Platform>("desktop");

  React.useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  if (platform === "android" && PLAY_STORE_URL) {
    return (
      <Link
        href="/download"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get it on Google Play"
        className={cn("inline-flex items-center justify-center", className)}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.392 12l2.306-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
        </svg>
      </Link>
    );
  }

  if (platform === "ios" && APP_STORE_URL) {
    return (
      <Link
        href="/download"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download on the App Store"
        className={cn("inline-flex items-center justify-center", className)}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </Link>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link
        href="/download"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get it on Google Play"
        className="inline-flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.392 12l2.306-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
        </svg>
      </Link>
      <Link
        href="/download"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download on the App Store"
        className="inline-flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </Link>
    </div>
  );
}

export function DownloadApp({ className }: { className?: string }) {
  const [platform, setPlatform] = React.useState<Platform>("desktop");

  React.useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  const googleIcon = (
    <Smartphone className="h-7 w-7" />
  );

  const appleIcon = (
    <Apple className="h-7 w-7" />
  );

  if (platform === "android" && PLAY_STORE_URL) {
    return (
      <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
        <StoreButton
          href="/download"
          label="Google Play"
          subLabel="GET IT ON"
          icon={googleIcon}
        />
      </div>
    );
  }

  if (platform === "ios" && APP_STORE_URL) {
    return (
      <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
        <StoreButton
          href="/download"
          label="App Store"
          subLabel="Download on the"
          icon={appleIcon}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      {PLAY_STORE_URL && (
        <StoreButton
          href="/download"
          label="Google Play"
          subLabel="GET IT ON"
          icon={googleIcon}
        />
      )}
      {APP_STORE_URL && (
        <StoreButton
          href="/download"
          label="App Store"
          subLabel="Download on the"
          icon={appleIcon}
        />
      )}
    </div>
  );
}
