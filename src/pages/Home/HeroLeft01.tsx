import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import ArrowForward from "@mui/icons-material/ArrowForward";
import TwoSidedLayout from "./TwoSidedLayout";
import { Link } from "react-router-dom";

function HeroLeft01() {
  return (
    <TwoSidedLayout>
      <Typography color="primary" sx={{ fontSize: "lg", fontWeight: "lg" }}>
        The power to do more
      </Typography>

      <Typography
        level="h1"
        sx={{
          fontWeight: "xl",
          fontSize: "clamp(1.875rem, 1.3636rem + 2.1818vw, 3rem)",
        }}
      >
        A large headlinerer about our product features & services
      </Typography>

      <Typography
        textColor="text.secondary"
        sx={{ fontSize: "lg", lineHeight: "lg" }}
      >
        A descriptive secondary text placeholder. Use it to explain your
        business offer better.
      </Typography>

      <div className="flex items-center gap-2">
        <Button size="lg" endDecorator={<ArrowForward />}>
          Get Started
        </Button>

        <Button size="lg">
          <Link to={"/login"}>Login</Link>
        </Button>
      </div>

      <Typography>
        Already a member? <Link to="/sign-in">Sign in</Link>
      </Typography>

      <Typography
        level="body-xs"
        sx={{
          position: "absolute",
          top: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      ></Typography>
    </TwoSidedLayout>
  );
}

export default HeroLeft01;
