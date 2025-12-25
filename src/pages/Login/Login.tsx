import { useEffect, useState } from "react";
import { CssVarsProvider, extendTheme, useColorScheme } from "@mui/joy/styles";
import GlobalStyles from "@mui/joy/GlobalStyles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import IconButton, { IconButtonProps } from "@mui/joy/IconButton";
import Typography from "@mui/joy/Typography";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getTrackingSettings } from "../../services/DataServices";

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

export default function Login() {
  const navigate = useNavigate();
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
      return;
    }

    const checkElectronAPI = async () => {
      if (window.electronAPI) {
        setIsElectronAvailable(true);
        try {
          setIsTestingConnection(true);
          await window.electronAPI.testConnection();
        } catch (error) {
          console.warn("Could not test API connection");
        } finally {
          setIsTestingConnection(false);
        }

        // Setup Update Listeners
        if (window.electronAPI.onUpdateProgress) {
          window.electronAPI.onUpdateProgress((data) => {
            setDownloading(true);
            setDownloadProgress(data);
          });
        }

        if (window.electronAPI.onUpdateDownloaded) {
          window.electronAPI.onUpdateDownloaded((info) => {
            setDownloading(false);
            setUpdateReady(true);
            toast.success(`Update ready to install: ${info.version}`);
          });
        }
      }
    };

    if (window.electronAPI && window.electronAPI.onDeepLinkLogin) {
      window.electronAPI.onDeepLinkLogin(async (data: any) => {
        const { token, userId, companyId, role } = data;

        toast.info("Verifying session...");

        try {
          let trackingSettings = null;
          if (
            companyId &&
            companyId !== "unknown" &&
            companyId !== "undefined"
          ) {
            try {
              const settingsRes = await getTrackingSettings(companyId);
              trackingSettings = settingsRes.data?.data || settingsRes.data;
            } catch (err) {
              console.error("Failed to fetch settings:", err);
            }
          }

          if (window.electronAPI) {
            window.electronAPI.login(userId, trackingSettings, token);
            if (!trackingSettings?.isActive) {
              toast.info("Tracking is disabled for your company.");
            } else {
              toast.success("Desktop tracking started!");
            }
          }

          localStorage.setItem("token", token);
          localStorage.setItem("userId", userId);
          localStorage.setItem("role", role);
          localStorage.setItem("companyId", companyId || "");
          localStorage.setItem(
            "trackingSettings",
            JSON.stringify(trackingSettings)
          );

          navigate("/dashboard");
        } catch (error) {
          console.error("Deep link initialization error:", error);
          toast.error("Login successful, but initialization failed.");
          navigate("/dashboard");
        }
      });
    }

    checkElectronAPI();

    return () => {
      if (window.electronAPI) {
        if (window.electronAPI.removeDeepLinkListener)
          window.electronAPI.removeDeepLinkListener();
        if (window.electronAPI.removeUpdateProgressListener)
          window.electronAPI.removeUpdateProgressListener();
        if (window.electronAPI.removeUpdateDownloadedListener)
          window.electronAPI.removeUpdateDownloadedListener();
      }
    };
  }, [navigate]);

  const handleCheckUpdate = async () => {
    if (!window.electronAPI) return;
    setCheckingUpdate(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.updateAvailable) {
        setUpdateAvailable(result);
        toast.info(`New version available: ${result.version}`);
      } else {
        toast.info("You are on the latest version.");
        setUpdateAvailable(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to check for updates");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleStartDownload = async () => {
    if (!window.electronAPI) return;
    setDownloading(true);
    await window.electronAPI.startDownload();
  };

  const handleQuitAndInstall = () => {
    if (window.electronAPI) window.electronAPI.quitAndInstall();
  };

  const handleBrowserLogin = () => {
    if (window.electronAPI?.openBrowserAuth) {
      window.electronAPI.openBrowserAuth(WEBSITE_LOGIN_URL);
      toast.info("Opening browser for authentication...");
    } else {
      toast.error("Browser login not supported in this version.");
    }
  };

  const customTheme = extendTheme({
    colorSchemes: {
      light: {},
      dark: {},
    },
  });

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
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundImage:
            "url(https://images.unsplash.com/photo-1527181152855-fc03fc7949c8?auto=format&w=1000&dpr=2)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          [theme.getColorSchemeSelector("dark")]: {
            backgroundImage:
              "url(https://images.unsplash.com/photo-1572072393749-3ca9c8ea0831?auto=format&w=1000&dpr=2)",
          },
        })}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: 400,
            p: 3,
            borderRadius: "lg",
            backdropFilter: "blur(12px)",
            backgroundColor: "rgba(255 255 255 / 0.8)",
            boxShadow: "lg",
            "[data-joy-color-scheme='dark'] &": {
              backgroundColor: "rgba(19 19 24 / 0.8)",
            },
          }}
        >
          <Box
            component="header"
            sx={{
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ gap: 2, display: "flex", alignItems: "center" }}>
              <IconButton variant="soft" color="primary" size="sm">
                <BadgeRoundedIcon />
              </IconButton>
              <Typography level="title-lg">Tracking Time</Typography>
            </Box>
            <ColorSchemeToggle />
          </Box>
          <Box
            component="main"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {isElectronAvailable && (
              <>
                <Box
                  sx={{
                    backgroundColor: "primary.softBg",
                    padding: "15px",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    border: "1px solid",
                    borderColor: "primary.outlinedBorder",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      level="body-sm"
                      sx={{ color: "primary.plainColor", fontWeight: "bold" }}
                    >
                      🖥️ Desktop App Mode
                    </Typography>
                    {isTestingConnection && (
                      <Typography level="body-xs">Testing...</Typography>
                    )}
                  </Box>
                  <Button
                    variant="solid"
                    color="primary"
                    fullWidth
                    startDecorator={<OpenInNewRoundedIcon />}
                    onClick={handleBrowserLogin}
                  >
                    Login with Browser (SSO)
                  </Button>
                  <Typography
                    level="body-xs"
                    sx={{ textAlign: "center", opacity: 0.7 }}
                  >
                    Use this if you are already logged in on the website.
                  </Typography>
                </Box>

                {/* Update Card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "md",
                    bgcolor: "background.level2",
                    mt: 2,
                  }}
                >
                  <Typography level="title-sm" mb={1}>
                    App Update
                  </Typography>
                  {!updateAvailable && !downloading && !updateReady && (
                    <Button
                      onClick={handleCheckUpdate}
                      loading={checkingUpdate}
                      size="sm"
                      variant="outlined"
                      fullWidth
                    >
                      Check for Updates
                    </Button>
                  )}

                  {updateAvailable && !downloading && !updateReady && (
                    <Box>
                      <Typography level="body-xs" mb={1}>
                        Version {updateAvailable.version} available!
                      </Typography>
                      <Button onClick={handleStartDownload} size="sm" fullWidth>
                        Download Update
                      </Button>
                    </Box>
                  )}

                  {downloading && (
                    <Box>
                      <Typography level="body-xs">
                        Downloading...{" "}
                        {downloadProgress
                          ? downloadProgress.percent.toFixed(0) + "%"
                          : ""}
                      </Typography>
                    </Box>
                  )}

                  {updateReady && (
                    <Button
                      onClick={handleQuitAndInstall}
                      size="sm"
                      color="success"
                      fullWidth
                    >
                      Restart & Install
                    </Button>
                  )}
                </Box>
              </>
            )}

            {!isElectronAvailable && (
              <Box
                sx={{
                  backgroundColor: "neutral.softBg",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <Typography level="body-md" mb={2}>
                  To use this application, please open it in the desktop app.
                </Typography>
                <Button
                  variant="solid"
                  color="primary"
                  component="a"
                  href={WEBSITE_LOGIN_URL}
                  startDecorator={<OpenInNewRoundedIcon />}
                >
                  Go to Website
                </Button>
              </Box>
            )}
          </Box>
          <Box component="footer" sx={{ py: 3 }}>
            <Typography level="body-xs" sx={{ textAlign: "center" }}>
              © Your Company {new Date().getFullYear()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </CssVarsProvider>
  );
}
