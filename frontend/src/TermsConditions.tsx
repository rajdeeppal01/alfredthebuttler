export default function TermsConditions({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2>Terms & Conditions</h2>
        <div className="modal-body">
          <p><strong>Effective Date:</strong> Today</p>
          <p>Welcome to the Assistant Dashboard. By using our application, you agree to these terms.</p>
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing the dashboard, you are agreeing to be bound by these Terms and Conditions.</p>
          <h3>2. Use License</h3>
          <p>Permission is granted to use this software for personal, non-commercial use.</p>
          <h3>3. Limitations</h3>
          <p>In no event shall the developers be liable for any damages arising out of the use of the dashboard.</p>
        </div>
        <button onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    </div>
  );
}
