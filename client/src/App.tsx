import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LaporanHarianPage from "@/pages/LaporanHarian";
import JenisLayananPage from "@/pages/JenisLayanan";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/laporan" component={LaporanHarianPage} />
      <Route path="/layanan" component={JenisLayananPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
