import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Heart, Users, Globe } from 'lucide-react';

// --- Safe Animated Counter ---
const AnimatedCounter = ({ endValue, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.5 }
    );

    if (countRef.current) observer.observe(countRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const numericValue = parseInt(endValue.replace(/[^0-9]/g, ''), 10);
      setCount(Math.floor(progress * numericValue));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    // Cleanup to prevent memory leak if component unmounts during animation
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isVisible, endValue, duration]);

  return (
    <span ref={countRef}>
      {count.toLocaleString()}{endValue.includes('k') ? 'k' : endValue.includes('M') ? 'M' : ''}+
    </span>
  );
};

const About = () => {
  const stats = [
    { label: "Tickets Sold", value: "10M" },
    { label: "Events Hosted", value: "50k" },
    { label: "Cities", value: "100" },
    { label: "Happy Users", value: "5M" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gray-900 text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
            Connecting you to <span className="text-orange-500">Magic.</span>
          </h1>
          <p className="text-gray-400 text-xl leading-relaxed max-w-2xl mx-auto">
            EventBook is India's largest entertainment destination. From the smallest workshop to the biggest stadium concert, we make it happen.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 border-b border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {stats.map((s, i) => (
            <div key={i} className="text-center group">
              <div className="text-4xl md:text-5xl font-black text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                <AnimatedCounter endValue={s.value} />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Story Section */}
      <div className="max-w-6xl mx-auto px-4 py-24 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-8 leading-tight">Our Story</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            Founded in 2026, EventBook was born out of a simple frustration: why is it so hard to find something fun to do?
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            We built a technology-first platform that handles millions of transactions with ease, ensuring that your only worry is showing up on time.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <Feature icon={<Ticket className="text-orange-600"/>} title="One-Tap Booking" color="bg-orange-50" />
          <Feature icon={<Users className="text-blue-600"/>} title="Fan Communities" color="bg-blue-50" />
          <Feature icon={<Heart className="text-red-600"/>} title="Handpicked" color="bg-red-50" />
          <Feature icon={<Globe className="text-emerald-600"/>} title="Pan-India" color="bg-emerald-50" />
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, color }) => (
  <div className={`${color} p-8 rounded-3xl transition-transform hover:-translate-y-2 duration-300`}>
    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-4">
      {icon}
    </div>
    <h3 className="font-bold text-gray-900">{title}</h3>
  </div>
);

export default About;
