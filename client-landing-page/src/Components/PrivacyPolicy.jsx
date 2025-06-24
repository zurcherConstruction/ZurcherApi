import React from 'react'

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600">
            Zurcher Construction Tracker
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString('en-US')}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              At Zurcher Construction, we respect your privacy and are committed to protecting 
              your personal data. This privacy policy explains how we collect, use, and protect 
              your information when you use our construction project tracking application.
            </p>
          </section>

          {/* Information we collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.1 Personal Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Full name and contact information</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Company information</li>
                  <li>Job title or position within the company</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.2 Project Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Construction project data</li>
                  <li>Budgets and expenses</li>
                  <li>Material inventory</li>
                  <li>Project photos and documents</li>
                  <li>Project locations</li>
                  <li>Generated reports and analytics</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.3 Technical Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>IP address and device data</li>
                  <li>Browser and operating system information</li>
                  <li>Application usage logs</li>
                  <li>Geolocation data (only when necessary for project purposes)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How we use information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Provide and maintain our construction tracking services</li>
              <li>Manage and administer construction projects</li>
              <li>Generate performance reports and analytics</li>
              <li>Facilitate communication between work teams</li>
              <li>Improve functionality and user experience</li>
              <li>Provide technical support and customer service</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </section>

          {/* Information sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or transfer your personal information to third parties, 
              except in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>With authorized members of your team or organization</li>
              <li>With service providers who help us operate our platform</li>
              <li>When required by law or to protect our legal rights</li>
              <li>In case of merger, acquisition, or asset sale (with prior notice)</li>
            </ul>
          </section>

          {/* Data security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to 
              protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Data encryption in transit and at rest</li>
              <li>Two-factor authentication available</li>
              <li>Role-based access control</li>
              <li>Regular security audits</li>
              <li>Secure servers and regular backups</li>
              <li>Continuous threat monitoring</li>
            </ul>
          </section>

          {/* Data retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary for the 
              purposes described in this policy, or as required by law. Project data may 
              be retained for longer periods for legitimate archival purposes or regulatory 
              compliance in the construction industry.
            </p>
          </section>

          {/* User rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Restrict processing of your information</li>
              <li>Request data portability</li>
              <li>Withdraw your consent at any time</li>
            </ul>
          </section>

          {/* Third-party services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
            <p className="mb-4">
              Our application may integrate third-party services to enhance functionality:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Electronic signature services ( SignNow)</li>
              <li>Payment processing (Stripe)</li>
              <li>Cloud storage services</li>
              <li>Analytics and performance tools</li>
            </ul>
            <p className="mt-4">
              Each third-party service has its own privacy policies, which we recommend 
              reviewing.
            </p>
          </section>

          {/* Changes to policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of 
              significant changes via email or through a prominent notice in our application. 
              Your continued use of our services after such changes constitutes your acceptance 
              of the new policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="mb-4">
                If you have questions about this privacy policy or about the handling of 
                your personal data, you can contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> zurcherseptic@gmail.com</p>
                <p><strong>Company:</strong> Zurcher Construction</p>
                <p><strong>Application:</strong>Zurcher Construction</p>
                <p><strong>Location:</strong> Orlando, FL</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-500">
            This privacy policy is effective as of{' '}
            {new Date().toLocaleDateString('en-US')} and applies to all users 
            of Zurcher Construction.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy