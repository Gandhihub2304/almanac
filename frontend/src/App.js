import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AlmanacForm from "./components/AlmanacForm";
import AlmanacBatchView from "./components/AlmanacBatchView";

function Home() {
  return (
    <>
      <Header />
      <h1 style={{ textAlign: "center" }}>Academic Almanac</h1>
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
      </Routes>
    </Router>
  );
}