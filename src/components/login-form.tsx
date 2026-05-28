"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("attorney@riverachenlaw.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password
          })
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Login failed.");
        }

        router.push("/dashboard");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Login failed.");
      }
    });
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label className="label">Email</label>
        <input
          className="field"
          type="email"
          placeholder="attorney@firm.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          className="field"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="button-row">
        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Signing In..." : "Enter Review Workspace"}
        </button>
      </div>
      {error ? <div className="form-error">{error}</div> : null}
    </form>
  );
}
