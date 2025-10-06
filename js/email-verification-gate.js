/**
 * Email Verification Gate
 * Enforces email verification requirement by logging out unverified users
 * Shows a message prompting them to verify their email first
 */

(function() {
  'use strict';

  let verificationCheckDone = false;

  // Show verification required modal
  function showVerificationRequiredModal(userEmail) {
    // Remove existing modal if any
    const existing = document.getElementById('verificationRequiredModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'verificationRequiredModal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
      ">
        <div style="
          background: white;
          border-radius: 24px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          animation: slideUp 0.3s ease-out;
        ">
          <div style="
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 40px;
          ">
            ✉️
          </div>

          <h2 style="
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 16px 0;
          ">
            Email Verification Required
          </h2>

          <p style="
            font-size: 16px;
            color: #475569;
            line-height: 1.6;
            margin: 0 0 24px 0;
          ">
            We've sent a verification email to:<br>
            <strong style="color: #14b8a6;">${userEmail || 'your email address'}</strong>
          </p>

          <div style="
            background: #f0fdfa;
            border: 1px solid #14b8a6;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
          ">
            <p style="
              font-size: 14px;
              color: #0f766e;
              margin: 0 0 8px 0;
              font-weight: 600;
            ">
              📋 Next steps:
            </p>
            <ol style="
              font-size: 14px;
              color: #0f766e;
              margin: 0;
              padding-left: 20px;
            ">
              <li>Check your inbox for the verification email</li>
              <li>Click the verification link in the email</li>
              <li>Return here and sign in again</li>
            </ol>
          </div>

          <div style="display: flex; gap: 12px; flex-direction: column;">
            <button id="resendVerificationEmailBtn" style="
              background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
              color: white;
              border: none;
              padding: 14px 24px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            ">
              Resend Verification Email
            </button>

            <button id="closeVerificationModalBtn" style="
              background: #f1f5f9;
              color: #475569;
              border: none;
              padding: 14px 24px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            ">
              Close
            </button>
          </div>

          <p style="
            font-size: 12px;
            color: #94a3b8;
            margin: 16px 0 0 0;
          ">
            Didn't receive the email? Check your spam folder or click resend.
          </p>
        </div>
      </div>
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      #resendVerificationEmailBtn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
      }
      #closeVerificationModalBtn:hover {
        background: #e2e8f0;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = document.getElementById('closeVerificationModalBtn');
    const resendBtn = document.getElementById('resendVerificationEmailBtn');

    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    resendBtn.addEventListener('click', async () => {
      const originalText = resendBtn.textContent;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';
      resendBtn.style.opacity = '0.7';

      try {
        // Call resend function (to be implemented)
        const response = await fetch('/.netlify/functions/resend-verification-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        if (response.ok) {
          resendBtn.textContent = '✓ Email Sent!';
          resendBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else {
          throw new Error('Failed to resend');
        }
      } catch (error) {
        console.error('Error resending verification:', error);
        resendBtn.textContent = '✗ Failed to send';
        resendBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      }

      setTimeout(() => {
        resendBtn.textContent = originalText;
        resendBtn.style.background = 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)';
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
      }, 3000);
    });
  }

  // Check email verification and enforce requirement
  async function enforceEmailVerification() {
    // Prevent multiple checks
    if (verificationCheckDone) return;

    try {
      // Wait for Auth0 to be ready
      if (!window.auth0Client) {
        console.log('⏳ Waiting for Auth0 client...');
        setTimeout(enforceEmailVerification, 500);
        return;
      }

      const isAuthenticated = await window.auth0Client.isAuthenticated();

      if (isAuthenticated) {
        const user = await window.auth0Client.getUser();

        // Check if email is verified
        if (user && !user.email_verified) {
          console.log('❌ Email not verified - logging out user');

          verificationCheckDone = true;

          // Show verification required modal
          showVerificationRequiredModal(user.email);

          // Log out the user
          await window.auth0Client.logout({
            logoutParams: {
              returnTo: window.location.origin
            }
          });
        } else if (user && user.email_verified) {
          console.log('✅ Email verified - user can access platform');
          verificationCheckDone = true;
        }
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(enforceEmailVerification, 1000);
    });
  } else {
    setTimeout(enforceEmailVerification, 1000);
  }

  // Also check when auth state changes
  window.addEventListener('authStateChanged', enforceEmailVerification);

})();
