import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/Axios';
import { toast } from 'react-hot-toast';
import { Store, Film, Building2, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';

const Partner = () => {
  const { user, setAuthUser } = useAuth();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'organizer' || user?.role === 'admin') {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to become a partner!');
      navigate('/login');
      return;
    }
    if (!selectedType) {
      return toast.error('Please select a business vertical.');
    }
    if (!companyName.trim()) {
      return toast.error('Please enter your company/organizer name.');
    }

    setLoading(true);
    try {
      const { data } = await api.put('/auth/upgrade-role', {
        role: 'organizer',
        businessType: selectedType,
        companyName: companyName.trim()
      });

      if (data.success && data.data) {
        toast.success('Welcome to the Partner Network!');
        if (setAuthUser) setAuthUser(data.data);
        navigate('/organizer/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { id: 'events', icon: <Store className="w-8 h-8" />, title: 'Event Organizer', desc: 'Host live concerts, workshops, and comedy shows.' },
    { id: 'producer', icon: <Film className="w-8 h-8" />, title: 'Movie Producer', desc: 'Distribute films and manage theatrical releases.' },
    { id: 'theatre', icon: <Building2 className="w-8 h-8" />, title: 'Theatre Owner', desc: 'Manage multiplex screens and schedule showtimes.' }
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            Grow Your Business with <span className="text-orange-600">EventBook</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            Join thousands of organizers, producers, and theatre owners. Reach millions of fans and manage your operations from one powerful dashboard.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-orange-600 p-10 text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>

              <h3 className="text-2xl font-black mb-6 relative z-10">Why Partner With Us?</h3>
              <ul className="space-y-6 relative z-10">
                {[
                  'Zero listing fees. Only pay a small commission on successful sales.',
                  'Real-time analytics, revenue tracking, and audience insights.',
                  'Dedicated scanning app for seamless box-office management.',
                  'Automated payout settlements directly to your bank.'
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-orange-200 shrink-0" />
                    <span className="font-medium text-orange-50 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Select your business vertical</h3>

              <div className="space-y-4 mb-8">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedType(opt.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-center gap-5 cursor-pointer
                      ${selectedType === opt.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-md transform scale-[1.02]'
                        : 'border-gray-100 dark:border-gray-700 hover:border-orange-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <div className={`p-3 rounded-xl shrink-0 ${selectedType === opt.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {opt.icon}
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${selectedType === opt.id ? 'text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{opt.title}</h4>
                      <p className={`text-sm mt-0.5 ${selectedType === opt.id ? 'text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company / Organizer Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Sunburn Festivals, PVR Cinemas..."
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all dark:text-white outline-none"
                  required
                />
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={handleUpgrade}
                  disabled={loading || !selectedType || !companyName.trim()}
                  className="w-full sm:w-auto px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Partner Dashboard'}
                  {!loading && <ChevronRight className="w-5 h-5" />}
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  By joining, you agree to our Platform Commission & Payment Settlement terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partner;
