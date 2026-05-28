import dynamic from "next/dynamic";
import Link from "next/link";
import { LawpelWordmark } from "@/components/lawpel-wordmark";
import { LoginForm } from "@/components/login-form";
import { ReviewBanner } from "@/components/review-banner";

const LawpetChatWidget = dynamic(
  () => import("@/components/lawpet-chat-widget").then((module) => module.LawpetChatWidget),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <main className="auth-shell login-shell">
      <div className="login-dashboard-backdrop" aria-hidden="true" />

      <div className="login-stage">
        <section className="login-visual-panel">
          <div className="login-visual-copy">
            <div className="login-wordmark-row">
              <LawpelWordmark />
            </div>
            <span className="auth-kicker">Built for litigation teams</span>
            <h1 className="login-visual-title">See the workflow before you even sign in.</h1>
            <p className="login-visual-note">
              Incoming email becomes organized casework, draft deadlines, living documents, and attorney approval.
            </p>
          </div>

          <div className="login-visual-frame">
            <img
              className="login-visual-image"
              src="/login-benefits-hero.png"
              alt="Visual workflow showing email intake, matter organization, deadline tracking, draft documents, and attorney approval."
            />
          </div>

          <div className="login-visual-strip">
            <article className="login-visual-chip">
              <strong>Emails organized</strong>
              <span>into case folders</span>
            </article>
            <article className="login-visual-chip">
              <strong>Deadlines drafted</strong>
              <span>from verified rules</span>
            </article>
            <article className="login-visual-chip">
              <strong>Approval controlled</strong>
              <span>before anything is final</span>
            </article>
          </div>
        </section>

        <div className="auth-center-shell">
        <section className="auth-panel stack login-panel">
          <div className="auth-panel-header login-panel-header">
            <div className="login-wordmark-row">
              <LawpelWordmark compact />
            </div>
            <span className="auth-kicker">Litigation Operating System</span>
            <h1 className="auth-title">Stay in the case. We&apos;ll keep everything moving.</h1>
            <p className="muted">
              Email intake, deadline detection, living case documents, and approvals stay in one attorney-review
              workspace.
            </p>
          </div>

          <div className="login-action-stack">
            <ReviewBanner />
            <LoginForm />
          </div>

          <div className="button-row login-secondary-row">
            <Link className="button-secondary" href="/settings">
              Integration Settings
            </Link>
            <span className="login-fineprint">Demo access is available after sign in.</span>
          </div>
        </section>
        </div>
      </div>

      <LawpetChatWidget />
    </main>
  );
}
