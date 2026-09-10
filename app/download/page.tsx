import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { DownloadApp } from "@/components/download-app";

const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.errandwork.app2&pcampaignid=web_share";
const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ||
  "https://apps.apple.com/ng/app/erandwork/id6792582713";

export const metadata: Metadata = {
  title: "Download ErandWork | Get the App",
  description: "Download the ErandWork app on the App Store or Google Play.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DownloadPage() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent")?.toLowerCase() || "";

  if (/android/.test(userAgent)) {
    redirect(PLAY_STORE_URL);
  }

  if (/iphone|ipad|ipod/.test(userAgent)) {
    redirect(APP_STORE_URL);
  }

  // Desktop or unrecognized device — let the user choose manually.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center bg-white">
      <img src="/errandworklogo.png" alt="ErandWork" className="h-16 w-auto" />
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Get the ErandWork App
        </h1>
        <p className="mt-2 text-neutral-600 max-w-md">
          Choose your platform below to download the app.
        </p>
      </div>
      <DownloadApp />
    </div>
  );
}
