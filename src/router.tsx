import { HashRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";

import Dashboard from "./pages/Dashboard/Dashboard";

const router = (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </HashRouter>
);

export default router;
