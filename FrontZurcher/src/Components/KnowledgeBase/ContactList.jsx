import React, { useState, useEffect, useCallback, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaStar, FaRegStar, 
  FaPlus, FaEdit, FaTrash, FaGlobe, FaBuilding, FaUser 
} from 'react-icons/fa';
import { fetchContacts, deleteContact, toggleContactFavorite } from '../../Redux/Actions/knowledgeBaseActions';
import ContactModal from './ContactModal';

const ContactList = memo(({ categoryId, searchQuery, showFavoritesOnly }) => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.knowledgeBase.contacts);
  const loading = useSelector((state) => state.knowledgeBase.loading);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Función estable para cargar contactos (memorizada)
  const loadContactsData = useCallback(() => {
    const params = {};
    if (categoryId) params.categoryId = categoryId;
    if (searchQuery) params.search = searchQuery;
    if (showFavoritesOnly) params.favorite = 'true';
    
    dispatch(fetchContacts(params));
  }, [categoryId, searchQuery, showFavoritesOnly]); // Sin dispatch

  // Cargar cuando cambian los filtros
  useEffect(() => {
    loadContactsData();
  }, [loadContactsData]); // Dependencia estable

  const handleToggleFavorite = (contactId) => {
    dispatch(toggleContactFavorite(contactId));
  };

  const handleDelete = async (contactId) => {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
    await dispatch(deleteContact(contactId));
    // Recargar después de eliminar
    loadContactsData();
  };

  const handleOpenModal = (contact = null) => {
    setSelectedContact(contact);
    setIsEditing(!!contact);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContact(null);
    setIsEditing(false);
    // Recargar después de crear/editar
    loadContactsData();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          Contactos {contacts.length > 0 && `(${contacts.length})`}
        </h3>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm sm:text-base"
        >
          <FaPlus />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && contacts.length === 0 && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Contact Cards */}
      {!loading && contacts.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-gray-500">
          <FaUser className="mx-auto text-3xl sm:text-4xl mb-2 opacity-50" />
          <p className="text-sm sm:text-base">No hay contactos disponibles</p>
        </div>
      ) : contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {contact.category?.icon && (
                      <span className="text-lg sm:text-xl flex-shrink-0">{contact.category.icon}</span>
                    )}
                    <h4 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                      {contact.companyName || 'Sin nombre'}
                    </h4>
                  </div>
                  {contact.contactType && (
                    <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {contact.contactType}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
                  <button
                    onClick={() => handleToggleFavorite(contact.id)}
                    className="text-yellow-500 hover:text-yellow-600 transition-colors p-1"
                    title={contact.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    {contact.isFavorite ? <FaStar className="text-sm sm:text-base" /> : <FaRegStar className="text-sm sm:text-base" />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(contact)}
                    className="text-blue-600 hover:text-blue-700 transition-colors p-1"
                    title="Editar"
                  >
                    <FaEdit className="text-sm sm:text-base" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="text-red-600 hover:text-red-700 transition-colors p-1"
                    title="Eliminar"
                  >
                    <FaTrash className="text-sm sm:text-base" />
                  </button>
                </div>
              </div>

              {/* Contact Person */}
              {contact.contactPerson && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <FaUser className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{contact.contactPerson}</span>
                </div>
              )}

              {/* Phone */}
              {contact.phone && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <FaPhone className="text-gray-400 flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-blue-600 truncate">
                    {contact.phone}
                  </a>
                  {contact.secondaryPhone && (
                    <span className="text-gray-400 hidden sm:inline">
                      | <a href={`tel:${contact.secondaryPhone}`} className="hover:text-blue-600">{contact.secondaryPhone}</a>
                    </span>
                  )}
                </div>
              )}

              {/* Email */}
              {contact.email && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <FaEnvelope className="text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">
                    {contact.email}
                  </a>
                </div>
              )}

              {/* Address */}
              {contact.address && (
                <div className="flex items-start space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {contact.address}
                    {contact.city && `, ${contact.city}`}
                    {contact.state && `, ${contact.state}`}
                    {contact.zipCode && ` ${contact.zipCode}`}
                  </span>
                </div>
              )}

              {/* Website */}
              {contact.website && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <FaGlobe className="text-gray-400 flex-shrink-0" />
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 truncate"
                  >
                    {contact.website}
                  </a>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                  <p className="text-xs sm:text-sm text-gray-600 italic line-clamp-2">"{contact.notes}"</p>
                </div>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-[10px] sm:text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Modal */}
      {showModal && (
        <ContactModal
          contact={selectedContact}
          isEditing={isEditing}
          onClose={handleCloseModal}
          defaultCategoryId={categoryId}
        />
      )}
    </div>
  );
});

ContactList.displayName = 'ContactList';

export default ContactList;
