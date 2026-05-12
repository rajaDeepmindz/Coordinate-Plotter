import { Routes, Route } from "react-router-dom";
import { DrawingCanvas } from "./components/DrawingCanvas";
import CoordinatePlotter from "./page/CoordinatePlotter";
import UploadConfigCard from "./page/AnaliserForm";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CoordinatePlotter />} />
      <Route path="/drowing" element={<DrawingCanvas />} />
      <Route path="/analyser" element={<UploadConfigCard />} />
    </Routes>
  );
}

export default App;