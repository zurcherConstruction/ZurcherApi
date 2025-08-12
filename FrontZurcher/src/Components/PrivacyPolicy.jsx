

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
            Zurcher Construction 
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: August 8, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              At Zurcher Construction, we respect your privacy and are committed to protecting 
              the data collected through our Construction Tracker mobile application. This policy 
              explains what data we collect, how we use it, and how we protect it.
            </p>
          </section>

          {/* Information we collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="mb-4">
              We collect limited data necessary for the operation of the application:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Photos of septic system installations uploaded by employees, taken outside residential buildings.</li>
              <li>Address or location of the project site, for tracking purposes.</li>
              <li>No personal information from users (such as name, email, phone number, or personal identifiers) is collected or stored in the app.</li>
              <li>Photo Library Access: The application may request access to your device’s photo library exclusively to allow employees to select and upload images directly related to construction projects. These photos are used solely for documenting and tracking work progress, such as installation steps and site conditions, and are not shared outside Zurcher Construction without authorization. The app does not access or store unrelated personal images.</li>
            </ul>
          </section>

          {/* Use of information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Use of Information</h2>
            <p className="mb-4">The data is used solely to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Document and track construction progress for internal project management.</li>
              <li>Allow supervisors to review field updates and site conditions.</li>
            </ul>
          </section>

          {/* Data sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing</h2>
            <p>
              We do not share data with third parties. Project data is only accessible to 
              authorized personnel within Zurcher Construction for operational purposes.
            </p>
          </section>

          {/* Data security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="mb-4">
              We apply technical and organizational measures to protect the data, including:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Secure authentication for accessing the app.</li>
              <li>Restricted access to project-related media.</li>
            </ul>
          </section>

          {/* Data retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p>
              Photos and project data are stored for the duration of the project and may be 
              retained afterward for legal or operational reasons.
            </p>
          </section>

          {/* User rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. User Rights</h2>
            <p>
              Since the app is used exclusively by authorized employees, data subject rights 
              (access, deletion, etc.) are managed internally by the company.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
            <p className="mb-4">
              For any questions regarding this policy or data practices, contact:
            </p>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p><strong>Zurcher Construction</strong></p>
              <p>Email: zurcherSeptic@gmail.com</p>
              <p>Phone: +1 (407) 419-4495</p>
            </div>
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

export default PrivacyPolicy;