import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, MapPin, Image as ImageIcon, 
  Type, AlignLeft, Layers, ArrowLeft, Loader2,
  Video, Globe, Clock, Users, Layout, Save, Trash2, Map, Ticket,
  CheckCircle2, Upload, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/Axios';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const isEditMode = !!id;

  // --- UI States ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [imageInputType, setImageInputType] = useState('upload'); 
  const [bannerInputType, setBannerInputType] = useState('upload');
  const [layoutInputType, setLayoutInputType] = useState('upload'); 
  const [uploadingState, setUploadingState] = useState({ image: false, banner: false, layout: false });
  const today = new Date().toISOString().split('T')[0];
  const [validationErrors, setValidationErrors] = useState({});

  // --- Form States ---
  const [formData, setFormData] = useState({
    title: '', category: 'Music', language: 'English', ageLimit: 'All Ages',
    duration: '', date: '', time: '', location: '',
    description: '', image: '', banner: '', trailerUrl: '', terms: '',
    layoutImage: ''
  });

  const [hasLayout, setHasLayout] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({ rows: 10, cols: 15 });
  
  // Default to 1 category tier
  const [categories, setCategories] = useState([
    { name: 'General Entry', price: 0, capacity: 100 }
  ]);

  const eventCategories = ['Music', 'Comedy', 'Workshop', 'Sports', 'Theatre', 'Food Fest', 'Technology', 'Art'];
  const ageLimits = ['All Ages', '13+', '16+', '18+', '21+'];
  const minDate = isEditMode && formData.date && formData.date < today ? formData.date : today;

  const clearValidationError = (field) => {
    setValidationErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const fieldClassName = (field) =>
    `w-full rounded-2xl border px-4 py-3.5 text-sm text-slate-700 outline-none transition ${
      validationErrors[field]
        ? 'border-rose-300 bg-rose-50 focus:border-rose-400'
        : 'border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white'
    }`;

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      nextErrors.title = 'Enter an event title with at least 3 characters.';
    }

    if (!formData.date) {
      nextErrors.date = 'Choose an event date.';
    } else if (!isEditMode && formData.date < today) {
      nextErrors.date = 'Event date cannot be in the past.';
    }

    if (!formData.location.trim() || formData.location.trim().length < 8) {
      nextErrors.location = 'Add a more complete venue address so attendees can find the event.';
    }

    if (!formData.description.trim() || formData.description.trim().length < 30) {
      nextErrors.description = 'Add a richer description with at least 30 characters.';
    }

    if (!formData.image || !formData.banner) {
      nextErrors.media = 'Upload or paste both a poster and banner before submitting.';
    }

    const normalizedCategoryNames = categories.map((category) => category.name.trim().toLowerCase()).filter(Boolean);
    if (
      categories.some((category) => !category.name.trim() || Number(category.price) < 0 || Number(category.capacity) < 1) ||
      new Set(normalizedCategoryNames).size !== normalizedCategoryNames.length
    ) {
      nextErrors.categories = 'Ticket tiers need unique names, valid prices, and capacity above zero.';
    }

    if (hasLayout && (Number(layoutConfig.rows) < 1 || Number(layoutConfig.cols) < 1)) {
      nextErrors.layout = 'Rows and columns must both be at least 1 when seating layout is enabled.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Fetch data if Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchEvent = async () => {
        try {
          const { data } = await api.get(`/events/organizer/manage/${id}`);
          const event = data.data;
          setFormData({
            title: event.title || '',
            category: event.category || 'Music',
            language: event.language || 'English',
            ageLimit: event.ageLimit || 'All Ages',
            duration: event.duration || '',
            date: event.date || '',
            time: event.time || '',
            location: event.location || '',
            description: event.description || '',
            image: event.image || '',
            banner: event.banner || '',
            trailerUrl: event.trailerUrl || '',
            terms: event.terms || '',
            layoutImage: event.layoutImage || ''
          });
          setHasLayout(event.hasLayout || false);
          setLayoutConfig(event.layoutConfig || { rows: 10, cols: 15 });
          if (event.ticketCategories && event.ticketCategories.length > 0) {
            setCategories(event.ticketCategories);
          }
          // Set input types to URL if existing data is present to show previews
          if (event.image) setImageInputType('url');
          if (event.banner) setBannerInputType('url');
          if (event.layoutImage) setLayoutInputType('url');
        } catch {
          toast.error("Failed to load event data");
          navigate('/organizer/my-events');
        } finally {
          setIsLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    clearValidationError(e.target.name);
    if (e.target.name === 'image' || e.target.name === 'banner') {
      clearValidationError('media');
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLayoutConfigChange = (e) => {
    clearValidationError('layout');
    setLayoutConfig({ ...layoutConfig, [e.target.name]: Number(e.target.value) });
  };

  // --- Dynamic Category Handlers ---
  const handleCategoryChange = (index, field, value) => {
    clearValidationError('categories');
    const updatedCategories = [...categories];
    updatedCategories[index][field] = field === 'name' ? value : Number(value);
    setCategories(updatedCategories);
  };

  const addCategory = () => {
    clearValidationError('categories');
    setCategories([...categories, { name: '', price: 0, capacity: 50 }]);
  };

  const removeCategory = (index) => {
    if (categories.length === 1) return toast.error("You must have at least one ticket category.");
    setCategories(categories.filter((_, i) => i !== index));
  };

  // --- Image Upload Handlers ---
  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploadingState(prev => ({ ...prev, [field]: true }));
    try {
      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, [field]: res.data.url });
      clearValidationError('media');
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} uploaded successfully!`);
    } catch {
      toast.error(`Failed to upload ${field}.`);
    } finally {
      setUploadingState(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);

    // Base price is the cheapest tier
    const basePrice = Math.min(...categories.map(c => c.price));

    const payload = {
      ...formData,
      price: basePrice,
      hasLayout,
      layoutConfig,
      ticketCategories: categories
    };

    try {
      if (isEditMode) {
        await api.put(`/events/${id}`, payload);
        toast.success("Event updated successfully!");
      } else {
        await api.post('/events', payload);
        toast.success("Event created successfully! Pending admin approval.");
      }
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        
        {/* Header */}
        <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
            <Ticket className="w-3.5 h-3.5" />
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </div>
          <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-2xl bg-slate-50 p-3 transition hover:shadow-md">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {isEditMode ? 'Edit Event Listing' : 'Create New Event'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Keep the existing workflow, but give organizers a cleaner, more reliable event publishing experience with stronger validation.
            </p>
          </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {Object.keys(validationErrors).length > 0 ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              <p className="font-semibold">Please review the highlighted fields before submitting.</p>
            </div>
          ) : null}
          
          {/* Section 1: Basic Details */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <h2 className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
              <Type className="w-5 h-5 text-orange-500" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Event Title *</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className={`${fieldClassName('title')} pl-12 pr-4`} placeholder="e.g., Sunburn Arena Ft. Alan Walker" />
                </div>
                {validationErrors.title ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.title}</p> : null}
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Category *</label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white">
                    {eventCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Language *</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" name="language" value={formData.language} onChange={handleChange} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" placeholder="e.g., Hindi, English" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Age Limit *</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select name="ageLimit" value={formData.ageLimit} onChange={handleChange} className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white">
                    {ageLimits.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Duration *</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" name="duration" value={formData.duration} onChange={handleChange} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" placeholder="e.g., 2hrs 30mins" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Date & Location */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <h2 className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
              <Calendar className="w-5 h-5 text-orange-500" /> Date & Venue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Event Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="date" name="date" min={minDate} value={formData.date} onChange={handleChange} required className={`${fieldClassName('date')} pl-12 pr-4`} />
                </div>
                {validationErrors.date ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.date}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Start Time *</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Venue Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" name="location" value={formData.location} onChange={handleChange} required className={`${fieldClassName('location')} pl-12 pr-4`} placeholder="e.g., Jio World Garden, BKC, Mumbai" />
                </div>
                {validationErrors.location ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.location}</p> : null}
              </div>
            </div>
          </div>

          {/* Section 3: Media & Assets (With Dynamic Upload vs URL Toggle) */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <h2 className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
              <ImageIcon className="w-5 h-5 text-orange-500" /> Media & Graphics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {validationErrors.media ? (
                <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {validationErrors.media}
                </div>
              ) : null}
              {/* Event Poster */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700">Vertical Poster *</label>
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setImageInputType('upload')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${imageInputType === 'upload' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Upload</button>
                    <button type="button" onClick={() => setImageInputType('url')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${imageInputType === 'url' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>URL</button>
                  </div>
                </div>

                {imageInputType === 'url' ? (
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="url" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
                  </div>
                ) : (
                  <div className="relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-orange-200 bg-slate-50 transition hover:bg-orange-50">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    {uploadingState.image ? (
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    ) : formData.image && imageInputType === 'upload' ? (
                      <>
                        <img src={formData.image} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-50 z-0" />
                        <div className="relative z-10 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"><CheckCircle2 className="w-5 h-5" /> Uploaded</div>
                      </>
                    ) : (
                      <>
                        <Upload className="mb-2 w-8 h-8 text-orange-500" />
                        <span className="text-sm font-medium text-slate-600">Click or drag poster here</span>
                      </>
                    )}
                  </div>
                )}
                {formData.image && imageInputType === 'url' && (
                  <div className="mt-2 h-48 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Event Banner */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700">Landscape Banner *</label>
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setBannerInputType('upload')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bannerInputType === 'upload' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Upload</button>
                    <button type="button" onClick={() => setBannerInputType('url')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bannerInputType === 'url' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>URL</button>
                  </div>
                </div>

                {bannerInputType === 'url' ? (
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="url" name="banner" value={formData.banner} onChange={handleChange} placeholder="https://..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
                  </div>
                ) : (
                  <div className="relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-orange-200 bg-slate-50 transition hover:bg-orange-50">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    {uploadingState.banner ? (
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    ) : formData.banner && bannerInputType === 'upload' ? (
                      <>
                        <img src={formData.banner} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-50 z-0" />
                        <div className="relative z-10 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"><CheckCircle2 className="w-5 h-5" /> Uploaded</div>
                      </>
                    ) : (
                      <>
                        <Upload className="mb-2 w-8 h-8 text-orange-500" />
                        <span className="text-sm font-medium text-slate-600">Click or drag banner here</span>
                      </>
                    )}
                  </div>
                )}
                {formData.banner && bannerInputType === 'url' && (
                  <div className="mt-2 h-48 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <img src={formData.banner} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* YouTube Trailer */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Promotional Video / Trailer URL</label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="url" name="trailerUrl" value={formData.trailerUrl} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" placeholder="https://youtube.com/watch?v=..." />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Ticketing & Pricing (Dynamic Tiers) */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Ticket className="w-5 h-5 text-orange-500" /> Ticketing Tiers
              </h2>
            </div>
            
            <div className="space-y-4">
              {categories.map((cat, index) => (
                <div key={index} className="relative flex flex-col items-end gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row">
                  <div className="w-full md:w-2/5">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Tier Name</label>
                    <input type="text" value={cat.name} onChange={(e) => handleCategoryChange(index, 'name', e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 outline-none transition focus:border-orange-300" placeholder="e.g., VIP Phase 1" />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Price (INR)</label>
                    <input type="number" min="0" value={cat.price} onChange={(e) => handleCategoryChange(index, 'price', e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 outline-none transition focus:border-orange-300" />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Capacity</label>
                    <input type="number" min="1" value={cat.capacity} onChange={(e) => handleCategoryChange(index, 'capacity', e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 outline-none transition focus:border-orange-300" />
                  </div>
                  <div className="w-full md:w-auto pb-1">
                    <button type="button" onClick={() => removeCategory(index)} className="flex w-full justify-center rounded-2xl bg-rose-50 p-2.5 text-rose-500 transition hover:bg-rose-100 md:w-auto">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {validationErrors.categories ? <p className="mt-4 text-sm font-medium text-rose-600">{validationErrors.categories}</p> : null}

            <button type="button" onClick={addCategory} className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
              + Add Another Tier
            </button>
          </div>

          {/* Section 5: Seating Layout Configuration */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Layout className="w-5 h-5 text-orange-500" /> Interactive Seating Layout
                </h2>
                <p className="mt-1 text-sm text-slate-500">Allow users to pick specific seats during checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={hasLayout} onChange={() => {
                  clearValidationError('layout');
                  setHasLayout(!hasLayout);
                }} className="sr-only peer" />
                <div className="w-14 h-7 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-orange-500 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            {hasLayout && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 gap-6 rounded-3xl border border-orange-100 bg-orange-50/50 p-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Number of Rows</label>
                    <input type="number" min="1" max="50" name="rows" value={layoutConfig.rows} onChange={handleLayoutConfigChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Seats per Row (Columns)</label>
                    <input type="number" min="1" max="50" name="cols" value={layoutConfig.cols} onChange={handleLayoutConfigChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300" />
                  </div>
                </div>
                {validationErrors.layout ? <p className="text-sm font-medium text-rose-600">{validationErrors.layout}</p> : null}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-700">Venue Layout Image (Optional Guide)</label>
                    <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                      <button type="button" onClick={() => setLayoutInputType('upload')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${layoutInputType === 'upload' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Upload</button>
                      <button type="button" onClick={() => setLayoutInputType('url')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${layoutInputType === 'url' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>URL</button>
                    </div>
                  </div>

                  {layoutInputType === 'url' ? (
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="url" name="layoutImage" value={formData.layoutImage} onChange={handleChange} placeholder="https://..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
                    </div>
                  ) : (
                    <div className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-orange-200 bg-slate-50 transition hover:bg-orange-50">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'layoutImage')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                      {uploadingState.layout ? (
                        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      ) : formData.layoutImage && layoutInputType === 'upload' ? (
                        <>
                          <img src={formData.layoutImage} alt="Layout" className="absolute inset-0 w-full h-full object-contain opacity-50 z-0" />
                          <div className="relative z-10 bg-emerald-500 text-white px-3 py-1.5 text-sm rounded-lg font-bold flex items-center gap-2 shadow-lg"><CheckCircle2 className="w-4 h-4" /> Uploaded</div>
                        </>
                      ) : (
                        <>
                          <Map className="mb-2 w-6 h-6 text-orange-500" />
                          <span className="text-sm font-medium text-slate-600">Upload Map/Layout</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Additional Information */}
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8">
            <h2 className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
              <AlignLeft className="w-5 h-5 text-orange-500" /> Deep Dive
            </h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Description & Lineup *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="6" required className={`${fieldClassName('description')} resize-y`} placeholder="Tell the attendees everything they need to know..."></textarea>
                {validationErrors.description ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.description}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Terms & Conditions</label>
                <textarea name="terms" value={formData.terms} onChange={handleChange} rows="4" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" placeholder="Age restrictions, refund policies, bag policies..." />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-4 pt-4 pb-8">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 cursor-pointer rounded-2xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || uploadingState.image || uploadingState.banner} className="flex-2 flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] py-4 font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-1">
              {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Save className="w-5 h-5" /> {isEditMode ? 'Save Changes' : 'Submit Event Listing'}</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
