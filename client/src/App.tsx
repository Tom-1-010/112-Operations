import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from 'wouter';
import DashboardPage from "./pages/dashboard";
import GmsEenhedenPage from "./pages/gms-eenheden";
import Gms2Page from "./pages/gms2";
import BasisteamsPage from "./pages/basisteams";
import InstellingenPage from "./pages/instellingen";
import NotFoundPage from "./pages/not-found";
import "./index.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/" component={() => <DashboardPage />} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/gms-eenheden" component={GmsEenhedenPage} />
          <Route path="/gms2" component={Gms2Page} />
          <Route path="/basisteams" component={BasisteamsPage} />
          <Route path="/instellingen" component={InstellingenPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}

export default App;