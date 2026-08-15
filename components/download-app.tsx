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
          href={PLAY_STORE_URL}
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
          href={APP_STORE_URL}
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
          href={PLAY_STORE_URL}
          label="Google Play"
          subLabel="GET IT ON"
          icon={googleIcon}
        />
      )}
      {APP_STORE_URL && (
        <StoreButton
          href={APP_STORE_URL}
          label="App Store"
          subLabel="Download on the"
          icon={appleIcon}
        />
      )}
    </div>
  );
}
