import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JDForm from "./pages/JDForm";
import Upload from "./pages/Upload";
import Ranked from "./pages/Ranked";
import CVDetail from "./pages/CVDetail";
import ClientPortal from "./pages/ClientPortal";
import Pipeline from "./pages/Pipeline";
import AuditCalibration from "./pages/AuditCalibration";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="jd/new" element={<JDForm />} />
          <Route path="jd/:id/edit" element={<JDForm />} />
          <Route path="upload/:id" element={<Upload />} />
          <Route path="ranked/:id" element={<Ranked />} />
          <Route path="candidate/:id" element={<CVDetail />} />
          <Route path="client" element={<ClientPortal />} />
          <Route path="pipeline/:id" element={<Pipeline />} />
          <Route path="audit" element={<AuditCalibration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
