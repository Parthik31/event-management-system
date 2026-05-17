import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Core
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar'; 
import Footer from './components/Footer';
import ProtectedRoute from './routes/ProtectedRoute';
import { OrganizerDashboardResolver, OrganizerFinanceResolver } from './pages/organizer/operations/OrganizerResolvers';

// --- PUBLIC PAGES ---
import Home from './pages/user/Home';
import Movies from './pages/user/Movies';
import Events from './pages/user/Events';
import Plays from './pages/user/Plays';
import Activities from './pages/user/Activities';
import SearchEvents from './pages/user/SearchEvents';
import EventDetails from './pages/user/EventDetails';
import MovieDetails from './pages/user/MovieDetails';
import MovieSeatLayout from './pages/user/MovieSeatLayout';
import About from './pages/user/About';
import Contact from './pages/user/Contact';
import Support from './pages/user/Support';
import VerifyTicket from './pages/user/VerifyTicket';

// --- AUTH & USER ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Profile from './pages/auth/Profile';
import MyTickets from './pages/user/MyTickets';

// --- ORGANIZER OPERATIONS ---
import ScanTicket from './pages/organizer/operations/ScanTicket';
import ManageCoupons from './pages/organizer/operations/ManageCoupons';
import ManageShowtimes from './pages/organizer/operations/ManageShowtimes';
import ManageMultiplexes from './pages/organizer/operations/ManageMultiplexes';
import CreateEvent from './pages/organizer/operations/CreateEvent';
import CreateMovie from './pages/organizer/operations/CreateMovie';import MyEvents from './pages/organizer/operations/MyEvents';
import MyMovies from './pages/organizer/operations/MyMovies';
import Partner from './pages/organizer/operations/Partner';

// --- ADMIN PAGES ---
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminMovies from './pages/admin/AdminMovies';
import AdminMultiplexes from './pages/admin/AdminMultiplexes';
import ManageUsers from './pages/admin/ManageUsers';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import AdminFinance from './pages/admin/AdminFinance';

const App = () => (
  <AuthProvider>
    <Router>
      <Navbar />
      <main className="min-h-screen pt-16">
        <Suspense fallback={<div className="flex h-screen items-center justify-center animate-pulse text-indigo-500 font-bold">Loading Workspace...</div>}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<Events />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/plays" element={<Plays />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/search" element={<SearchEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/movies/:id" element={<MovieDetails />} />
            <Route path="/movies/:movieId/shows/:showId/seats" element={<MovieSeatLayout />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/support" element={<Support />} />
            <Route path="/verify/:id" element={<VerifyTicket />} />

            {/* LOGGED IN USER ROUTES */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/partner" element={<Partner />} />
            </Route>

            {/* ORGANIZER ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={['organizer']} />}>
              <Route path="/organizer/dashboard" element={<OrganizerDashboardResolver />} />
              <Route path="/organizer/create-event" element={<CreateEvent />} />
              <Route path="/organizer/events/edit/:id" element={<CreateEvent />} />
              <Route path="/organizer/create-movie" element={<CreateMovie />} />
              <Route path="/organizer/movies/edit/:id" element={<CreateMovie />} />
              <Route path="/organizer/my-events" element={<MyEvents />} />
              <Route path="/organizer/my-movies" element={<MyMovies />} />
              <Route path="/organizer/scan" element={<ScanTicket />} />
              <Route path="/organizer/coupons" element={<ManageCoupons />} />
              <Route path="/organizer/multiplexes" element={<ManageMultiplexes />} />
              <Route path="/organizer/manage-shows" element={<ManageShowtimes />} />
              
              {/* Specialized Finance Ledgers */}
              <Route path="/organizer/event/finance" element={<OrganizerFinanceResolver type="events" />} />
              <Route path="/organizer/movie/finance" element={<OrganizerFinanceResolver type="producer" />} />
              <Route path="/organizer/multiplex/finance" element={<OrganizerFinanceResolver type="theatre" />} />
            </Route>

            {/* ADMIN ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/movies" element={<AdminMovies />} />
              <Route path="/admin/multiplexes" element={<AdminMultiplexes />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/organizers" element={<ManageOrganizers />} />
              <Route path="/admin/finance" element={<AdminFinance />} />
            </Route>

            {/* 404 CATCH ALL */}
            <Route path="*" element={
              <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500">
                <h1 className="mb-2 text-6xl font-black text-slate-900">404</h1>
                <h2 className="text-xl font-bold">Page Not Found</h2>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <Toaster position="top-center" reverseOrder={false} 
        toastOptions={{
          className: 'font-bold text-sm rounded-2xl shadow-xl border border-slate-100',
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }
        }} 
      />
    </Router>
  </AuthProvider>
);

export default App;
