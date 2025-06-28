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
                  <li>Project details and descriptions</li>
                  <li>Work progress updates</li>
                  <li>Photos and documents related to projects</li>
                  <li>Budget and financial information</li>
                  <li>Timeline and scheduling data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.3 Technical Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Device information (IP address, browser type)</li>
                  <li>Usage analytics and application performance data</li>
                  <li>Login credentials and authentication tokens</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How we use information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain our construction tracking services</li>
              <li>To communicate project updates and important notifications</li>
              <li>To manage user accounts and authentication</li>
              <li>To analyze usage patterns and improve our application</li>
              <li>To comply with legal obligations and regulations</li>
              <li>To protect against fraud and ensure security</li>
            </ul>
          </section>

          {/* Information sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>With project stakeholders who need access to project information</li>
              <li>With service providers who assist us in operating our application</li>
              <li>When required by law or to protect our legal rights</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          {/* Data security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal 
              data against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication protocols</li>
              <li>Employee training on data protection practices</li>
            </ul>
          </section>

          {/* Data retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary to fulfill the purposes 
              outlined in this privacy policy, comply with legal obligations, resolve disputes, and 
              enforce our agreements. Project data may be retained for the duration of the project 
              and for a reasonable period thereafter for reference and legal compliance.
            </p>
          </section>

          {/* Your rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request data portability</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p>
              Our application uses cookies and similar technologies to enhance user experience, 
              analyze usage patterns, and maintain user sessions. You can control cookie settings 
              through your browser preferences.
            </p>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Policy Updates</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any 
              material changes by posting the new policy on our application and updating the 
              "Last updated" date at the top of this policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
            <p>
              If you have any questions about this privacy policy or our data practices, 
              please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p><strong>Zurcher Construction</strong></p>
              <p>Email: zurcher44@gmail.com</p>
              <p>Phone: +1 (407) 419-4495</p>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Compliance</h2>
            <p>
              This privacy policy is designed to comply with applicable data protection laws 
              and regulations, including but not limited to the California Consumer Privacy Act (CCPA) 
              and other relevant privacy legislation.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            By using our application, you acknowledge that you have read and understood this privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
