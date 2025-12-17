import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../services/AuthServices";
import { getTrackingSettings } from "../../services/DataServices";
import { CssVarsProvider, extendTheme, useColorScheme } from "@mui/joy/styles";
import GlobalStyles from "@mui/joy/GlobalStyles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import IconButton, { IconButtonProps } from "@mui/joy/IconButton";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

const WEBSITE_LOGIN_URL = `${
  import.meta.env.VITE_FRONTEND_URL || "https://tracking-panel-pi.vercel.app"
}/authorize-app`;

function ColorSchemeToggle(props: IconButtonProps) {
  const { onClick, ...other } = props;
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <IconButton
      aria-label="toggle light/dark mode"
      size="sm"
      variant="outlined"
      disabled={!mounted}
      onClick={(event) => {
        setMode(mode === "light" ? "dark" : "light");
        onClick?.(event);
      }}
      {...other}
    >
      {mode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
    </IconButton>
  );
}

const customTheme = extendTheme({
  colorSchemes: {
    light: {},
    dark: {},
  },
});

function Dashboard() {
  const navigate = useNavigate();
  const userString = localStorage.getItem("user");
  const user = JSON.parse(userString || "{}");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle Session Expiration
  useEffect(() => {
    const handleAuthLogout = () => {
      toast.warning("Session expired. Please login again.");
      navigate("/login");
    };

    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.electronAPI?.logout();

      localStorage.removeItem("userId");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      localStorage.removeItem("companyId");
      localStorage.removeItem("trackingSettings");

      const res = await logout(); // Call API to invalidate token (optional)

      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error: any) {
      // Force logout even if API fails
      toast.info("Logged out locally");
      localStorage.clear();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleBrowserLogin = () => {
    if (window.electronAPI?.openBrowserAuth) {
      window.electronAPI.openBrowserAuth(WEBSITE_LOGIN_URL);
      toast.info("Opening browser for authentication...");
    } else {
      toast.error("Browser login not supported in this version.");
    }
  };

  return (
    <CssVarsProvider theme={customTheme} defaultMode="dark">
      <CssBaseline />
      <GlobalStyles
        styles={{
          ":root": {
            "--Transition-duration": "0.4s",
          },
        }}
      />
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "background.body",
          p: 2,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 500,
            gap: 2,
            boxShadow: "lg",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography level="h4" component="h1">
              Dashboard
            </Typography>
            <ColorSchemeToggle />
          </Box>
          <Divider />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "success.500",
                boxShadow: "0 0 0 4px rgba(25, 135, 84, 0.2)",
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%": {
                    boxShadow: "0 0 0 0px rgba(25, 135, 84, 0.2)",
                  },
                  "100%": {
                    boxShadow: "0 0 0 10px rgba(25, 135, 84, 0)",
                  },
                },
              }}
            />
            <Box>
              <Typography level="title-md" color="success">
                Monitoring Active
              </Typography>
              {/* <Typography level="body-sm">
                Screenshots & Activity Tracking
              </Typography> */}
            </Box>
          </Box>

          <Card variant="soft" color="primary">
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <CheckCircleRoundedIcon />
              <Box>
                <Typography level="title-sm">
                  Logged in as {user.name || "User"}
                </Typography>
                {/* <Typography level="body-xs">
                  {user.email || "No email"}
                </Typography> */}
              </Box>
            </Box>
          </Card>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {/* <Button
              variant="solid"
              color="danger"
              startDecorator={<LogoutRoundedIcon />}
              onClick={handleLogout}
              loading={isLoggingOut}
            >
              Logout
            </Button>

            <Divider>OR</Divider> */}

            <Button
              variant="outlined"
              color="neutral"
              startDecorator={<OpenInNewRoundedIcon />}
              onClick={handleBrowserLogin}
            >
              Login via Website
            </Button>
            <Typography level="body-xs" sx={{ textAlign: "center", mt: -1 }}>
              Use this if your session expired or you need to switch accounts.
            </Typography>
          </Box>
        </Card>
      </Box>
    </CssVarsProvider>
  );
}

export default Dashboard;
