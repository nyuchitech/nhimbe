import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "nhimbe terms and conditions for using our community events platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-200 mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="text-text-secondary mb-8">
        Last updated: March 2026
      </p>

      <div className="prose prose-lg space-y-8 text-text-secondary">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using nhimbe (&ldquo;the Service&rdquo;), operated by Nyuchi Africa
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            2. Description of Service
          </h2>
          <p>
            nhimbe is an events and gatherings platform that enables users to discover,
            create, and manage community events. The Service is part of the Mukoko
            ecosystem and may integrate with other Mukoko products.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            3. User Accounts
          </h2>
          <p>
            To use certain features of the Service, you must create an account. You are
            responsible for maintaining the confidentiality of your account credentials
            and for all activities that occur under your account. You must provide
            accurate and complete information when creating your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            4. Event Creation and Management
          </h2>
          <p>
            Event hosts are responsible for the accuracy of event information, compliance
            with local laws and regulations, and fulfilling commitments made to attendees.
            We reserve the right to remove events that violate these terms or our
            community guidelines.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            5. Payments and Refunds
          </h2>
          <p>
            Payments for ticketed events are processed through our payment partners.
            Refund policies are set by individual event hosts. We are not responsible
            for refunds or disputes between hosts and attendees, though we may assist
            in mediation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            6. User Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Post false, misleading, or fraudulent content</li>
            <li>Harass, threaten, or intimidate other users</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Interfere with the proper functioning of the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            7. Intellectual Property
          </h2>
          <p>
            The Service and its original content, features, and functionality are owned
            by Nyuchi Africa and are protected by international copyright, trademark,
            and other intellectual property laws. Users retain ownership of content they
            create but grant us a license to use it in connection with the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            8. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Nyuchi Africa shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages
            resulting from your use of the Service. Our total liability shall not exceed
            the amount you paid us in the past twelve months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            9. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users
            of significant changes via email or through the Service. Continued use of
            the Service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            10. Governing Law
          </h2>
          <p>
            These terms shall be governed by the laws of Zimbabwe, without regard to
            conflict of law provisions. Any disputes shall be resolved in the courts
            of Harare, Zimbabwe.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            11. Contact Us
          </h2>
          <p>
            If you have questions about these Terms, please contact us at{" "}
            <a href="mailto:legal@nyuchi.com" className="text-primary hover:underline">
              legal@nyuchi.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
