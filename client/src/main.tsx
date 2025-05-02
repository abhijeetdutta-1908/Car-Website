import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Application starting...");

try {
  const rootElement = document.getElementById("root");
  console.log("Root element found:", rootElement);
  
  if (!rootElement) {
    console.error("Root element not found!");
  } else {
    const root = createRoot(rootElement);
    console.log("Root created, rendering App...");
    root.render(<App />);
    console.log("App rendered");
  }
} catch (error) {
  console.error("Error rendering application:", error);
}
