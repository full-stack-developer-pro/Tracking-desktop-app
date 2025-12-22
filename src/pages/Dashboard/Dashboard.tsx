import { useEffect, useState } from "react";
import { CssVarsProvider, extendTheme, useColorScheme } from "@mui/joy/styles";
import GlobalStyles from "@mui/joy/GlobalStyles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import IconButton, { IconButtonProps } from "@mui/joy/IconButton";
import Sheet from "@mui/joy/Sheet";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../services/AuthServices";
import { getTrackingSettings } from "../../services/DataServices";

const WEBSITE_LOGIN_URL = `${import.meta.env.VITE_FRONTEND_URL}/authorize-app`;

function ColorSchemeToggle(props: IconButtonProps) {
  const { onClick, ...other } = props;
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <IconButton
      aria-label="toggle light/dark mode"
      size="sm"
      variant="soft"
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      setUser(JSON.parse(userString));
    }

    const checkTracking = async () => {
      const companyId = localStorage.getItem("companyId");
      if (companyId) {
        try {
          const res = await getTrackingSettings(companyId);
          const settings = res.data?.data || res.data;
          setIsTracking(settings?.isActive || false);
        } catch (err) {
          console.error("Failed to check tracking settings", err);
        }
      }
    };
    checkTracking();
  }, []);

  const handleLogout = async () => {
    try {
      if (window.electronAPI) {
        window.electronAPI.logout();
      }

      localStorage.clear();

      try {
        await logout();
      } catch (e) {
        console.warn("Backend logout failed", e);
      }

      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Error logging out");
    }
  };

  const handleBrowserLogin = () => {
    if (window.electronAPI?.openBrowserAuth) {
      window.electronAPI.openBrowserAuth(WEBSITE_LOGIN_URL);
    } else {
      toast.error("Browser open not supported");
    }
  };

  return (
    <CssVarsProvider
      theme={customTheme}
      defaultMode="dark"
      disableTransitionOnChange
    >
      <CssBaseline />
      <GlobalStyles
        styles={{
          ":root": {
            "--Form-maxWidth": "800px",
            "--Transition-duration": "0.4s",
          },
        }}
      />

      <Box
        sx={(theme) => ({
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "background.level1",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundImage:
            "url(https://images.unsplash.com/photo-1527181152855-fc03fc7949c8?auto=format&w=1000&dpr=2)",
          [theme.getColorSchemeSelector("dark")]: {
            backgroundImage:
              "url(https://images.unsplash.com/photo-1572072393749-3ca9c8ea0831?auto=format&w=1000&dpr=2)",
          },
        })}
      >
        <Sheet
          sx={(theme) => ({
            width: 400,
            mx: "auto",
            my: 4,
            py: 3,
            px: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            borderRadius: "sm",
            boxShadow: "md",
            backdropFilter: "blur(10px)",
            transition: "background-color 0.3s, border-color 0.3s",

            // LIGHT MODE STYLES
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.3)",

            // DARK MODE STYLES
            [theme.getColorSchemeSelector("dark")]: {
              backgroundColor: "rgba(19, 19, 24, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
          })}
          variant="outlined"
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

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: isTracking ? "success.500" : "danger.500",
            }}
          >
            <CheckCircleRoundedIcon />
            <Typography
              level="title-sm"
              color={isTracking ? "success" : "danger"}
            >
              {isTracking ? "Monitoring Active" : "Monitoring Inactive"}
            </Typography>
          </Box>

          <Sheet
            variant="soft"
            color="primary"
            sx={{
              p: 2,
              borderRadius: "sm",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CheckCircleRoundedIcon />{" "}
            <Box>
              <Typography level="title-sm">
                Logged in as {user?.firstName || "User"}
              </Typography>
              <Typography level="body-xs">{user?.email}</Typography>
            </Box>
          </Sheet>

          <Button
            variant="outlined"
            color="neutral"
            fullWidth
            startDecorator={<OpenInNewRoundedIcon />}
            onClick={handleBrowserLogin}
          >
            Login via Website
          </Button>

          <Typography
            level="body-xs"
            sx={{ textAlign: "center", opacity: 0.6 }}
          >
            Use this if your session expired or you need to switch accounts.
          </Typography>

          <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
            <Button
              variant="plain"
              color="danger"
              startDecorator={<LogoutRoundedIcon />}
              onClick={handleLogout}
              size="sm"
            >
              Logout
            </Button>
          </Box>
        </Sheet>
      </Box>
    </CssVarsProvider>
  );
}
