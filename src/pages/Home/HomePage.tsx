// import { Button } from "@mui/material";
// import React from "react";
// import { Link } from "react-router-dom";

// const HomePage = () => {
//   return (
//     <div>
//       <Button variant="contained">
//         <Link to={"/login"}>
//           Login
//         </Link>
//       </Button>
//     </div>
//   );
// };

// export default HomePage;

import * as React from "react";
import { CssVarsProvider, useColorScheme } from "@mui/joy/styles";
import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import IconButton from "@mui/joy/IconButton";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";

// import framesxTheme from "./theme";
import HeroLeft01 from "./HeroLeft01";
// import { Link } from "react-router-dom";

function ColorSchemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <IconButton
      data-screenshot="toggle-mode"
      size="lg"
      variant="soft"
      color="neutral"
      onClick={() => {
        if (mode === "light") {
          setMode("dark");
        } else {
          setMode("light");
        }
      }}
      sx={{
        position: "fixed",
        zIndex: 999,
        top: "1rem",
        right: "1rem",
        borderRadius: "50%",
        boxShadow: "sm",
      }}
    >
      {mode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
    </IconButton>
  );
}

export default function TeamExample() {
  return (
    <CssVarsProvider
      disableTransitionOnChange
      // theme={framesxTheme}
    >
      <CssBaseline />
      <ColorSchemeToggle />
      <Box
        sx={{
          height: "100vh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          "& > div": {
            scrollSnapAlign: "start",
          },
        }}
      >
        <HeroLeft01 />
      </Box>
    </CssVarsProvider>
  );
}
