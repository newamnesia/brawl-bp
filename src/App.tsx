import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Preview from "./pages/Preview";
import MapPreview from "./pages/MapPreview";
import OfflineTraining from "./pages/OfflineTraining";
import OfflineTrainingGame from "./pages/OfflineTrainingGame";
import AccountMenu from "./components/AccountMenu";

export default function App() {
  return (
    <>
      <AccountMenu />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/map-preview" element={<MapPreview />} />
        <Route path="/offline-training" element={<OfflineTraining />} />
        <Route path="/offline-training/game" element={<OfflineTrainingGame />} />
      </Routes>
    </>
  );
}
