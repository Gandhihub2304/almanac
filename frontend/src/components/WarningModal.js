import "./Modal.css";

const getVariant = (message) => {
  const normalized = (message || "").toLowerCase();

  if (message?.includes("✅") || normalized.includes("saved successfully") || normalized.includes("successfully saved")) {
    return "success";
  }

  if (
    message?.includes("❌")
    || normalized.includes("failed")
    || normalized.includes("error")
    || normalized.includes("unable")
    || normalized.includes("invalid")
  ) {
    return "error";
  }

  return "warning";
};

function WarningModal({ message, onClose }) {
  const variant = getVariant(message);
  const titleByVariant = {
    warning: "Warning",
    error: "Error",
    success: "Success"
  };

  return (
    <div className="modalOverlay modalOverlayCompact" onClick={onClose}>
      <div className={`modalCard notificationCard notificationCard--${variant}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-live="assertive">
        <div className="notificationHeader">
          <div className="notificationIcon" aria-hidden="true">
            {variant === "success" ? "✓" : variant === "error" ? "!" : "⚠"}
          </div>
          <div>
            <h2 className="notificationTitle">{titleByVariant[variant]}</h2>
            <p className="notificationMessage">{message}</p>
          </div>
        </div>
        <button
          className={`compactBtn notificationCloseBtn notificationCloseBtn--${variant}`}
          onClick={onClose}
          style={{ width: "auto", minWidth: "72px" }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default WarningModal;
