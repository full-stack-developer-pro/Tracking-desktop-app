// App.tsx
import React from "react";
import router from "./router";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" />
      {router}
    </AuthProvider>
  );
};

export default App;
