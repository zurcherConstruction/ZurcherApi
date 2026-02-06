import React, { useState, useEffect } from 'react';
import { FaPlay, FaTimes, FaChevronLeft, FaChevronRight, FaImage, FaVideo, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import img3 from '../../assets/landing/3.jpeg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

const WorkGallery = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'image', 'video'

  useEffect(() => {
    fetchGalleryResources();
  }, []);

  const fetchGalleryResources = async () => {
    try {
      setLoading(true);
      // Obtener todos los recursos (imágenes + videos) de work_gallery
      const response = await axios.get(`${API_URL}/gallery/work_gallery/all?max_results=100`);
      
      if (response.data.success) {
        setResources(response.data.resources);
      } else {
        setError('Error al cargar la galería');
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (media, index) => {
    setSelectedMedia(media);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const nextMedia = () => {
    const filtered = getFilteredResources();
    const nextIndex = (currentIndex + 1) % filtered.length;
    setCurrentIndex(nextIndex);
    setSelectedMedia(filtered[nextIndex]);
  };

  const prevMedia = () => {
    const filtered = getFilteredResources();
    const prevIndex = (currentIndex - 1 + filtered.length) % filtered.length;
    setCurrentIndex(prevIndex);
    setSelectedMedia(filtered[prevIndex]);
  };

  const getFilteredResources = () => {
    if (filter === 'all') return resources;
    return resources.filter(r => r.type === filter);
  };

  const filteredResources = getFilteredResources();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={img3}
          alt="Zurcher Septic Background"
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/85 to-slate-800/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pt-32 pb-20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              Our Work Gallery
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
              Explore our completed septic system installations, repairs, and maintenance projects across Southwest Florida
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <FaSpinner className="animate-spin text-5xl text-blue-400 mb-4" />
              <p className="text-slate-200 text-lg">Loading gallery...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md border border-red-500 rounded-xl p-8 text-center max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <p className="text-red-200 text-lg mb-4">{error}</p>
              <button 
                onClick={fetchGalleryResources}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                Retry
              </button>
            </div>
          )}

          {/* Gallery Content */}
          {!loading && !error && (
            <>
              {/* Filter Buttons */}
              <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/30'
                  }`}
                >
                  All ({resources.length})
                </button>
                <button
                  onClick={() => setFilter('image')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                    filter === 'image'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/30'
                  }`}
                >
                  <FaImage /> Photos ({resources.filter(r => r.type === 'image').length})
                </button>
                <button
                  onClick={() => setFilter('video')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                    filter === 'video'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/30'
                  }`}
                >
                  <FaVideo /> Videos ({resources.filter(r => r.type === 'video').length})
                </button>
              </div>

              {/* Gallery Grid */}
              {filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredResources.map((media, index) => (
                    <div
                      key={media.public_id}
                      onClick={() => openLightbox(media, index)}
                      className="relative group cursor-pointer overflow-hidden rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl hover:shadow-cyan-500/50 transition-all duration-500 animate-fade-in-up hover:scale-105"
                      style={{ animationDelay: `${0.1 * (index % 12)}s` }}
                    >
                      {/* Image/Video Content */}
                      <div className="aspect-w-16 aspect-h-12 bg-slate-800">
                        {media.type === 'video' ? (
                          <video
                            src={media.url}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <img
                            src={media.thumbnail}
                            alt={`Work ${index + 1}`}
                            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        )}
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        {media.type === 'video' ? (
                          <div className="flex flex-col items-center gap-2">
                            <FaPlay className="text-white text-5xl drop-shadow-2xl" />
                            <span className="text-white font-semibold text-sm">View Fullscreen</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <FaImage className="text-white text-5xl drop-shadow-2xl" />
                            <span className="text-white font-semibold text-sm">View Image</span>
                          </div>
                        )}
                      </div>

                      {/* Type Badge */}
                      {/* <div className="absolute top-3 right-3 z-10">
                        {media.type === 'video' ? (
                          <span className="bg-gradient-to-r from-red-600 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                            <FaVideo /> VIDEO
                          </span>
                        ) : (
                          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                            <FaImage /> PHOTO
                          </span>
                        )}
                      </div> */}

                      {/* Bottom Gradient */}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 max-w-md mx-auto">
                    <p className="text-slate-200 text-xl mb-2">No {filter !== 'all' ? filter + 's' : 'media'} found</p>
                    <p className="text-slate-400">Try selecting a different filter</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-10 bg-black/50 rounded-full p-3 hover:bg-red-500/20"
          >
            <FaTimes size={32} />
          </button>

          {/* Previous Button */}
          {filteredResources.length > 1 && (
            <button
              onClick={prevMedia}
              className="absolute left-4 text-white hover:text-blue-400 transition-colors z-10 bg-black/50 rounded-full p-4 hover:bg-blue-500/20"
            >
              <FaChevronLeft size={32} />
            </button>
          )}

          {/* Next Button */}
          {filteredResources.length > 1 && (
            <button
              onClick={nextMedia}
              className="absolute right-4 text-white hover:text-blue-400 transition-colors z-10 bg-black/50 rounded-full p-4 hover:bg-blue-500/20"
            >
              <FaChevronRight size={32} />
            </button>
          )}

          {/* Media Content */}
          <div className="max-w-6xl max-h-full flex items-center justify-center">
            {selectedMedia.type === 'video' ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={selectedMedia.url}
                alt="Full size"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              />
            )}
          </div>

          {/* Counter & Info */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
            <div className="flex items-center gap-4 text-white">
              <span className="font-semibold">{currentIndex + 1} / {filteredResources.length}</span>
              {selectedMedia.type === 'video' ? (
                <span className="flex items-center gap-2 text-sm">
                  <FaVideo className="text-red-400" /> Video
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm">
                  <FaImage className="text-blue-400" /> Photo
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkGallery;
