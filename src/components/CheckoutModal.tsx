import React from "react";

type CheckoutModalProps = {
  isOpen: boolean;
  date: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  date,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: "1.25rem", color: "#333" }}>
          Confirm Checkout
        </h2>
        <p style={{ marginBottom: "20px", color: "#666" }}>
          Do you want to checkout for today (<strong>{date}</strong>)?
          <br />
          <small>Closing without checkout may lose tracked hours.</small>
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "transparent",
              cursor: "pointer",
              color: "#333",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "#007bff",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {isLoading ? "Checking out..." : "Yes, Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
