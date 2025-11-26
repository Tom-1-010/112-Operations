import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import DashboardPage from "./pages/dashboard";
import GmsEenhedenPage from "./pages/gms-eenheden";
import Gms2Page from "./pages/gms2";
import BasisteamsPage from "./pages/basisteams";
import InstellingenPage from "./pages/instellingen";
import KaartPage from "./pages/kaart";
import MapPage from "./pages/map";
import TelefoniePage from "./pages/telefonie";
import KazernesPage from "./pages/kazernes";
import InzetrollenPage from "./pages/inzetrollen";
import BrwEenhedenPage from "./pages/brw-eenheden";
import BrwDashboardPage from "./pages/brw-dashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/not-found";
import { initGlobalUnitMovement } from "./services/globalUnitMovement";
import "./index.css";

// Ensure React is available globally
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

function App() {
  // Initialiseer globale eenhedenbeweging service
  useEffect(() => {
    const cleanup = initGlobalUnitMovement();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/gms-eenheden" component={GmsEenhedenPage} />
          <Route path="/gms2" component={Gms2Page} />
          <Route path="/basisteams" component={BasisteamsPage} />
          <Route path="/kaart" component={KaartPage} />
          <Route path="/map" component={MapPage} />
          <Route path="/telefonie" component={TelefoniePage} />
          <Route path="/kazernes" component={KazernesPage} />
          <Route path="/instellingen" component={InstellingenPage} />
          <Route path="/inzetrollen" component={InzetrollenPage} />
          <Route path="/brw-eenheden" component={BrwEenhedenPage} />
          <Route path="/dashboard/brw-eenheden" component={BrwDashboardPage} />
          <Route path="/@inzetrollen.tsx" component={InzetrollenPage} />
          <Route path="/inzetrollen.tsx" component={InzetrollenPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/registreren" component={RegisterPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}

export default App;