"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  FileStack,
  FolderKanban,
  Gavel,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Settings2,
  ShieldCheck
} from "lucide-react";
import { InfoHint } from "@/components/info-hint";
import { LawpelWordmark } from "@/components/lawpel-wordmark";
import { cn } from "@/lib/utils";

const LawpetChatWidget = dynamic(
  () => import("@/components/lawpet-chat-widget").then((module) => module.LawpetChatWidget),
  { ssr: false }
);

const navGroups = [
  {
    label: "Command Center",
    items: [
      {
        label: "Firm Dashboard",
        caption: "Live review queue",
        href: "/dashboard",
        icon: LayoutDashboard
      },
      {
        label: "Inbox Review",
        caption: "New source emails",
        href: "/inbox-review",
        icon: Inbox
      },
      {
        label: "Approval Queue",
        caption: "Attorney decisions",
        href: "/approvals",
        icon: ShieldCheck
      }
    ]
  },
  {
    label: "Casework",
    items: [
      {
        label: "Case List",
        caption: "All active matters",
        href: "/cases",
        icon: BriefcaseBusiness
      },
      {
        label: "Documents",
        caption: "Versioned drafts",
        href: "/documents",
        icon: FileStack
      },
      {
        label: "Deadlines",
        caption: "Verified rule review",
        href: "/deadlines",
        icon: Gavel
      },
      {
        label: "Calendar",
        caption: "Internal and Google sync",
        href: "/calendar",
        icon: CalendarDays
      }
    ]
  },
  {
    label: "Reference",
    items: [
      {
        label: "Case Workspace",
        caption: "Matter-level source trail",
        href: "/cases/case-1",
        icon: FolderKanban
      },
      {
        label: "Compare Versions",
        caption: "Draft-to-draft diff",
        href: "/documents/compare",
        icon: FileStack
      },
      {
        label: "Rules Library",
        caption: "Verified authorities",
        href: "/rules",
        icon: LibraryBig
      },
      {
        label: "Audit Logs",
        caption: "Immutable activity",
        href: "/audit-logs",
        icon: Archive
      },
      {
        label: "Settings",
        caption: "Firm integrations",
        href: "/settings",
        icon: Settings2
      }
    ]
  }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <div className="brand">
            <LawpelWordmark />
          </div>
        </div>

        {navGroups.map((group) => (
          <section key={group.label} className="sidebar-section">
            <p className="sidebar-label">{group.label}</p>
            <nav className="nav-list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-link", isActive && "active")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Icon size={18} strokeWidth={1.8} />
                      <div className="nav-link-text">
                        <span className="nav-link-title">{item.label}</span>
                        <span className="nav-link-caption">{item.caption}</span>
                      </div>
                    </div>
                    <span className="nav-link-indicator" />
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </aside>

      <main className="main">
        <div className="main-inner">
          <header className="topbar">
            <div>
              <div className="topbar-title-row">
                <p className="topbar-title">Litigation review cockpit</p>
                <InfoHint label="A source-grounded workspace for reviewing intake, draft deadlines, living documents, and approval-controlled outputs." />
              </div>
            </div>

            <div className="topbar-meta">
              <span className="topbar-pill">Verified sources only</span>
              <span className="topbar-pill">Immutable source records</span>
              <span className="topbar-pill">No AI finalization without counsel approval</span>
            </div>
          </header>

          {children}
        </div>
      </main>

      <LawpetChatWidget />
    </div>
  );
}
