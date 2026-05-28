"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LawpetChatPanel = dynamic(
  () => import("@/components/lawpet-chat-panel").then((module) => module.LawpetChatPanel),
  { ssr: false }
);

const contextualPrompts: Record<string, string> = {
  "/login": "Need a quick tour? Click the bear and I’ll explain this screen.",
  "/dashboard": "Want a fast triage summary? Click me and I’ll explain what to review first.",
  "/inbox-review": "Need help assigning emails to matters? Click me.",
  "/approvals": "Unsure what to approve or reject here? Click me for a quick explanation.",
  "/cases": "Need help understanding case folders and living documents? Click me.",
  "/deadlines": "Need a walkthrough of draft deadlines and attorney review? Click me.",
  "/calendar": "Want me to explain internal vs approved calendar events? Click me.",
  "/documents": "Need help reading document versions and comparisons? Click me.",
  "/settings": "Want help connecting Gmail or turning on auto-sync? Click me."
};

function getContextualPrompt(pathname: string) {
  const directMatch = contextualPrompts[pathname];
  if (directMatch) return directMatch;
  if (pathname.startsWith("/cases/")) return "Need a walkthrough of this case workspace? Click me.";
  if (pathname.startsWith("/documents/compare")) return "Want help understanding the version diff? Click me.";
  return "Need help with this page? Click me and I’ll explain what you’re seeing.";
}

export function LawpetChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [nudgeText, setNudgeText] = useState(() => getContextualPrompt(pathname));
  const [isNudging, setIsNudging] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());

  useEffect(() => {
    setNudgeText(getContextualPrompt(pathname));
    setIsNudging(false);
    setLastActivityAt(Date.now());
  }, [pathname]);

  useEffect(() => {
    const markActivity = () => setLastActivityAt(Date.now());

    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsNudging(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs >= 9000) {
        setNudgeText(getContextualPrompt(pathname));
        setIsNudging(true);
      }
    }, 9500);

    return () => window.clearTimeout(timeout);
  }, [isOpen, lastActivityAt, pathname]);

  return (
    <div className="lawpet-layer" aria-live="polite">
      {isOpen ? <LawpetChatPanel pathname={pathname} onClose={() => setIsOpen(false)} /> : null}

      <button
        type="button"
        className={`lawpet-launcher ${isOpen ? "open" : ""} ${isNudging ? "nudging" : ""}`}
        onClick={() => {
          setIsOpen((current) => !current);
          setIsNudging(false);
        }}
        aria-label="Open Lawpet assistant"
      >
        <span className={`lawpet-speech-hint ${isNudging ? "visible" : ""}`}>{nudgeText}</span>
        <span className="lawpet-mascot-wrap">
          <span className="lawpet-walk-sprite" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
