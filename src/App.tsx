import { useEffect, useState } from "react";
import router from "./router";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import CheckoutModal from "./components/CheckoutModal";
import { getTrackingSettings } from "./services/DataServices";

const App = () => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const companyId = localStorage.getItem("companyId");
    const refreshToken = localStorage.getItem("refreshToken");

    const initTracking = async () => {
      if (token && userId && companyId) {
        try {
          const { data } = await getTrackingSettings(companyId);
          const settings = data?.data || data;

          if (settings) {
            window.ipcRenderer.send(
              "login",
              userId,
              settings,
              token,
              refreshToken
            );
            console.log("Auto-login initiated on startup");
          }
        } catch (err) {
          console.error("Failed to auto-start tracking:", err);
        }
      }
    };

    initTracking();

    window.ipcRenderer.on(
      "show-close-confirmation",
      (data: { date: string }) => {
        setCheckoutDate(data.date);
        setShowCheckoutModal(true);
      }
    );

    window.ipcRenderer.on("session-expired", () => {
      console.log("Session expired - logging out...");
      toast.error("Session expired. Please login again.");
      localStorage.clear();
      window.location.href = "/";
    });

    return () => {
      window.ipcRenderer.removeAllListeners("show-close-confirmation");
      window.ipcRenderer.removeAllListeners("session-expired");
    };
  }, []);

  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await window.ipcRenderer.invoke("confirm-checkout");
      if (result.success) {
        toast.success("Checked out successfully!");
        setShowCheckoutModal(false);
      } else {
        toast.error("Checkout failed: " + result.message);
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during checkout.");
      setIsCheckingOut(false);
    }
  };

  const handleCancelCheckout = () => {
    setShowCheckoutModal(false);
    window.ipcRenderer.send("cancel-close");
  };

  return (
    <AuthProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {router}

      <CheckoutModal
        isOpen={showCheckoutModal}
        date={checkoutDate}
        onConfirm={handleConfirmCheckout}
        onCancel={handleCancelCheckout}
        isLoading={isCheckingOut}
      />
    </AuthProvider>
  );
};

export default App;
