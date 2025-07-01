import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import GmsEenheden from './pages/gms-eenheden';
import Gms2 from './pages/gms2';
import Kaart from './pages/kaart';
import NotFound from './pages/not-found';
import "./index.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gms-eenheden" element={<GmsEenheden />} />
          <Route path="/gms2" element={<Gms2 />} />
          <Route path="/kaart" element={<Kaart />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;