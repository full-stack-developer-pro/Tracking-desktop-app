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
    // 1. Startup Logic: Check for existing token and auto-login
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const companyId = localStorage.getItem("companyId");
    const refreshToken = localStorage.getItem("refreshToken");

    const initTracking = async () => {
      if (token && userId && companyId) {
        try {
          // Fetch settings to ensure we are up to date (and to get 'isActive')
          // Note: This relies on axiosInstance using the localStorage token
          const { data } = await getTrackingSettings(companyId);
          const settings = data?.data || data; // Adjust based on actual API response structure

          if (settings) {
            // Using electronAPI is cleaner if available, but staying consistent with 'ipcRenderer' style for now
            // window.electronAPI.login(userId, settings, token);
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
          // Optionally redirect to login if token is invalid
        }
      }
    };

    initTracking();

    // 2. Checkout Modal Listener
    // Note: 'on' returns void in our custom implementation, so we cannot unsubscribe using its return value.
    window.ipcRenderer.on(
      "show-close-confirmation",
      (data: { date: string }) => {
        // Preload strips event, so first arg is data
        setCheckoutDate(data.date);
        setShowCheckoutModal(true);
      }
    );

    return () => {
      window.ipcRenderer.removeAllListeners("show-close-confirmation");
    };
  }, []);

  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await window.ipcRenderer.invoke("confirm-checkout");
      if (result.success) {
        toast.success("Checked out successfully!");
        setShowCheckoutModal(false);
        // Window will close automatically from Main process
      } else {
        toast.error("Checkout failed: " + result.message);
        setIsCheckingOut(false);
        // Do we close anyway? User said "otherwise do not close".
        // So we leave modal open or just stop loading.
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
