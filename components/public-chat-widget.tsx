"use client";

import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";

type PublicChatWidgetProps = {
  logoSrc?: string;
  logoLightSrc?: string;
  alt?: string;
};

export function PublicChatWidget(props: PublicChatWidgetProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <ChatWidget {...props} />;
}
