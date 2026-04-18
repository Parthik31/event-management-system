import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User, Lock, Save, Loader2, LogOut,
  LayoutGrid, ShieldCheck, Ticket,
  HelpCircle, ChevronRight, Wallet, Award
} from 'lucide-react';
import api from '../../utils/Axios';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const { user, logout, setAuthUser } = useAuth();

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty');

    setLoading(true);
    try {
      const { data } = await api.put('/auth/updatedetails', { name: name.trim() });
      if (data?.data && setAuthUser) {
        setAuthUser(data.data);
      }
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match');
    }

    setLoading(true);
    try {
      await api.put('/auth/updatepassword', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      toast.success('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 mb-8 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-linear-to-br from-orange-100 to-orange-50 flex items-center justify-center text-4xl font-bold text-orange-600 border-4 border-white shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{user.name}</h1>
              <p className="text-gray-500 font-medium mb-3">{user.email}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border
                  ${user.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    user.role === 'organizer' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {user.role} Account
                </span>

                {user.role === 'user' && (
                  <Link to="/partner" className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline">
                    Upgrade to Organizer &rarr;
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-50">
              {user.role === 'organizer' && (
                <Link to="/organizer/dashboard" className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-gray-200">
                  Organizer Panel <LayoutGrid className="w-4 h-4" />
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin/dashboard" className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  Admin Dashboard <ShieldCheck className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Settings</h3>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'details' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" /> Personal Details
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'security' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-4 h-4" /> Password & Security
                </button>
              </div>

              <div className="p-4 bg-gray-50/50 border-b border-gray-100 border-t">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Activity & Support</h3>
              </div>
              <div className="p-2 space-y-1">
                <Link to="/my-tickets" className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-all group">
                  <span className="flex items-center gap-3"><Ticket className="w-4 h-4" /> Your Orders</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
                </Link>

                <Link to="/support" className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-all group">
                  <span className="flex items-center gap-3"><HelpCircle className="w-4 h-4" /> Help Center</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
                </Link>
              </div>

              <div className="p-2 border-t border-gray-100 mt-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-100">
              {activeTab === 'details' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
                    <p className="text-gray-500 text-sm mt-1">Manage your public profile information.</p>
                  </div>

                  {user.role !== 'admin' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg">
                      <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">EventBook Wallet</p>
                            <h3 className="text-3xl font-black tracking-tight">Rs.{user.walletBalance || 0}</h3>
                          </div>
                          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                            <Wallet className="w-5 h-5 text-gray-100" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-linear-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <p className="text-orange-100 font-bold uppercase tracking-wider text-[10px] mb-1">Loyalty Points</p>
                            <h3 className="text-3xl font-black tracking-tight">{user.loyaltyPoints || 0} <span className="text-sm font-bold text-orange-200">pts</span></h3>
                          </div>
                          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                            <Award className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                      >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900">Security</h2>
                    <p className="text-gray-500 text-sm mt-1">Update your password.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        required
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          required
                          value={passwords.newPassword}
                          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New</label>
                        <input
                          type="password"
                          required
                          value={passwords.confirmPassword}
                          onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-orange-500/20 cursor-pointer"
                      >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
