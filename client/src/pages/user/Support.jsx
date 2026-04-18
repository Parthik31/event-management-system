import React from 'react';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Support = () => {
  const faqs = [
    { q: "How do I download my ticket?", a: "Go to Profile > Booking History. Click on 'View Ticket' to see your QR code or download the PDF." },
    { q: "Can I get a refund?", a: "Refund policies vary by event. Please check the 'Terms' section on the event details page." },
    { q: "How do I become an organizer?", a: "Go to your Profile and click 'List Your Show' or navigate to the Partner page to upgrade your account." },
  ];

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">How can we help?</h1>
          <p className="text-gray-500 text-lg">Browse our FAQs or reach out to our support team.</p>
        </div>

        <div className="space-y-4 mb-12">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-2xl p-6 hover:border-blue-200 transition-colors bg-gray-50/50">
              <h3 className="font-bold text-gray-900 mb-2 flex justify-between items-center">
                {faq.q}
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow">
            <Mail className="w-8 h-8 text-orange-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900">Email Support</h3>
            <p className="text-sm text-gray-500 mb-4">Get a response within 24 hours.</p>
            <a href="mailto:support@eventbook.com" className="text-orange-600 font-bold hover:underline">support@eventbook.com</a>
          </div>
          <div className="p-6 rounded-2xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow flex flex-col items-center justify-between">
            <div>
              <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900">Create Ticket</h3>
              <p className="text-sm text-gray-500 mb-4">Submit a formal support request.</p>
            </div>
            <Link to="/contact" className="text-green-600 font-bold hover:underline cursor-pointer">Contact Us</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Support;
