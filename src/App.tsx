import { useEffect, useState } from "react";
import router from "./router";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import CheckoutModal from "./components/CheckoutModal";
import { getTrackingSettings } from "./services/DataServices";
const fetchIpGeolocation = async (): Promise<{
  latitude?: number;
  longitude?: number;
}> => {
  if (window.electronAPI?.getIpLocation) {
    try {
      const coords = await window.electronAPI.getIpLocation();
      if (coords.latitude && coords.longitude) {
        return coords;
      }
    } catch (err) {
      console.error("IPC getIpLocation failed:", err);
    }
  }
  return {};
};

const getCoordinates = async (): Promise<{
  latitude?: number;
  longitude?: number;
}> => {
  console.log(
    "[getCoordinates] Fetching coordinates via IP-based Geolocation...",
  );
  const coords = await fetchIpGeolocation();
  if (coords.latitude && coords.longitude) {
    localStorage.setItem("locationPermissionGranted", "true");
    window.dispatchEvent(new Event("location-permission-changed"));
    if (window.electronAPI?.setLocationPermissionAllowed) {
      await window.electronAPI.setLocationPermissionAllowed(true);
    }
    console.log(
      `[getCoordinates Success] Latitude: ${coords.latitude}, Longitude: ${coords.longitude}`,
    );
    return coords;
  } else {
    console.warn(
      "[getCoordinates Failed] Unable to retrieve IP-based coordinates.",
    );
    toast.error(
      "Failed to retrieve location coordinates. Please ensure your device is connected to the internet.",
    );
    return {};
  }
};

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
        const hasPermission =
          localStorage.getItem("locationPermissionGranted") === "true";
        if (!hasPermission) {
          toast.error("Please allow location permission first.");
          if (window.electronAPI) {
            const userAllowed =
              await window.electronAPI.requestLocationPermissionConfirm();
            if (userAllowed) {
              localStorage.setItem("locationPermissionGranted", "true");
              window.dispatchEvent(new Event("location-permission-changed"));
              await window.electronAPI.setLocationPermissionAllowed(true);
              setTimeout(initTracking, 500);
            }
          }
          return;
        }

        try {
          const { data } = await getTrackingSettings(companyId);
          const settings = data?.data || data;
          if (settings) {
            const coords = await getCoordinates();
            console.log(
              `[App-Startup-Auto-Login] Sending check-in API request. Coordinates -> Latitude: ${coords.latitude}, Longitude: ${coords.longitude}`,
            );
            if (window.electronAPI) {
              const result = await window.electronAPI!.login(
                userId,
                settings,
                token,
                refreshToken || undefined,
                undefined,
                coords.latitude,
                coords.longitude,
              );
              if (result.success) {
                console.log("Auto-login completed successfully on startup");
              } else {
                console.warn("Auto-login check-in failed:", result.message);
              }
            } else {
              console.log("Auto-login initiated on startup (no electronAPI)");
            }
          }
        } catch (err) {
          console.error("Failed to auto-start tracking:", err);
        }
      }
    };

    const setupLocationAndInit = async () => {
      if (window.electronAPI) {
        const allowed =
          localStorage.getItem("locationPermissionGranted") === "true";
        if (allowed) {
          await window.electronAPI.setLocationPermissionAllowed(true);
        } else {
          const userAllowed =
            await window.electronAPI.requestLocationPermissionConfirm();
          if (userAllowed) {
            localStorage.setItem("locationPermissionGranted", "true");
            window.dispatchEvent(new Event("location-permission-changed"));
            await window.electronAPI.setLocationPermissionAllowed(true);
          }
        }
      }
      initTracking();
    };

    setupLocationAndInit();
    window.ipcRenderer?.on(
      "show-close-confirmation",
      (data: { date: string }) => {
        setCheckoutDate(data.date);
        setShowCheckoutModal(true);
      },
    );
    window.ipcRenderer?.on("session-expired", () => {
      console.log("Session expired - logging out...");
      toast.error("Session expired. Please login again.");
      if (window.electronAPI?.logout) {
        window.electronAPI.logout();
      }
      const locPerm = localStorage.getItem("locationPermissionGranted");
      localStorage.clear();
      if (locPerm) localStorage.setItem("locationPermissionGranted", locPerm);
      window.location.href = "/";
    });
    window.ipcRenderer?.on("logout-success", () => {
      console.log(
        "Logout success event received - clearing local storage and redirecting.",
      );
      const locPerm = localStorage.getItem("locationPermissionGranted");
      localStorage.clear();
      if (locPerm) localStorage.setItem("locationPermissionGranted", locPerm);
      window.location.href = "/";
    });
    return () => {
      window.ipcRenderer?.removeAllListeners("show-close-confirmation");
      window.ipcRenderer?.removeAllListeners("session-expired");
      window.ipcRenderer?.removeAllListeners("logout-success");
    };
  }, []);
  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await window.ipcRenderer?.invoke("confirm-checkout");
      if (result && result.success) {
        toast.success("Checked out successfully!");
        const locPerm = localStorage.getItem("locationPermissionGranted");
        localStorage.clear();
        if (locPerm) localStorage.setItem("locationPermissionGranted", locPerm);
        setShowCheckoutModal(false);
      } else {
        toast.error("Checkout failed: " + (result?.message || "Unknown error"));
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
    window.ipcRenderer?.send("cancel-close");
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
