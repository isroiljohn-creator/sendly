import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] py-16 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans antialiased">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/60 shadow-xl rounded-3xl p-8 sm:p-16">
        
        {/* Header */}
        <div className="text-center border-b border-slate-100 pb-10 mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-600 tracking-widest uppercase">Official Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Last Updated: May 26, 2026
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-slate max-w-none text-slate-600 space-y-8 text-[15px] leading-relaxed">
          
          <div className="bg-indigo-50/40 border border-indigo-100/80 rounded-2xl p-6 sm:p-8 mb-8 text-slate-700">
            <p className="font-semibold text-slate-800 mb-2">Overview</p>
            <p>
              This Privacy Policy explains how <strong>Sendly</strong> (“Company,” “We,” “Us,” or “Our”) collects, uses, shares, and otherwise processes your personal data and your rights regarding your personal data. 
              We provide you with our website <a href="https://www.sendly.uz" className="text-indigo-600 hover:underline font-medium">https://www.sendly.uz</a> as well as the services, chatbot tools, analytics, and offerings made available to you through this website (“Services”).
            </p>
            <p className="mt-4">
              By accessing or using our Services, you agree with and accept this Privacy Policy. If you do not agree, please do not access or use our Services.
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              1. Definitions
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>“Personal Data”</strong> means information that relates to, describes, or identifies you. This includes your name, username, email, Page Access Tokens, and direct message records.
              </li>
              <li>
                <strong>“You”</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.
              </li>
              <li>
                <strong>“Meta Platform Data”</strong> means any information or logs retrieved through the Meta Graph APIs, including Page Access Tokens, Instagram Page IDs, message payloads, and comment texts.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              2. Information We Collect
            </h2>
            
            <h3 className="text-md font-bold text-slate-800 mt-4 mb-2">A. Information You Provide to Us</h3>
            <p className="mb-3">
              When you use or access the Service, create an account, or configure automation triggers, you voluntarily provide us with the following data:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Profile Information:</strong> Full name, email address, password, billing/payment info, and connected workspace settings.
              </li>
              <li>
                <strong>Channel Details:</strong> Personal or professional configuration details connected with your Instagram Accounts or Telegram Bots (including tokens, usernames, and profile pictures).
              </li>
              <li>
                <strong>Automation Media & Assets:</strong> Photos, images, buttons, templates, and reply text structures you upload to our Service.
              </li>
            </ul>

            <h3 className="text-md font-bold text-slate-800 mt-4 mb-2">B. Information Collected automatically</h3>
            <p className="mb-3">
              When you visit or use our Service, we automatically track certain device and usage metrics:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Browser Data:</strong> IP address, browser type, browser language, referring/exit pages, and usage patterns.
              </li>
              <li>
                <strong>Device Data:</strong> Device model, manufacturer, operating system version, and general location data.
              </li>
              <li>
                <strong>Usage & Analytics:</strong> Session times, page views, click rates, features accessed, and interaction flows.
              </li>
            </ul>

            <h3 className="text-md font-bold text-slate-800 mt-4 mb-2">C. Information Collected from Meta Graph APIs</h3>
            <p className="mb-3">
              When you authenticate with Facebook Login, we collect specific data to execute chatbot routines:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Page Access Tokens:</strong> Necessary for sending automated replies to your users. <strong>All access tokens are AES-256 encrypted</strong> prior to database persistence.
              </li>
              <li>
                <strong>Conversations & Comments:</strong> Message contents, comment strings, stories mentions, and mentions sent by your audience. This data is kept in order to parse keywords and trigger automated responses.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              3. Purposes for Which We Use Personal Data
            </h2>
            <p className="mb-3">
              We process your Personal Data for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain the Service, execute automations, and manage your account.</li>
              <li>To improve, optimize, and debug the Service by analyzing usage patterns.</li>
              <li>To communicate with you regarding updates, technical issues, billing, and promotions.</li>
              <li>To protect against fraud, malicious actions, or violations of our Terms of Service.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              4. How We Disclose Personal Data
            </h2>
            <p className="mb-3">
              We do not sell, rent, or trade your personal data. We disclose personal data only in the following limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service Providers:</strong> Standard third-party vendors who assist in hostings, databases, email delivery, or payment gateways. They are contractually bound to protect your data.
              </li>
              <li>
                <strong>Legal Compliance:</strong> When required by public authorities or law enforcement orders to prevent crime or protect rights.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              5. Security of Your Personal Data
            </h2>
            <p>
              We implement robust technical and administrative security measures, including database level Row Level Security (RLS), SSL transport layers, and symmetric token encryption (AES-256) to prevent data loss or unauthorized access. While no system on the internet is 100% secure, we maintain reasonable precautions to safeguard your data.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              6. User Data Deletion Instructions (Meta Compliant)
            </h2>
            <p className="mb-3">
              In accordance with Meta Platform Policy and GDPR, we provide clear instructions on how to request deletion of your platform data:
            </p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h4 className="font-bold text-slate-900">Follow these steps to permanently delete your data:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                <li>Log in to your Sendly Account at <a href="https://www.sendly.uz/login" className="font-semibold text-indigo-600 hover:underline">https://www.sendly.uz/login</a>.</li>
                <li>Go to the <strong>Settings</strong> page.</li>
                <li>Find your connected Instagram account and click <strong>"Disconnect"</strong>.</li>
                <li>Click <strong>"Delete All Account Data"</strong> at the bottom of the page. This instantly and permanently erases your access tokens, message logs, contacts, and configurations from our cloud databases.</li>
                <li>Alternatively, you can email our support desk at <a href="mailto:6220v1@gmail.com" className="font-semibold text-indigo-600 hover:underline">6220v1@gmail.com</a>. We will process and confirm your deletion request within 24 hours.</li>
              </ol>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              7. Personal Data Rights for European Union (GDPR)
            </h2>
            <p className="mb-3">
              If you are located in the European Union (EU) or European Economic Area (EEA), you have specific rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Data Controller:</strong> Sendly, operated in Tashkent, Uzbekistan.</li>
              <li><strong>Legal Basis:</strong> We process your data based on your explicit consent (when linking accounts), execution of contract (providing automations), and legitimate business interests.</li>
              <li>
                <strong>Your Rights:</strong> Right to Access, Right to Rectification (Correct), Right to Erasure (Delete), Right to Restrict Processing, Right to Data Portability, and Right to Object.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact our Data Protection Officer at <a href="mailto:6220v1@gmail.com" className="text-indigo-600 hover:underline">6220v1@gmail.com</a>.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              8. California Consumer Privacy Act (CCPA) Rights
            </h2>
            <p className="mb-3">
              If you are a resident of California, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The right to request disclosure of what personal information we collect, use, and share.</li>
              <li>The right to request the deletion of your personal information collected by us.</li>
              <li>The right to not receive discriminatory treatment for exercising your CCPA rights.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              9. Children's Privacy
            </h2>
            <p>
              Our Service is not directed to individuals under the age of 13. We do not knowingly collect personal data from children. If we discover we have inadvertently collected data from a child under 13 without verification of parental consent, we will delete that data immediately.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new version on this page and updating the "Last Updated" date. Your continued use of the Service constitutes your acceptance of the revised policy.
            </p>
          </section>

          {/* Section 11 */}
          <section className="border-t border-slate-100 pt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-indigo-600 pl-3">
              11. Questions & Support
            </h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact our support team at:
              <br />
              <strong>Email:</strong> <a href="mailto:6220v1@gmail.com" className="text-indigo-600 hover:underline">6220v1@gmail.com</a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Sendly Inc. All rights reserved. Registered in Tashkent, Uzbekistan.
        </div>
      </div>
    </div>
  );
}
