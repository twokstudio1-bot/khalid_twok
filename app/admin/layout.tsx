import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Administration",
    template: "%s · Administration TWOK STUDIO",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
