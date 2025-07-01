import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router, Route, Switch } from 'wouter';
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
        <Switch>
          <Route path="/" component={() => <Dashboard />} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/gms-eenheden" component={GmsEenheden} />
          <Route path="/gms2" component={Gms2} />
          <Route path="/kaart" component={Kaart} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}

export default App;