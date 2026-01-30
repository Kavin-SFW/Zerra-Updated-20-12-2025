import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalLogger } from "@/lib/global-logger";

// Initialize global logging (fetch interception, error handling)
initializeGlobalLogger();

createRoot(document.getElementById("root")!).render(<App />);
