import { Button } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../services/AuthServices";
import { getTrackingSettings } from "../../services/DataServices";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  console.log(user)

  const handleLogout = async () => {
    try {
      window.electronAPI.logout();

      localStorage.removeItem("userId");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      const res = await logout();

      if (res.status === 200) {
        toast.success(res?.data?.message || "Logged out successfully");
        navigate("/login");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message || "Facing some error in log out"
      );
    }
  };

  const handleGetSetting = async () => {
    try {
      const res = await getTrackingSettings(user.trackingSettingsId._id);

      if (res.status === 200) {
        toast.success(res?.data?.message || "Logged out successfully");
        navigate("/login");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message || "Facing some error in log out"
      );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-5">
      <div className="flex justify-between p-10 bg-blue-50 gap-10">
        <Button variant="contained">
          <Link to="/">Go to login page</Link>
        </Button>

        <Button variant="contained" onClick={handleLogout}>
          logout
        </Button>

        <Button variant="contained" onClick={handleGetSetting}>
          get settings
        </Button>
      </div>
    </div>
  );
}

export default Dashboard;
