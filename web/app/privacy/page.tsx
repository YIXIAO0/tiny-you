import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — Tiny You" };

export default function PrivacyPage() {
  return (
    <main>
      <div className="wrap legal">
        <h1>Privacy</h1>
        <p className="updated">Last updated: August 2026</p>

        <h2>What we process</h2>
        <p>
          The photo you upload is used once: to identify its visible features
          (hairstyle, expression, and similar attributes) and to generate your
          portrait. Generation is performed by a third-party AI infrastructure
          provider.
        </p>

        <h2>What we store</h2>
        <p>
          Nothing permanently. Your uploaded photo is held in memory only while
          your portrait is being generated. The finished portrait is held in
          memory for up to 10 minutes so you can download it, then erased. We
          do not keep a database or archive of photos or portraits.
        </p>
        <p>
          Generated images are delivered to us through provider-hosted links
          that expire automatically within 24 hours.
        </p>

        <h2>Training</h2>
        <p>We do not use your photos to train any model.</p>

        <h2>Your responsibilities</h2>
        <p>
          Only upload photos you have the right to use — your own childhood
          photos, or photos with permission from the people in them or their
          guardians.
        </p>

        <h2 id="cookies">Cookies</h2>
        <p>This site sets no cookies.</p>
      </div>
    </main>
  );
}
