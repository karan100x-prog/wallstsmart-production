const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: September 27, 2025</p>
        
        <div className="space-y-8">
          {/* Our Mission */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Our Mission</h2>
            <p className="text-gray-300 mb-3">
              Our goal is to provide the best financial data in the form that you understand. 
              We believe privacy and transparency go hand-in-hand with delivering quality financial analytics.
            </p>
            <p className="text-white font-semibold mb-3">
              No advertisements. No data selling. No distractions.
            </p>
            <p className="text-gray-300">
              Your portfolio data stays private, and your experience stays clean. 
              We make money through optional premium features (not available yet), not by selling your attention or information to advertisers.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Information Collection</h2>
            <div className="mb-4">
              <p className="font-medium text-gray-200 mb-2">What we collect:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Email address (for authentication)</li>
                <li>Portfolio data you enter (stocks, quantities, prices)</li>
                <li>Watchlist selections</li>
                <li>Usage statistics (pages visited, features used)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-200 mb-2">What we DON'T collect:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Banking information</li>
                <li>Social security numbers</li>
                <li>Credit card details (handled by Stripe)</li>
                <li>Personal identification documents</li>
              </ul>
            </div>
          </section>

          {/* Use of Information */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Use of Information</h2>
            <p className="text-gray-300 mb-2">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Provide portfolio analytics and real-time market data</li>
              <li>Calculate your gains/losses</li>
              <li>Save your watchlists</li>
              <li>Improve our service</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Sharing</h2>
            <div className="mb-4">
              <p className="font-medium text-gray-200 mb-2">We never:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Sell your personal data</li>
                <li>Share your portfolio with other users</li>
                <li>Display your information publicly</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-200 mb-2">We only share data:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>When required by law</li>
                <li>To protect against fraud</li>
                <li>With your explicit consent</li>
              </ul>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <ul className="space-y-2 text-gray-400">
              <li><span className="text-gray-200 font-medium">Firebase:</span> Authentication & database</li>
              <li><span className="text-gray-200 font-medium">Alpha Vantage:</span> Market data (no personal data shared)</li>
              <li><span className="text-gray-200 font-medium">Vercel:</span> Hosting</li>
              <li><span className="text-gray-200 font-medium">Stripe:</span> Payment processing (premium accounts)</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Security</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>All connections encrypted (HTTPS)</li>
              <li>Passwords hashed with bcrypt</li>
              <li>Data stored on secure Google Cloud servers</li>
              <li>Regular security updates</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your Rights</h2>
            <p className="text-gray-300 mb-2">You can:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Export your data anytime</li>
              <li>Delete your account</li>
              <li>Update your information</li>
              <li>Opt-out of emails</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Cookies</h2>
            <p className="text-gray-300 mb-2">We use essential cookies for:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Keeping you logged in</li>
              <li>Security</li>
              <li>Remembering preferences</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="text-gray-300">
              Questions about privacy?<br />
              <span className="text-white">Email:</span> privacy@wallstsmart.com
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changes</h2>
            <p className="text-gray-300">
              We'll notify you of any significant changes to this policy via email.
            </p>
          </section>

          {/* Legal */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Legal</h2>
            <p className="text-gray-300">
              WallStSmart provides tools for informational purposes only. We are not investment advisors.
            </p>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-800 pt-8 mt-12">
            <p className="text-sm text-gray-500 text-center">
              By using WallStSmart, you agree to this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
