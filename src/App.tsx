import router from "./router";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";

const App = () => {
  return (
    <AuthProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {router}
    </AuthProvider>
  );
};

export default App;
