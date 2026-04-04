import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AlmanacForm from "./components/AlmanacForm";
import AlmanacBatchView from "./components/AlmanacBatchView";
import AlmanacBatchDetail from "./components/AlmanacBatchDetail";
import AcademicCalendarPage from "./components/AcademicCalendarPage";
import AcademicCalendarTablePage from "./components/AcademicCalendarTablePage";

function Home() {
  return (
    <>
      <Header />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/almanac" element={<AlmanacForm />} />
        <Route path="/almanac/view/:id" element={<AlmanacBatchView />} />
        <Route path="/almanac/batch/:batchStart/:batchEnd" element={<AlmanacBatchDetail />} />
        <Route path="/academic-calendar" element={<AcademicCalendarPage />} />
        <Route path="/academic-calendar/view/:almanacId/:yearNumber" element={<AcademicCalendarTablePage />} />
      </Routes>
    </Router>
  );
}