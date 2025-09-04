import { Button } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div>
      <Button variant="contained">
        <Link to={"/login"}>
          Login
        </Link>
      </Button>
    </div>
  );
};

export default HomePage;
