import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startMocks } from "./mocks";

void startMocks().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
