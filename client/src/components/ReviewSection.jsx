import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Send, Loader2, Reply, CheckCircle2 } from 'lucide-react';
import api from '../utils/Axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

// 🚀 Accept organizerId as a prop so we know who has permission to reply
const ReviewSection = ({ eventId, organizerId }) => {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);

  // Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Organizer Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const currentUserId = user?._id || user?.id;
  const isOrganizer = Boolean(organizerId) && currentUserId === organizerId;

  const fetchReviews = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/reviews`);
      setReviews(data.data);
      // Average calculation
      const avg = data.data.length 
        ? (data.data.reduce((acc, item) => item.rating + acc, 0) / data.data.length).toFixed(1)
        : 0;
      setStats({ count: data.data.length, average: avg });
    } catch {
      console.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error("Please login to review.");
    if (!comment.trim()) return toast.error("Please enter a comment.");

    setIsSubmitting(true);
    try {
      await api.post(`/events/${eventId}/reviews`, { rating, comment });
      toast.success("Review posted!");
      setComment('');
      setRating(5);
      fetchReviews(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post review. Did you attend this event?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      await api.put(`/events/${eventId}/reviews/${reviewId}/reply`, { reply: replyText });
      toast.success("Reply posted!");
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } catch {
      toast.error("Failed to post reply.");
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="mt-12 pt-10 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-orange-500" />
          Attendee Reviews
        </h3>
        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl">
          <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
          <span className="font-black text-orange-600 text-lg">{stats.average}</span>
          <span className="text-xs font-bold text-orange-400">({stats.count})</span>
        </div>
      </div>

      {/* Write a Review Form (Hidden for Organizers) */}
      {isAuthenticated && !isOrganizer && (
        <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 p-6 rounded-3xl border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <Star 
                key={num} 
                onClick={() => setRating(num)}
                className={`w-8 h-8 cursor-pointer transition-colors ${num <= rating ? 'text-orange-500 fill-orange-500' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience about this event..."
            className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none resize-none mb-4"
            rows="3"
            required
          />
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post Review
          </button>
        </form>
      )}

      {/* Review List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : reviews.length > 0 ? reviews.map((rev) => (
          <div key={rev._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-black text-gray-900 block text-lg">{rev.user?.name || 'Anonymous User'}</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < rev.rating ? 'text-orange-500 fill-orange-500' : 'text-gray-200 fill-gray-100'}`} />
                ))}
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">{rev.comment}</p>

            {/* ORGANIZER REPLY SECTION */}
            {rev.organizerReply ? (
              <div className="mt-5 ml-6 p-4 bg-orange-50/50 rounded-2xl border-l-4 border-orange-500">
                <p className="text-xs font-black text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Organizer Response
                </p>
                <p className="text-sm text-gray-700 italic">"{rev.organizerReply}"</p>
              </div>
            ) : isOrganizer ? (
              <div className="mt-4 pt-4 border-t border-gray-50">
                {replyingTo === rev._id ? (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..." 
                      className="flex-1 px-4 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <button 
                      onClick={() => handleReplySubmit(rev._id)}
                      disabled={isReplying}
                      className="px-4 py-2 bg-orange-600 text-white font-bold text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </button>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 font-bold text-sm rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setReplyingTo(rev._id); setReplyText(''); }}
                    className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
                  >
                    <Reply className="w-4 h-4" /> Reply to attendee
                  </button>
                )}
              </div>
            ) : null}

          </div>
        )) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
