import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Tag,
  Type,
  Upload,
  User,
  Users,
  Video,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/Axios';

const today = new Date().toISOString().split('T')[0];

const CreateMovie = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    releaseDate: '',
    certificate: 'UA',
    genre: '',
    language: ''
  });

  const [media, setMedia] = useState({
    poster: { mode: 'url', file: null, value: '', preview: '' },
    banner: { mode: 'url', file: null, value: '', preview: '' },
    trailers: [{ id: Date.now(), mode: 'url', file: null, value: '', preview: '' }]
  });

  const [cast, setCast] = useState([{ id: Date.now(), name: '', role: '', file: null, preview: '' }]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const fetchMovie = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/movies/organizer/manage/${id}`);
        const movie = data.data;

        setFormData({
          title: movie.title || '',
          description: movie.description || '',
          duration: movie.duration !== undefined ? String(movie.duration) : '',
          releaseDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString().split('T')[0] : '',
          certificate: movie.certificate || 'UA',
          genre: Array.isArray(movie.genre) ? movie.genre.join(', ') : '',
          language: Array.isArray(movie.language) ? movie.language.join(', ') : ''
        });

        setMedia({
          poster: { mode: 'url', file: null, value: movie.poster || '', preview: movie.poster || '' },
          banner: { mode: 'url', file: null, value: movie.banner || '', preview: movie.banner || '' },
          trailers:
            Array.isArray(movie.trailers) && movie.trailers.length
              ? movie.trailers.map((trailer, index) => ({
                  id: Date.now() + index,
                  mode: 'url',
                  file: null,
                  value: trailer,
                  preview: trailer
                }))
              : [{ id: Date.now(), mode: 'url', file: null, value: '', preview: '' }]
        });

        setCast(
          Array.isArray(movie.cast) && movie.cast.length
            ? movie.cast.map((member, index) => ({
                id: Date.now() + index,
                name: member.name || '',
                role: member.role || '',
                file: null,
                preview: member.image || ''
              }))
            : [{ id: Date.now(), name: '', role: '', file: null, preview: '' }]
        );
      } catch {
        toast.error('Failed to load movie data for editing.');
        navigate('/organizer/my-movies');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id, isEditMode, navigate]);

  const minDate = isEditMode && formData.releaseDate && formData.releaseDate < today ? formData.releaseDate : today;
  const hasPoster = Boolean(media.poster.preview);
  const hasBanner = Boolean(media.banner.preview);

  const filledCastCount = useMemo(
    () => cast.filter((member) => member.name.trim() && member.role.trim()).length,
    [cast]
  );

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    clearValidationError(name);
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleMediaModeToggle = (field, mode) => {
    setMedia((current) => ({
      ...current,
      [field]: {
        ...current[field],
        mode
      }
    }));
  };

  const handleMediaUrlChange = (field, url) => {
    clearValidationError(field);
    setMedia((current) => ({
      ...current,
      [field]: { ...current[field], value: url, preview: url }
    }));
  };

  const handleMediaFileChange = (field, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearValidationError(field);
    setMedia((current) => ({
      ...current,
      [field]: {
        ...current[field],
        file,
        preview: URL.createObjectURL(file)
      }
    }));
  };

  const addTrailer = () => {
    setMedia((current) => ({
      ...current,
      trailers: [...current.trailers, { id: Date.now(), mode: 'url', file: null, value: '', preview: '' }]
    }));
  };

  const removeTrailer = (trailerId) => {
    setMedia((current) => ({
      ...current,
      trailers: current.trailers.filter((trailer) => trailer.id !== trailerId)
    }));
  };

  const updateTrailer = (trailerId, key, value) => {
    clearValidationError('trailers');
    setMedia((current) => ({
      ...current,
      trailers: current.trailers.map((trailer) => (trailer.id === trailerId ? { ...trailer, [key]: value } : trailer))
    }));
  };

  const handleTrailerFileChange = (trailerId, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    updateTrailer(trailerId, 'file', file);
    updateTrailer(trailerId, 'preview', URL.createObjectURL(file));
  };

  const addCastMember = () => {
    setCast((current) => [...current, { id: Date.now(), name: '', role: '', file: null, preview: '' }]);
  };

  const removeCastMember = (memberId) => {
    setCast((current) => current.filter((member) => member.id !== memberId));
  };

  const updateCastMember = (memberId, key, value) => {
    clearValidationError('cast');
    setCast((current) => current.map((member) => (member.id === memberId ? { ...member, [key]: value } : member)));
  };

  const handleCastImageChange = (memberId, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    updateCastMember(memberId, 'file', file);
    updateCastMember(memberId, 'preview', URL.createObjectURL(file));
  };

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = String(url || '').match(regExp);
    return match && match[2]?.length === 11 ? match[2] : null;
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.title.trim() || formData.title.trim().length < 2) {
      nextErrors.title = 'Enter a movie title with at least 2 characters.';
    }

    if (!formData.description.trim() || formData.description.trim().length < 30) {
      nextErrors.description = 'Add a richer synopsis with at least 30 characters.';
    }

    if (!formData.releaseDate) {
      nextErrors.releaseDate = 'Choose a release date.';
    }

    if (!formData.duration || Number(formData.duration) < 1) {
      nextErrors.duration = 'Duration must be at least 1 minute.';
    }

    if (!formData.genre.trim()) {
      nextErrors.genre = 'Add at least one genre.';
    }

    if (!formData.language.trim()) {
      nextErrors.language = 'Add at least one language.';
    }

    if (!hasPoster) {
      nextErrors.poster = 'Poster is required.';
    }

    if (!hasBanner) {
      nextErrors.banner = 'Banner is required.';
    }

    if (cast.some((member) => (member.name.trim() && !member.role.trim()) || (!member.name.trim() && member.role.trim()))) {
      nextErrors.cast = 'Each cast member should include both a name and a role.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Please review the highlighted movie fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();

      payload.append('title', formData.title.trim());
      payload.append('description', formData.description.trim());
      payload.append('duration', String(Number(formData.duration)));
      payload.append('releaseDate', formData.releaseDate);
      payload.append('certificate', formData.certificate);
      payload.append(
        'genre',
        JSON.stringify(
          formData.genre
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );
      payload.append(
        'language',
        JSON.stringify(
          formData.language
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );

      if (media.poster.mode === 'file' && media.poster.file) {
        payload.append('poster', media.poster.file);
      } else {
        payload.append('posterUrl', media.poster.value || media.poster.preview);
      }

      if (media.banner.mode === 'file' && media.banner.file) {
        payload.append('banner', media.banner.file);
      } else {
        payload.append('bannerUrl', media.banner.value || media.banner.preview);
      }

      const trailerUrls = [];
      media.trailers.forEach((trailer) => {
        if (trailer.mode === 'file' && trailer.file) {
          payload.append('trailerFiles', trailer.file);
        } else if (trailer.value) {
          trailerUrls.push(trailer.value);
        }
      });
      payload.append('trailerUrls', JSON.stringify(trailerUrls));

      const castMetadata = cast
        .filter((member) => member.name.trim() && member.role.trim())
        .map((member) => ({
          name: member.name.trim(),
          role: member.role.trim(),
          image: member.file ? '' : member.preview || '',
          hasImage: Boolean(member.file)
        }));
      payload.append('castData', JSON.stringify(castMetadata));

      cast.forEach((member) => {
        if (member.name.trim() && member.role.trim() && member.file) {
          payload.append('castImages', member.file);
        }
      });

      const response = isEditMode
        ? await api.put(`/movies/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/movies', payload, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.data.success) {
        toast.success(isEditMode ? 'Movie updated successfully.' : 'Movie submitted to admin for approval.');
        navigate('/organizer/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)]">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              <Film className="h-3.5 w-3.5" />
              {isEditMode ? 'Edit Movie' : 'Create Movie'}
            </div>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                  {isEditMode ? 'Update movie listing' : 'Create a premium movie listing'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Publish movies with stronger validation, richer media, and a cleaner organizer experience while keeping the current workflow unchanged.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <TopChip label="Poster" value={hasPoster ? 'Ready' : 'Missing'} />
                <TopChip label="Banner" value={hasBanner ? 'Ready' : 'Missing'} />
                <TopChip label="Cast" value={filledCastCount || 0} />
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6">
          {Object.keys(validationErrors).length ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
              Please review the highlighted movie fields before submitting.
            </div>
          ) : null}

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <SectionHeader icon={<Type className="h-5 w-5" />} title="Basic Information" description="Set the key movie details audiences and admins rely on first." />
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Movie Title" error={validationErrors.title} className="md:col-span-2">
                <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClass(Boolean(validationErrors.title))} placeholder="e.g. Yugantar: The Edge of Time" />
              </Field>

              <Field label="Synopsis / Description" error={validationErrors.description} className="md:col-span-2">
                <textarea
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  className={`${inputClass(Boolean(validationErrors.description))} resize-none`}
                  placeholder="Write a compelling plot summary and viewing hook."
                />
              </Field>

              <Field label="Release Date" error={validationErrors.releaseDate}>
                <input type="date" name="releaseDate" min={minDate} value={formData.releaseDate} onChange={handleChange} className={inputClass(Boolean(validationErrors.releaseDate))} />
              </Field>

              <Field label="Duration (minutes)" error={validationErrors.duration}>
                <input type="number" name="duration" min="1" value={formData.duration} onChange={handleChange} className={inputClass(Boolean(validationErrors.duration))} placeholder="165" />
              </Field>
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <SectionHeader icon={<Users className="h-5 w-5" />} title="Cast & Crew" description="Add the primary faces behind the movie with optional profile images." />
              <button type="button" onClick={addCastMember} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            </div>

            {validationErrors.cast ? <p className="mb-4 text-sm font-medium text-rose-600">{validationErrors.cast}</p> : null}

            <div className="grid gap-4">
              {cast.map((member) => (
                <div key={member.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative">
                      <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-orange-200 bg-white">
                        {member.preview ? <img src={member.preview} alt={member.name || 'Cast member'} className="h-full w-full object-cover" /> : <User className="h-7 w-7 text-slate-400" />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <input type="file" accept="image/*" onChange={(event) => handleCastImageChange(member.id, event)} className="hidden" />
                      </label>
                    </div>

                    <div className="grid flex-1 gap-4 md:grid-cols-2">
                      <input type="text" value={member.name} onChange={(event) => updateCastMember(member.id, 'name', event.target.value)} className={inputClass(false)} placeholder="Full name" />
                      <input type="text" value={member.role} onChange={(event) => updateCastMember(member.id, 'role', event.target.value)} className={inputClass(false)} placeholder="Role" />
                    </div>

                    {cast.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeCastMember(member.id)}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <SectionHeader icon={<ImageIcon className="h-5 w-5" />} title="Media Assets" description="Manage poster, banner, and trailer sources with quick previews for each asset." />

            <div className="grid gap-8 md:grid-cols-2">
              <MediaField
                label="Movie Poster"
                field="poster"
                mediaState={media.poster}
                error={validationErrors.poster}
                onModeChange={handleMediaModeToggle}
                onUrlChange={handleMediaUrlChange}
                onFileChange={handleMediaFileChange}
                aspectClass="aspect-[2/3]"
              />

              <MediaField
                label="Hero Banner"
                field="banner"
                mediaState={media.banner}
                error={validationErrors.banner}
                onModeChange={handleMediaModeToggle}
                onUrlChange={handleMediaUrlChange}
                onFileChange={handleMediaFileChange}
                aspectClass="aspect-video"
              />
            </div>

            <div className="mt-8 border-t border-slate-100 pt-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Trailers & Teasers</h3>
                  <p className="mt-1 text-sm text-slate-500">Add YouTube links or upload local video files for preview-ready trailers.</p>
                </div>
                <button type="button" onClick={addTrailer} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  <Plus className="h-4 w-4" />
                  Add Trailer
                </button>
              </div>

              <div className="grid gap-4">
                {media.trailers.map((trailer) => {
                  const youtubeId = trailer.mode === 'url' ? getYouTubeId(trailer.value) : null;

                  return (
                    <div key={trailer.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1">
                          <div className="mb-3 inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                            {['url', 'file'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateTrailer(trailer.id, 'mode', mode)}
                                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                  trailer.mode === mode ? 'bg-orange-50 text-orange-700' : 'text-slate-500'
                                }`}
                              >
                                {mode === 'url' ? 'YouTube URL' : 'Upload File'}
                              </button>
                            ))}
                          </div>

                          {trailer.mode === 'url' ? (
                            <input
                              type="url"
                              value={trailer.value}
                              onChange={(event) => {
                                updateTrailer(trailer.id, 'value', event.target.value);
                                updateTrailer(trailer.id, 'preview', event.target.value);
                              }}
                              className={inputClass(false)}
                              placeholder="https://youtube.com/watch?v=..."
                            />
                          ) : (
                            <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:bg-orange-50">
                              <Upload className="mr-2 h-4 w-4 text-orange-500" />
                              Upload trailer file
                              <input type="file" accept="video/*" onChange={(event) => handleTrailerFileChange(trailer.id, event)} className="hidden" />
                            </label>
                          )}
                        </div>

                        <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-950 lg:w-70">
                          {trailer.mode === 'url' && youtubeId ? (
                            <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${youtubeId}`} title="Trailer Preview" allowFullScreen />
                          ) : trailer.mode === 'file' && trailer.preview ? (
                            <video className="h-full w-full object-cover" src={trailer.preview} controls />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              <Video className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        {media.trailers.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeTrailer(trailer.id)}
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <SectionHeader icon={<Tag className="h-5 w-5" />} title="Classification" description="Define discoverability and certification metadata for the movie listing." />
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Genres" error={validationErrors.genre}>
                <input type="text" name="genre" value={formData.genre} onChange={handleChange} className={inputClass(Boolean(validationErrors.genre))} placeholder="Action, Sci-Fi" />
              </Field>
              <Field label="Languages" error={validationErrors.language}>
                <input type="text" name="language" value={formData.language} onChange={handleChange} className={inputClass(Boolean(validationErrors.language))} placeholder="Hindi, English" />
              </Field>
              <Field label="Censor Certificate" className="md:col-span-2">
                <select name="certificate" value={formData.certificate} onChange={handleChange} className={inputClass(false)}>
                  <option value="U">U (Unrestricted)</option>
                  <option value="UA">UA (Parental Guidance)</option>
                  <option value="A">A (Adults Only)</option>
                  <option value="S">S (Special Class)</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-900 bg-slate-950 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">Ready to submit?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Your movie details, visuals, and trailers will stay in sync with the existing admin review flow after submission.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                {isEditMode ? 'Save Movie Changes' : 'Submit to Admin'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

const inputClass = (hasError) =>
  `w-full rounded-2xl border px-4 py-3.5 text-sm text-slate-700 outline-none transition ${
    hasError ? 'border-rose-300 bg-rose-50 focus:border-rose-400' : 'border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white'
  }`;

const TopChip = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const SectionHeader = ({ icon, title, description }) => (
  <div className="mb-6 flex items-start gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">{icon}</div>
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  </div>
);

const Field = ({ label, error, children, className = '' }) => (
  <div className={className}>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    {children}
    {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}
  </div>
);

const MediaField = ({ label, field, mediaState, error, onModeChange, onUrlChange, onFileChange, aspectClass }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        {error ? <p className="mt-1 text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
      <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => onModeChange(field, 'url')}
          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${mediaState.mode === 'url' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
        >
          <LinkIcon className="mr-2 inline h-3.5 w-3.5" />
          URL
        </button>
        <button
          type="button"
          onClick={() => onModeChange(field, 'file')}
          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${mediaState.mode === 'file' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
        >
          <Upload className="mr-2 inline h-3.5 w-3.5" />
          Upload
        </button>
      </div>
    </div>

    {mediaState.mode === 'url' ? (
      <input type="url" value={mediaState.value} onChange={(event) => onUrlChange(field, event.target.value)} className={inputClass(Boolean(error))} placeholder="Paste media URL" />
    ) : (
      <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 transition hover:bg-orange-50">
        <Upload className="mr-2 h-4 w-4 text-orange-500" />
        Upload asset
        <input type="file" accept="image/*" onChange={(event) => onFileChange(field, event)} className="hidden" />
      </label>
    )}

    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 ${aspectClass}`}>
      {mediaState.preview ? (
        <img src={mediaState.preview} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <ImageIcon className="h-7 w-7" />
        </div>
      )}
    </div>
  </div>
);

export default CreateMovie;
