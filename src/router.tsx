import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import HomePage from "./pages/Home/HomePage";
import Dashboard from "./pages/Dashboard/Dashboard";

const router = (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);

export default router;
