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
import AuthService from "../services/AuthServices";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

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

  type Data = {
    email: string;
    password: string;
  };

  const onSubmit = async (data: Data) => {
    try {
      const res = await AuthService.login(data);
      console.log("login res", res);
      const user = res?.data?.data?.user;
      const token = res?.data?.data?.token;
      const role = res?.data?.data?.user?.role;
      const userId = res?.data?.data?.user._id;

      const rolePaths: Record<string, string> = {
        admin: "/admin/dashboard",
        HR: "/dashboard/hr",
        TL: "/dashboard/tl",
        User: "/dashboard/user",
      };

      const redirectPath = rolePaths[role];

      if (!redirectPath) {
        toast.error("Access denied! Unknown role.");
        return;
      }

      const authData: object = { user, userId, role, token };

      localStorage.setItem("auth", JSON.stringify(authData));

      toast.success("Loggged in successfully.");

      navigate(redirectPath);
    } catch (error: any) {
      toast.error(
        error.response.data.message ||
          error.message ||
          "Login failed. Please check your credentials."
      );

      console.log(error);
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
                    // type="password"
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

                  <Button type="submit" fullWidth>
                    {isSubmitting ? "Please wait..." : "Sign in"}
                  </Button>
                </Stack>
              </form>
            </Stack>
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
