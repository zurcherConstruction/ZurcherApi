import React, { useState, useEffect } from 'react';
import { FaPlay, FaTimes, FaChevronLeft, FaChevronRight, FaImage, FaVideo } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      // Cambiar 'work_gallery' por el nombre de tu carpeta en Cloudinary
      const response = await axios.get(`${API_URL}/gallery/works/all?max_results=100`);
      
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 text-lg">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-red-600">
          <p className="text-xl">{error}</p>
          <button 
            onClick={fetchGalleryResources}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-blue-600 mb-4">
            Our Work Gallery
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Explore our completed septic system installations, repairs, and maintenance projects across Southwest Florida
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            All ({resources.length})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              filter === 'image'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <FaImage /> Photos ({resources.filter(r => r.type === 'image').length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              filter === 'video'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <FaVideo /> Videos ({resources.filter(r => r.type === 'video').length})
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.map((media, index) => (
            <div
              key={media.public_id}
              onClick={() => openLightbox(media, index)}
              className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-w-16 aspect-h-12 bg-slate-200">
                <img
                  src={media.thumbnail}
                  alt={`Work ${index + 1}`}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                {media.type === 'video' ? (
                  <FaPlay className="text-white text-5xl" />
                ) : (
                  <FaImage className="text-white text-5xl" />
                )}
              </div>

              {/* Type Badge */}
              <div className="absolute top-3 right-3">
                {media.type === 'video' && (
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <FaVideo /> Video
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-xl">No {filter !== 'all' ? filter + 's' : 'media'} found</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-10"
          >
            <FaTimes size={32} />
          </button>

          {/* Previous Button */}
          <button
            onClick={prevMedia}
            className="absolute left-4 text-white hover:text-blue-400 transition-colors z-10"
          >
            <FaChevronLeft size={48} />
          </button>

          {/* Next Button */}
          <button
            onClick={nextMedia}
            className="absolute right-4 text-white hover:text-blue-400 transition-colors z-10"
          >
            <FaChevronRight size={48} />
          </button>

          {/* Media Content */}
          <div className="max-w-6xl max-h-full flex items-center justify-center">
            {selectedMedia.type === 'video' ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
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

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
            {currentIndex + 1} / {filteredResources.length}
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkGallery;
