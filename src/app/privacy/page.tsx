import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How nhimbe protects your data and respects your privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-200 mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-text-secondary mb-8">
        Last updated: March 2026
      </p>

      <div className="prose prose-lg space-y-8 text-text-secondary">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            1. Introduction
          </h2>
          <p>
            Nyuchi Africa (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates nhimbe, an events
            and gatherings platform. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            2. Information We Collect
          </h2>
          <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
            Personal Information
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Name and email address</li>
            <li>Phone number (optional)</li>
            <li>Profile picture (optional)</li>
            <li>Payment information (processed by our payment partners)</li>
            <li>Location data (with your consent)</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
            Usage Information
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Events you view, create, or attend</li>
            <li>Search queries and preferences</li>
            <li>Device information and browser type</li>
            <li>IP address and general location</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            3. How We Use Your Information
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Provide and maintain the Service</li>
            <li>Process event registrations and payments</li>
            <li>Send you event confirmations and updates</li>
            <li>Personalize your experience and recommendations</li>
            <li>Communicate with you about the Service</li>
            <li>Analyze usage patterns to improve the Service</li>
            <li>Detect and prevent fraud or abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            4. Information Sharing
          </h2>
          <p>We may share your information with:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-foreground">Event Hosts:</strong> When you register
              for an event, hosts receive your name and contact information
            </li>
            <li>
              <strong className="text-foreground">Other Mukoko Products:</strong> If you
              use Mukoko ID, your profile may be shared across the Mukoko ecosystem
            </li>
            <li>
              <strong className="text-foreground">Service Providers:</strong> Third parties
              that help us operate the Service (payment processors, email providers)
            </li>
            <li>
              <strong className="text-foreground">Legal Requirements:</strong> When required
              by law or to protect our rights
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            5. Data Security
          </h2>
          <p>
            We implement appropriate technical and organizational measures to protect
            your personal information. However, no method of transmission over the
            Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            6. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and data</li>
            <li>Object to certain processing activities</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent where applicable</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@nyuchi.com" className="text-primary hover:underline">
              privacy@nyuchi.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            7. Cookies and Tracking
          </h2>
          <p>
            We use cookies and similar technologies to enhance your experience,
            analyze usage, and personalize content. You can control cookie preferences
            through your browser settings. Essential cookies are required for the
            Service to function.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            8. Data Retention
          </h2>
          <p>
            We retain your personal information for as long as your account is active
            or as needed to provide you services. We may retain certain information
            as required by law or for legitimate business purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            9. International Transfers
          </h2>
          <p>
            Your information may be transferred to and processed in countries other
            than your own. We ensure appropriate safeguards are in place for such
            transfers in compliance with applicable data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            10. Children&apos;s Privacy
          </h2>
          <p>
            The Service is not intended for users under 13 years of age. We do not
            knowingly collect personal information from children under 13. If we
            become aware of such collection, we will delete the information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            11. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you
            of significant changes by email or through the Service. Your continued
            use of the Service after changes constitutes acceptance of the updated
            policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            12. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@nyuchi.com" className="text-primary hover:underline">
              privacy@nyuchi.com
            </a>
          </p>
          <p className="mt-4">
            <strong className="text-foreground">Nyuchi Africa</strong>
            <br />
            Harare, Zimbabwe
          </p>
        </section>
      </div>
    </div>
  );
}
