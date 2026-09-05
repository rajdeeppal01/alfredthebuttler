export default function PrivacyPolicy({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2>Privacy Policy</h2>
        <div className="modal-body">
          <p><strong>Effective Date:</strong> Today</p>
          <p>This Privacy Policy explains how we collect, use, and protect your information.</p>
          <h3>1. Information We Collect</h3>
          <p>We only collect the information necessary to provide you with the Assistant Dashboard services (e.g., tasks, API tokens for integrations stored locally).</p>
          <h3>2. How We Use Your Information</h3>
          <p>Your information is used strictly to provide the dashboard features and is not shared with third parties.</p>
          <h3>3. Data Security</h3>
          <p>We implement reasonable security measures to protect your data.</p>
        </div>
        <button onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    </div>
  );
}
