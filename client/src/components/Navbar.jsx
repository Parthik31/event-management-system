import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getCachedApi, resolveMediaUrl } from '../utils/Axios';
import { 
  Search, MapPin, Menu, X, 
  ChevronDown, Ticket, Navigation, Building2,
  ArrowLeft, Loader2, Bell 
} from 'lucide-react';
import { toast } from 'react-hot-toast'; 

// --- STATIC DATA MOVED OUTSIDE COMPONENT FOR PERFORMANCE ---
const navTabs = [
  { name: 'For You', path: '/', activeClass: 'bg-orange-500 text-white shadow-orange-200 shadow-md', textClass: 'text-gray-600 hover:text-orange-600 hover:bg-orange-50', pageBg: 'bg-orange-50/30' },
  // 🚀 NEW: Movies Tab Added Here
  { name: 'Movies', path: '/movies', activeClass: 'bg-red-600 text-white shadow-red-200 shadow-md', textClass: 'text-gray-600 hover:text-red-600 hover:bg-red-50', pageBg: 'bg-red-50/30' },
  { name: 'Events', path: '/events', activeClass: 'bg-blue-600 text-white shadow-blue-200 shadow-md', textClass: 'text-gray-600 hover:text-blue-600 hover:bg-blue-50', pageBg: 'bg-blue-50/30' },
  { name: 'Plays', path: '/plays', activeClass: 'bg-purple-600 text-white shadow-purple-200 shadow-md', textClass: 'text-gray-600 hover:text-purple-600 hover:bg-purple-50', pageBg: 'bg-purple-50/30' },
  { name: 'Activities', path: '/activities', activeClass: 'bg-emerald-600 text-white shadow-emerald-200 shadow-md', textClass: 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50', pageBg: 'bg-emerald-50/30' },
];

const popularCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Surat', 'Jaipur'];

const allCities = [
  'Agartala', 'Agra', 'Ahmedabad', 'Ahmednagar', 'Aizawl', 'Ajmer', 'Aligarh', 'Allahabad', 'Alwar', 'Amravati', 'Amritsar', 'Anand', 'Anantapur', 'Asansol', 'Aurangabad', 'Ayodhya',
  'Baddi', 'Bareilly', 'Belagavi', 'Bengaluru', 'Bhagalpur', 'Bharatpur', 'Bhavnagar', 'Bhilai', 'Bhiwandi', 'Bhopal', 'Bhubaneswar', 'Bikaner', 'Bilaspur', 'Bokaro',
  'Chandigarh', 'Chennai', 'Coimbatore', 'Cuttack', 'Daman', 'Darbhanga', 'Dehradun', 'Delhi-NCR', 'Dhanbad', 'Dibrugarh', 'Durgapur',
  'Erode', 'Etawah', 'Faridabad', 'Firozabad', 'Gandhinagar', 'Gangtok', 'Gaya', 'Ghaziabad', 'Goa', 'Gorakhpur', 'Greater Noida', 'Guntur', 'Gurugram', 'Guwahati', 'Gwalior',
  'Haldwani', 'Haridwar', 'Hisar', 'Hosur', 'Hubballi', 'Hyderabad', 'Imphal', 'Indore', 'Itanagar',
  'Jabalpur', 'Jaipur', 'Jalandhar', 'Jalgaon', 'Jammu', 'Jamnagar', 'Jamshedpur', 'Jhansi', 'Jodhpur', 'Junagadh',
  'Kakinada', 'Kalyan', 'Kanchipuram', 'Kanpur', 'Karnal', 'Kochi', 'Kohima', 'Kolhapur', 'Kolkata', 'Kollam', 'Kota', 'Kozhikode', 'Kurnool',
  'Latur', 'Lucknow', 'Ludhiana', 'Madurai', 'Mangaluru', 'Mathura', 'Meerut', 'Mohali', 'Moradabad', 'Mumbai', 'Mysuru',
  'Nadiad', 'Nagercoil', 'Nagpur', 'Nainital', 'Nashik', 'Navi Mumbai', 'Nellore', 'Noida', 'Ooty',
  'Panaji', 'Panchkula', 'Panipat', 'Patiala', 'Patna', 'Puducherry', 'Pune',
  'Raipur', 'Rajahmundry', 'Rajkot', 'Ranchi', 'Rohtak', 'Roorkee', 'Rourkela',
  'Saharanpur', 'Salem', 'Sangli', 'Shillong', 'Shimla', 'Siliguri', 'Solapur', 'Srinagar', 'Surat',
  'Thane', 'Thiruvananthapuram', 'Thrissur', 'Tiruchirappalli', 'Tirunelveli', 'Tirupati', 'Tiruppur',
  'Udaipur', 'Ujjain', 'Vadodara', 'Vapi', 'Varanasi', 'Vellore', 'Vijayawada', 'Visakhapatnam', 'Warangal', 'Zirakpur'
];

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

const Navbar = () => {
  const { user, userCity, setUserCity } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null); 
  const notificationRef = useRef(null); 
  const latestSearchQueryRef = useRef('');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [citySearch, setCitySearch] = useState('');
  const [selectedAlphabet, setSelectedAlphabet] = useState('A'); 
  const [isDetecting, setIsDetecting] = useState(false); 

  const [instantResults, setInstantResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // If user scrolls down more than 20px, activate glassmorphism
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsNotificationOpen(false);
    }
  }, [user]);

  const handleMarkAsRead = async (id = null) => {
    try {
      const url = id ? `/notifications/read/${id}` : '/notifications/read';
      await api.put(url);
      
      if (id) {
        setNotifications((current) => current.map((notification) => (
          notification._id === id ? { ...notification, isRead: true } : notification
        )));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      let isActive = true;
      const query = searchQuery.trim();
      setIsSearching(true);
      setShowResults(true);
      latestSearchQueryRef.current = query;
      const delayDebounceFn = setTimeout(async () => {
        try {
          const { data } = await getCachedApi(`/events/search?q=${encodeURIComponent(query)}`, {}, { cacheTTL: 30000 });
          if (isActive && latestSearchQueryRef.current === query) {
            setInstantResults((data.data || []).slice(0, 5));
          }
        } catch (error) {
          console.error("Search Error", error);
        } finally {
          if (isActive && latestSearchQueryRef.current === query) {
            setIsSearching(false);
          }
        }
      }, 300); 
      return () => {
        isActive = false;
        clearTimeout(delayDebounceFn);
      };
    } else {
      setInstantResults([]);
      setShowResults(false);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not supported by your browser");

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const address = data.address;
          const detectedCity = address.city || address.state_district || address.county || address.town;
          
          if (detectedCity) {
            let cleanCity = detectedCity.replace(' District', '').trim();
            setUserCity(cleanCity);
            toast.success(`Location detected: ${cleanCity}`);
            setIsCityModalOpen(false);
          } else {
            toast.error("Could not determine your city exactly.");
          }
        } catch {
          toast.error("Failed to detect location.");
        } finally {
          setIsDetecting(false);
        }
      },
      () => {
        toast.error("Location permission denied.");
        setIsDetecting(false);
      }
    );
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowResults(false);
      setIsSearchFocused(false);
      navigate(`/search?q=${searchQuery}`);
    }
  };

  useEffect(() => {
    const currentTab = navTabs.find(tab => tab.path === location.pathname);
    document.body.className = currentTab ? currentTab.pageBg : 'bg-gray-50';
  }, [location.pathname]);

  const filteredCities = citySearch 
    ? allCities.filter(city => city.toLowerCase().includes(citySearch.toLowerCase()))
    : allCities.filter(city => city.toUpperCase().startsWith(selectedAlphabet));

  return (
    <>
      {/* --- PHASE 7: DYNAMIC GLASSMORPHISM --- */}
      <nav 
        className={`fixed top-0 z-50 w-full transition-all duration-300 ease-out ${
          isScrolled 
            ? 'bg-white/85 backdrop-blur-xl border-b border-orange-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] py-2' 
            : 'bg-white/95 border-b border-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14">
            
            {/* 1. LOGO */}
            <div className="flex items-center shrink-0 mr-10 lg:mr-16 gap-2">
              {location.pathname !== '/' && (
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors mr-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Link to="/" className="flex items-center gap-2 group select-none">
                <div className="relative">
                  <Ticket className="w-8 h-8 text-orange-500 transition-transform group-hover:scale-110 -rotate-12" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-gray-900 hidden sm:block">
                  Event<span className="text-orange-500">Book</span>
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-gray-900 sm:hidden">EB</span>
              </Link>
            </div>

            {/* 2. SEARCH BAR with INSTANT DROPDOWN */}
            <div ref={searchRef} className={`hidden md:flex items-center relative transition-all duration-300 w-full max-w-sm lg:max-w-md mr-10 lg:mr-16 ${isSearchFocused ? 'scale-105 z-50' : 'z-40'}`}>
              <div className="absolute left-4 text-gray-400 pointer-events-none">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Search className={`w-4 h-4 transition-colors ${isSearchFocused ? 'text-orange-500' : ''}`} />}
              </div>
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchSubmit}
                placeholder="Search for events, plays, activities..."
                onFocus={() => { setIsSearchFocused(true); if(searchQuery.length > 1) setShowResults(true); }}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none shadow-inner"
              />

              {/* ⚡ INSTANT SEARCH DROPDOWN */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {instantResults.length > 0 ? (
                    <>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Top Results
                      </div>
                      <ul>
                        {instantResults.map((event) => (
                          <li 
                            key={event._id}
                            onClick={() => {
                                setShowResults(false);
                                navigate(`/events/${event._id}`);
                            }}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                          >
                            <img src={resolveMediaUrl(event.image)} alt={event.title} className="w-10 h-14 object-cover rounded-md shadow-sm" />
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{event.title}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{event.category}</span>
                                • {event.date}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div 
                        onClick={() => handleSearchSubmit({ key: 'Enter' })}
                        className="p-3 text-center text-sm font-bold text-orange-600 bg-gray-50 hover:bg-orange-100 cursor-pointer transition-colors border-t border-gray-100"
                      >
                        View all results for "{searchQuery}"
                      </div>
                    </>
                  ) : (
                    !isSearching && (
                      <div className="p-8 text-center text-gray-500">
                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No events found for "{searchQuery}"</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 3. TABS */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-2 mr-auto">
              {navTabs.map(tab => (
                <Link key={tab.name} to={tab.path} className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ease-out cursor-pointer whitespace-nowrap ${location.pathname === tab.path ? tab.activeClass : tab.textClass}`}>
                  {tab.name}
                </Link>
              ))}
            </div>

            {/* 4. RIGHT SECTION */}
            <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-auto pl-2 lg:pl-8">
              <button 
                onClick={() => { setIsCityModalOpen(true); setCitySearch(''); }} 
                /* PHASE 7.3: active:scale-[0.95] */
                className="hidden md:flex items-center gap-2 group cursor-pointer transition-all active:scale-[0.95] px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <MapPin className="w-4 h-4 text-gray-500 group-hover:text-orange-600 transition-colors" />
                <span className="text-sm font-bold text-gray-700 group-hover:text-orange-600 truncate max-w-25 transition-colors">{userCity || 'Select City'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-all group-hover:rotate-180" />
              </button>

              <div className="flex items-center gap-4">
                {user && (
                  <div ref={notificationRef} className="relative">
                    <button 
                      onClick={() => {
                        setIsNotificationOpen(!isNotificationOpen);
                        if (!isNotificationOpen) fetchNotifications();
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative cursor-pointer"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>

                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-orange-500" /> Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={() => handleMarkAsRead()} 
                              className="text-xs text-orange-600 font-bold hover:text-orange-700 transition-colors cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map((notif) => (
                              <div 
                                key={notif._id} 
                                onClick={() => { if (!notif.isRead) handleMarkAsRead(notif._id); }}
                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-orange-50/30' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.isRead ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                  <div>
                                    <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                      {notif.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                    <span className="text-[10px] text-gray-400 font-bold mt-2 block uppercase tracking-wider">
                                      {new Date(notif.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-gray-500">
                              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No new notifications</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {user ? (
                  <Link to="/profile">
                    <button 
                      /* PHASE 7.3: active:scale-[0.95] */
                      className="w-10 h-10 rounded-full bg-orange-50 border-2 border-white shadow-sm flex items-center justify-center text-orange-600 font-bold hover:shadow-md transition-all active:scale-[0.95] cursor-pointer hover:scale-105"
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <button 
                      /* PHASE 7.3: active:scale-[0.95] */
                      className="px-5 py-2 bg-gray-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-gray-200 hover:bg-orange-600 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all active:scale-[0.95] cursor-pointer"
                    >
                      Sign In
                    </button>
                  </Link>
                )}
              </div>

              <button 
                /* PHASE 7.3: active:scale-[0.90] */
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-all active:scale-[0.90]" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* --- Mobile Menu --- */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-white ${isMobileMenuOpen ? 'max-h-screen border-t border-gray-100 shadow-xl' : 'max-h-0'}`}>
          <div className="px-4 py-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchSubmit} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            {/* Mobile Location */}
            <div className="flex items-center justify-between bg-orange-50 p-4 rounded-xl cursor-pointer border border-orange-100" onClick={() => { setIsCityModalOpen(true); setCitySearch(''); }}>
              <span className="text-gray-800 font-bold flex items-center"><MapPin className="w-5 h-5 mr-3 text-orange-500" /> {userCity || 'Select City'}</span>
              <span className="text-xs text-orange-600 font-bold bg-white px-2 py-1 rounded-md shadow-sm">Change</span>
            </div>
            <div className="space-y-2">
              {navTabs.map(tab => (
                <Link key={tab.name} to={tab.path} onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-4 rounded-xl text-base font-bold transition-all ${location.pathname === tab.path ? tab.activeClass : 'text-gray-600 hover:bg-gray-50'}`}>{tab.name}</Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* --- Location Modal --- */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 font-sans flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Select Location</h3>
              <button onClick={() => setIsCityModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {/* City Search Box */}
              <div className="space-y-4 mb-8">
                <div className="relative group">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text" 
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search for your city..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm" 
                  />
                </div>
                {/* Auto-Detect Location Button */}
                {!citySearch && (
                  <button 
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                    className="flex items-center justify-center gap-2 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 p-4 rounded-xl w-full transition-colors border border-orange-100 disabled:opacity-70"
                  >
                    {isDetecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 fill-current" />}
                    {isDetecting ? 'Detecting Location...' : 'Detect My Location'}
                  </button>
                )}
              </div>

              {/* Show Popular Cities ONLY if user is not typing in search box */}
              {!citySearch && (
                <div className="mb-8">
                  <h4 className="text-gray-900 font-bold mb-4">Popular Cities</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {popularCities.map((city) => (
                      <button 
                        key={city} 
                        onClick={() => { setUserCity(city); setIsCityModalOpen(false); }} 
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group ${userCity === city ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200' : 'border-gray-100 hover:border-orange-200 hover:bg-white hover:shadow-md text-gray-600 bg-gray-50/50'}`}
                      >
                        <Building2 className={`w-6 h-6 mb-2 transition-transform group-hover:-translate-y-1 ${userCity === city ? 'text-orange-500' : 'text-gray-300 group-hover:text-orange-400'}`} />
                        <span className="font-semibold text-xs truncate w-full text-center">{city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* A-Z City List / Search Results */}
              <div>
                <h4 className="text-gray-900 font-bold mb-3">
                  {citySearch ? `Search Results for "${citySearch}"` : "All Cities"}
                </h4>
                
                {/* A-Z FILTER ROW */}
                {!citySearch && (
                  <div className="flex overflow-x-auto no-scrollbar gap-3 pl-2 mb-6 pb-2 border-b border-gray-100">
                    {alphabets.map(letter => (
                      <button
                        key={letter}
                        onClick={() => setSelectedAlphabet(letter)}
                        className={`text-sm sm:text-base transition-all shrink-0 font-bold ${
                          selectedAlphabet === letter
                            ? 'text-orange-600 scale-125'
                            : 'text-gray-400 hover:text-orange-500 hover:scale-110'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                )}

                {/* Display Filtered Results */}
                {filteredCities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-sm text-gray-600">
                      {filteredCities.map(city => (
                        <button 
                          key={city} 
                          onClick={() => { setUserCity(city); setIsCityModalOpen(false); }} 
                          className={`text-left hover:text-orange-600 transition-colors px-3 py-2 rounded-lg font-medium ${userCity === city ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50'}`}
                        >
                          {city}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">
                      {citySearch 
                        ? `No cities found matching "${citySearch}"` 
                        : `No cities listed starting with "${selectedAlphabet}"`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
