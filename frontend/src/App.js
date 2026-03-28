import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AlmanacForm from "./components/AlmanacForm";
import AlmanacBatchView from "./components/AlmanacBatchView";
import AlmanacBatchDetail from "./components/AlmanacBatchDetail";

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
      </Routes>
    </Router>
  );
}