import * as React from "react";
import { CssVarsProvider, extendTheme, useColorScheme } from "@mui/joy/styles";
import GlobalStyles from "@mui/joy/GlobalStyles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import IconButton, { IconButtonProps } from "@mui/joy/IconButton";
import Link from "@mui/joy/Link";
import Input from "@mui/joy/Input";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import GoogleIcon from "./GoogleIcon";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { login } from "../../services/AuthServices";
import { getTrackingSettings } from "../../services/DataServices";

declare global {
  interface Window {
    electronAPI?: {
      login: (userId: string, trackingSettings: any) => void;
      logout: () => void;
      testConnection: () => Promise<any>;
      getCookies: () => Promise<any>;
    };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [isElectronAvailable, setIsElectronAvailable] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);

  React.useEffect(() => {
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
      }
    };

    checkElectronAPI();
  }, []);

  const logInSchema = z.object({
    email: z
      .string()
      .min(1, "Email is required!")
      .email("Please enter a valid email!")
      .max(50, "Your Email is too long!"),
    password: z.string().min(1, "Password is required"),
  });

  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(logInSchema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      const res = await login(data);
      const { user, accessToken } = res?.data?.data;
      const { _id: userId, role, companyId } = user;

      const companyIdValue =
        typeof companyId === "string" ? companyId : companyId?._id || companyId;

      console.log("Company ID:", companyIdValue);

      let trackingSettings = null;
      if (companyIdValue && companyIdValue !== "unknown") {
        try {
          const settingsRes = await getTrackingSettings(companyIdValue);
          trackingSettings = settingsRes.data?.data || settingsRes.data;
          console.log("Fetched tracking settings:", trackingSettings);
        } catch (settingsError: any) {
          console.error("Failed to fetch tracking settings:", settingsError);
        }
      }

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("companyId", companyIdValue || "");
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", role);
      localStorage.setItem("token", accessToken);
      localStorage.setItem(
        "trackingSettings",
        JSON.stringify(trackingSettings)
      );

      if (!trackingSettings?.isActive) {
        console.log("Tracking is disabled for this company");
        toast.info("Tracking is disabled for your company");
      }

      if (window.electronAPI) {
        try {
          window.electronAPI.login(userId, trackingSettings);
          toast.success("Desktop tracking started!");
        } catch (electronError: any) {
          console.error("Desktop tracking error:", electronError);
          toast.warning("Login successful, but desktop tracking failed");
        }
      } else {
        toast.success("Logged in successfully");
      }

      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    }
  };

  function ColorSchemeToggle(props: IconButtonProps) {
    const { onClick, ...other } = props;
    const { mode, setMode } = useColorScheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

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
          width: { xs: "100%", md: "50vw" },
          transition: "width var(--Transition-duration)",
          transitionDelay: "calc(var(--Transition-duration) + 0.1s)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "flex-end",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(255 255 255 / 0.2)",
          [theme.getColorSchemeSelector("dark")]: {
            backgroundColor: "rgba(19 19 24 / 0.4)",
          },
        })}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100dvh",
            width: "100%",
            px: 2,
          }}
        >
          <Box
            component="header"
            sx={{ py: 3, display: "flex", justifyContent: "space-between" }}
          >
            <Box sx={{ gap: 2, display: "flex", alignItems: "center" }}>
              <IconButton variant="soft" color="primary" size="sm">
                <BadgeRoundedIcon />
              </IconButton>
              <Typography level="title-lg">Company logo</Typography>
            </Box>
            <ColorSchemeToggle />
          </Box>
          <Box
            component="main"
            sx={{
              my: "auto",
              py: 2,
              pb: 5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: 400,
              maxWidth: "100%",
              mx: "auto",
              borderRadius: "sm",
              "& form": {
                display: "flex",
                flexDirection: "column",
                gap: 2,
              },
              [`& .MuiFormLabel-asterisk`]: {
                visibility: "hidden",
              },
            }}
          >
            {isElectronAvailable && (
              <Box
                sx={{
                  backgroundColor: "primary.softBg",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  level="body-sm"
                  sx={{ color: "primary.plainColor" }}
                >
                  🖥️ Desktop App Mode
                </Typography>
                {isTestingConnection && (
                  <Typography level="body-xs">Testing connection...</Typography>
                )}
              </Box>
            )}

            <Stack sx={{ gap: 4, mb: 2 }}>
              <Stack sx={{ gap: 1 }}>
                <Typography component="h1" level="h3">
                  Sign in
                </Typography>
                <Typography level="body-sm">
                  New to company?{" "}
                  <Link href="#replace-with-a-link" level="title-sm">
                    Sign up!
                  </Link>
                </Typography>
              </Stack>
              <Button
                variant="soft"
                color="neutral"
                fullWidth
                startDecorator={<GoogleIcon />}
              >
                Continue with Google
              </Button>
            </Stack>

            <Divider
              sx={(theme) => ({
                [theme.getColorSchemeSelector("light")]: {
                  color: { xs: "#FFF", md: "text.tertiary" },
                },
              })}
            >
              or
            </Divider>

            <Stack sx={{ gap: 4, mt: 2 }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl required>
                  <FormLabel>Email</FormLabel>
                  <Input
                    error={!!errors.email}
                    placeholder="Enter your email"
                    {...register("email")}
                    type="email"
                  />
                  {errors.email && (
                    <p style={{ color: "red", fontSize: "0.8rem" }}>
                      {errors.email.message}
                    </p>
                  )}
                </FormControl>

                <FormControl required>
                  <FormLabel>Password</FormLabel>
                  <Input
                    {...register("password")}
                    type="password"
                    error={!!errors.password}
                    placeholder="Enter your password"
                  />
                  {errors.password && (
                    <p style={{ color: "red", fontSize: "0.8rem" }}>
                      {errors.password.message}
                    </p>
                  )}
                </FormControl>

                <Stack sx={{ gap: 4, mt: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox size="sm" label="Remember me" name="persistent" />
                    <Link level="title-sm" href="#replace-with-a-link">
                      Forgot your password?
                    </Link>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    loading={isSubmitting}
                    loadingPosition="end"
                    variant="outlined"
                  >
                    {isSubmitting ? "Logging in..." : "Sign in"}
                  </Button>
                </Stack>
              </form>
            </Stack>

            {!isElectronAvailable && (
              <Box
                sx={{
                  backgroundColor: "neutral.softBg",
                  padding: "10px",
                  borderRadius: "8px",
                  marginTop: "10px",
                }}
              >
                <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                  🌐 Browser Mode: Desktop features not available
                </Typography>
              </Box>
            )}
          </Box>

          <Box component="footer" sx={{ py: 3 }}>
            <Typography level="body-xs" sx={{ textAlign: "center" }}>
              © Your company {new Date().getFullYear()}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={(theme) => ({
          height: "100%",
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          left: { xs: 0, md: "50vw" },
          transition:
            "background-image var(--Transition-duration), left var(--Transition-duration) !important",
          transitionDelay: "calc(var(--Transition-duration) + 0.1s)",
          backgroundColor: "background.level1",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage:
            "url(https://images.unsplash.com/photo-1527181152855-fc03fc7949c8?auto=format&w=1000&dpr=2)",
          [theme.getColorSchemeSelector("dark")]: {
            backgroundImage:
              "url(https://images.unsplash.com/photo-1572072393749-3ca9c8ea0831?auto=format&w=1000&dpr=2)",
          },
        })}
      />
    </CssVarsProvider>
  );
}
