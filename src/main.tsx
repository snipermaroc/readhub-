import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Suppress unhandled extension errors (e.g. MetaMask, web3 injectors)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const errorStr = `${event?.reason?.message || ""} ${event?.reason?.stack || ""} ${String(event?.reason || "")}`;
    if (
      errorStr.includes("chrome-extension://") ||
      errorStr.includes("moz-extension://") ||
      errorStr.includes("frame_ant") ||
      errorStr.includes("Cannot set property fetch") ||
      errorStr.includes("MetaMask") ||
      errorStr.includes("inpage.js")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById("root")!).render(<AuthProvider><App /></AuthProvider>);

