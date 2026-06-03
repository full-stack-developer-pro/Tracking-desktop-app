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
import { logout, logoutOtherDevices } from "../../services/AuthServices";

import { getTrackingSettings, getMyLeaves } from "../../services/DataServices";
import Alert from "@mui/joy/Alert";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import moment from "moment";

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
  const [userOnBreak, setUserOnBreak] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);
  const [todayLeaves, setTodayLeaves] = useState<any[]>([]);
  const [onApprovedLeave, setOnApprovedLeave] = useState(false);

  const [now, setNow] = useState(moment());

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      setUser(JSON.parse(userString));
    }
    const electron = (window as any).electronAPI;

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

    const checkLeaves = async () => {
      try {
        const res = await getMyLeaves();
        const leaves = res.data?.data || [];
        const today = moment().startOf("day");
        const activeToday = leaves.filter(
          (l: any) =>
            l.status === "approved" &&
            moment(l.startDate).startOf("day").isSameOrBefore(today) &&
            moment(l.endDate).endOf("day").isSameOrAfter(today),
        );
        setTodayLeaves(activeToday);
        if (electron?.updateActiveLeave) {
          electron.updateActiveLeave(activeToday);
        }
      } catch (err) {
        console.error("Failed to fetch leaves", err);
      }
    };

    checkTracking();
    checkLeaves();

    if (electron?.onTrackingStoppedByAdmin) {
      electron.onTrackingStoppedByAdmin(() => {
        setIsTracking(false);
        toast.error("Your tracking has been stopped by the company.");
      });
    }

    if (electron?.onSettingsSyncedLive) {
      electron.onSettingsSyncedLive((newSettings: any) => {
        localStorage.setItem("trackingSettings", JSON.stringify(newSettings));
        setIsTracking(newSettings?.isActive ?? false);
      });
    }

    if (electron?.onUserBreakStarted) {
      electron.onUserBreakStarted(() => {
        setUserOnBreak(true);
      });
    }

    if (electron?.onUserBreakEnded) {
      electron.onUserBreakEnded(() => {
        setUserOnBreak(false);
      });
    }

    if (electron?.onLogoutSuccess) {
      electron.onLogoutSuccess(() => {
        console.log(
          "[renderer] Logout success received from main process. Cleaning up...",
        );
        const locPerm = localStorage.getItem("locationPermissionGranted");
        localStorage.clear();
        if (locPerm) localStorage.setItem("locationPermissionGranted", locPerm);
        navigate("/");
      });
    }

    if (electron?.onUserLeaveStatus) {
      electron.onUserLeaveStatus((status: any) => {
        setOnApprovedLeave(status.active);
      });
    }

    if (electron?.onForceStopTracking) {
      electron.onForceStopTracking((data: any) => {
        setIsTracking(false);
        toast.error(data.message || "Tracking has been force-stopped.");
        if (data.logout) {
          setTimeout(() => {
            handleLogout();
          }, 3000);
        }
      });
    }

    return () => {
      if (electron?.removeTrackingStoppedListener) {
        electron.removeTrackingStoppedListener();
      }
      if (electron?.removeSettingsSyncedListener) {
        electron.removeSettingsSyncedListener();
      }
      if (electron?.removeUserBreakStartedListener) {
        electron.removeUserBreakStartedListener();
      }
      if (electron?.removeUserBreakEndedListener) {
        electron.removeUserBreakEndedListener();
      }
      if (electron?.removeLogoutSuccessListener) {
        electron.removeLogoutSuccessListener();
      }
      if (electron?.removeUserLeaveStatusListener) {
        electron.removeUserLeaveStatusListener();
      }
      if (electron?.removeForceStopTrackingListener) {
        electron.removeForceStopTrackingListener();
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(moment());
    }, 30000);

    const dataRefresh = setInterval(
      () => {
        const checkLeaves = async () => {
          try {
            const res = await getMyLeaves();
            const leaves = res.data?.data || [];
            const today = moment().startOf("day");
            const activeToday = leaves.filter(
              (l: any) =>
                l.status === "approved" &&
                moment(l.startDate).startOf("day").isSameOrBefore(today) &&
                moment(l.endDate).endOf("day").isSameOrAfter(today),
            );
            setTodayLeaves(activeToday);
            const electron = (window as any).electronAPI;
            if (electron?.updateActiveLeave) {
              electron.updateActiveLeave(activeToday);
            }
          } catch (e) {
            console.error("Periodic leave refresh failed", e);
          }
        };
        checkLeaves();
      },
      15 * 60 * 1000,
    );

    return () => {
      clearInterval(interval);
      clearInterval(dataRefresh);
    };
  }, []);

  const handleLogout = async () => {
    const electron = (window as any).electronAPI;
    setIsLoggingOut(true);
    try {
      try {
        await logout();
      } catch (e) {
        console.warn("Backend logout failed (might be already expired)", e);
      }
      if (electron) {
        electron.logout();
      }
      const locPerm = localStorage.getItem("locationPermissionGranted");
      localStorage.clear();
      if (locPerm) localStorage.setItem("locationPermissionGranted", locPerm);
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message || "Facing some error in log out",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutOthers = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      toast.error("Session information missing. Please re-login.");
      return;
    }
    setIsLoggingOutOthers(true);
    try {
      const res = await logoutOtherDevices(refreshToken);
      if (res.data.success) {
        toast.success(res.data.message || "Logged out from other devices");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to log out from other devices",
      );
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  const handleBrowserLogin = () => {
    const electron = (window as any).electronAPI;
    if (electron?.openBrowserAuth) {
      electron.openBrowserAuth(WEBSITE_LOGIN_URL);
    } else {
      toast.error("Browser open not supported");
    }
  };

  const relevantLeave = todayLeaves
    .filter((l: any) => {
      if (!l.endTime) return true;
      const [h, m] = l.endTime.split(":");
      const leaveEndTime = moment().set({
        hour: parseInt(h),
        minute: parseInt(m),
        second: 59,
        millisecond: 999,
      });
      return now.isBefore(leaveEndTime);
    })
    .sort((a: any, b: any) => {
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    })[0];

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
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            [theme.getColorSchemeSelector("dark")]: {
              backgroundColor: "rgba(19, 19, 24, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
          })}
          variant="outlined"
        >
          {relevantLeave && (
            <Alert
              variant="soft"
              color="warning"
              startDecorator={<WarningRoundedIcon />}
              sx={{ mb: 1, alignItems: "flex-start" }}
            >
              <Box>
                <Typography level="title-sm">
                  Upcoming/Active Leave Today
                </Typography>
                <Typography level="body-xs">
                  You have an approved{" "}
                  {relevantLeave.leaveDuration.replace("-", " ")}
                  {relevantLeave.startTime && relevantLeave.endTime && (
                    <>
                      {" "}
                      (
                      {moment(relevantLeave.startTime, "HH:mm").format(
                        "hh:mm A",
                      )}{" "}
                      -{" "}
                      {moment(relevantLeave.endTime, "HH:mm").format("hh:mm A")}
                      )
                    </>
                  )}
                </Typography>
              </Box>
            </Alert>
          )}

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
              color: userOnBreak
                ? "warning.500"
                : isTracking
                  ? "success.500"
                  : "danger.500",
            }}
          >
            <CheckCircleRoundedIcon />
            <Typography
              level="title-sm"
              color={
                onApprovedLeave
                  ? "warning"
                  : userOnBreak
                    ? "warning"
                    : isTracking
                      ? "success"
                      : "danger"
              }
            >
              {onApprovedLeave
                ? "Monitoring Inactive (On Approved Leave)"
                : userOnBreak
                  ? "Monitoring Inactive (On Break)"
                  : isTracking
                    ? "Monitoring Active"
                    : "Monitoring Inactive"}
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
                Logged in as {user?.firstName || "employee"}
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
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Button
              variant="plain"
              color="danger"
              startDecorator={<LogoutRoundedIcon />}
              onClick={handleLogout}
              size="sm"
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              Logout
            </Button>
            <Button
              variant="plain"
              color="neutral"
              onClick={handleLogoutOthers}
              size="sm"
              loading={isLoggingOutOthers}
              disabled={isLoggingOutOthers || isLoggingOut}
              sx={{ opacity: 0.7, fontSize: "xs" }}
            >
              Logout from other devices
            </Button>
          </Box>
        </Sheet>
      </Box>
    </CssVarsProvider>
  );
}
