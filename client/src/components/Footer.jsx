import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { Ticket, Heart, ShieldCheck, HeadphonesIcon, MailCheck } from 'lucide-react';

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-[#111827] text-slate-300 pt-16 pb-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* MAIN SECTION: Navigation & Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-gray-800/60">
          
          {/* Column 1: Brand */}
          <div className="col-span-1">
            <Link to="/" className="items-center gap-2 mb-4 group inline-flex">
              <Ticket className="w-6 h-6 text-orange-500 -rotate-12 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-extrabold tracking-tight text-white">
                Event<span className="text-orange-500">Book</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 pe-4">
              Your premier destination for discovering and booking the best live experiences, plays, sports, and activities in your city.
            </p>
            {!user && (
              <Link to="/register" className="inline-block px-5 py-2.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors">
                List Your Event
              </Link>
            )}
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">EventBook</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/partner" className="hover:text-white transition-colors">Partner with Us</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">Help & Policies</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/support" className="hover:text-white transition-colors">FAQs & Help Center</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cancellation Policy</a></li>
            </ul>
          </div>

          {/* Column 4: Trust & Features */}
          <div className="col-span-1">
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">Why Choose Us</h4>
            
            <div className="space-y-5">
              {/* Feature 1 */}
              <div className="flex items-start gap-3 group">
                <HeadphonesIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm">24/7 Customer Care</h5>
                  <p className="text-xs text-gray-500 mt-0.5">We're here to help anytime</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 group">
                <MailCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm">Resend Booking Ticket</h5>
                  <p className="text-xs text-gray-500 mt-0.5">Download it directly via Email</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3 group">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm">100% Secure Payments</h5>
                  <p className="text-xs text-gray-500 mt-0.5">All major credit/debit cards accepted</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Copyright & Socials */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 gap-4">
          <p className="text-xs text-slate-500 text-center md:text-left">
            © {new Date().getFullYear()} EventBook Inc. All rights reserved. Built with <Heart className="w-3 h-3 inline text-red-500 fill-current mx-0.5" /> for live experiences.
          </p>
          
          <div className="flex items-center gap-3">
            <SocialIcon icon={<FaFacebook size={16} />} href="https://facebook.com" hoverColor="hover:bg-blue-600" />
            <SocialIcon icon={<FaInstagram size={16} />} href="https://instagram.com" hoverColor="hover:bg-pink-600" />
            <SocialIcon icon={<FaTwitter size={16} />} href="https://twitter.com" hoverColor="hover:bg-sky-500" />
            <SocialIcon icon={<FaYoutube size={16} />} href="https://youtube.com" hoverColor="hover:bg-red-600" />
            <SocialIcon icon={<FaLinkedin size={16} />} href="https://linkedin.com" hoverColor="hover:bg-blue-700" />
          </div>
        </div>

      </div>
    </footer>
  );
};

const SocialIcon = ({ icon, href, hoverColor }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noreferrer"
    aria-label="Social Link"
    className={`w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-slate-400 ${hoverColor} hover:text-white transition-all duration-300 cursor-pointer`}
  >
    {icon}
  </a>
);

export default Footer;
