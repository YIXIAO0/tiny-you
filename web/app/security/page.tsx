import type { Metadata } from "next";

export const metadata: Metadata = { title: "Security — Tiny You" };

export default function SecurityPage() {
  return (
    <main>
      <div className="wrap legal">
        <h1>Security</h1>
        <p className="updated">Last updated: August 2026</p>

        <h2>Data minimization</h2>
        <p>
          The service requires no account and keeps no permanent copy of your
          photos. What we never store cannot be leaked.
        </p>

        <h2>In transit</h2>
        <p>
          Traffic between your browser, our servers, and our processing
          provider is encrypted with TLS.
        </p>

        <h2>On our servers</h2>
        <p>
          Photos and portraits are handled in memory and erased within 10
          minutes. There is no image database.
        </p>
      </div>
    </main>
  );
}
