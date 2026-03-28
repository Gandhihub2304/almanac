import "./Modal.css";

function WarningModal({ message, onClose }) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ Warning</h2>
        <p style={{ color: "#2c5b81", marginBottom: "16px", fontSize: "0.88rem" }}>{message}</p>
        <button
          className="compactBtn compactBtnDanger"
          onClick={onClose}
          style={{ width: "auto", minWidth: "70px" }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default WarningModal;
