import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";

const router = (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />

      <Route path="/admin">
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default router;
