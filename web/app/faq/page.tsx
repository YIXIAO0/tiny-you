import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ — Tiny You" };

export default function FaqPage() {
  return (
    <main>
      <div className="wrap legal">
        <h1>Frequently asked questions</h1>

        <h2>What kind of photo works best?</h2>
        <p>
          Any childhood photo of yourself — scans, faded prints, and slightly
          blurry snapshots all work. A photo where your face is reasonably
          visible gives the best result.
        </p>

        <h2>Will it actually look like me?</h2>
        <p>
          The portrait is built from the features that made you recognizable:
          your haircut, your eyes, your expression. It is a restoration-style
          portrait, not an exact photographic copy.
        </p>

        <h2>How much does it cost?</h2>
        <p>
          Generating a preview is free. Downloading your portrait without the
          watermark is a one-time purchase of $1.99. No subscription, no
          account.
        </p>

        <h2>What format do I get?</h2>
        <p>
          A high-resolution JPEG (2048&times;2048), ready to use as a profile
          picture anywhere.
        </p>

        <h2>What happens to my photo?</h2>
        <p>
          It is processed once, erased from our servers within 10 minutes, and
          never used to train any model. See our Privacy page for details.
        </p>

        <h2>Can I use the portrait commercially?</h2>
        <p>
          The portrait is yours. Use it as an avatar, print it, gift it — no
          attribution required.
        </p>
      </div>
    </main>
  );
}
