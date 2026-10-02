import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { PublicLayout, UserLayout, OperatorLayout, AdminLayout, RequireRole } from './components/layouts';

import Home from './pages/public/Home';
import { HowItWorks, Networks, Pricing, Business, About, SupportPublic } from './pages/public/Misc';
import { Login, Register } from './pages/public/Auth';
import PublicStations from './pages/public/Stations';

import Dashboard from './pages/user/Dashboard';
import FindCharger from './pages/user/FindCharger';
import StationDetail from './pages/user/StationDetail';
import LiveCharging from './pages/user/LiveCharging';
import History from './pages/user/History';
import RoutePlanner from './pages/user/RoutePlanner';
import { Payments, TransactionDetail, Refunds } from './pages/user/PaymentsPages';
import { Wallet, Favorites, Notifications, Profile, Booking, Vehicles, ReportFault, SupportUser } from './pages/user/MiscPages';

import { OpDashboard, OpStations, OpChargers, OpSessions, OpRevenue, OpFaults, OpPricing, OpSettings, OpIncidents } from './pages/operator';
import { AdminDashboard, AdminMap, AdminUsers, AdminOperators, AdminPayments, AdminRefunds, AdminDisputes, AdminAnalytics, AdminIntegrations, AdminAudit } from './pages/admin';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/stations" element={<PublicStations />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/networks" element={<Networks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/business" element={<Business />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<SupportPublic />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<RequireRole role="USER"><UserLayout /></RequireRole>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/app/stations" element={<FindCharger />} />
            <Route path="/station/:id" element={<StationDetail />} />
            <Route path="/charging/:sessionId" element={<LiveCharging />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:paymentId" element={<TransactionDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:paymentId" element={<TransactionDetail />} />
            <Route path="/refunds" element={<Refunds />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/route-planner" element={<RoutePlanner />} />
            <Route path="/support/report" element={<ReportFault />} />
            <Route path="/app/support" element={<SupportUser />} />
          </Route>

          <Route element={<RequireRole role="OPERATOR"><OperatorLayout /></RequireRole>}>
            <Route path="/operator/dashboard" element={<OpDashboard />} />
            <Route path="/operator/stations" element={<OpStations />} />
            <Route path="/operator/chargers" element={<OpChargers />} />
            <Route path="/operator/sessions" element={<OpSessions />} />
            <Route path="/operator/revenue" element={<OpRevenue />} />
            <Route path="/operator/faults" element={<OpFaults />} />
            <Route path="/operator/incidents" element={<OpIncidents />} />
            <Route path="/operator/pricing" element={<OpPricing />} />
            <Route path="/operator/settings" element={<OpSettings />} />
          </Route>

          <Route element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/map" element={<AdminMap />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/operators" element={<AdminOperators />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/refunds" element={<AdminRefunds />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />

            <Route path="/admin/integrations" element={<AdminIntegrations />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
