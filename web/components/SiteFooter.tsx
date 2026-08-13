import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <nav className="footer-nav">
          <Link href="/privacy">Privacy</Link>
          <Link href="/security">Security</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <p className="copyright">
          &copy; {new Date().getFullYear()} Tiny You. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
