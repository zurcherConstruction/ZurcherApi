import React, { useState, useEffect, useCallback, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  FaClock, FaStar, FaRegStar, FaPlus, FaEdit, FaTrash, 
  FaListOl, FaDollarSign, FaExclamationTriangle 
} from 'react-icons/fa';
import { fetchProcedures, deleteProcedure, toggleProcedureFavorite } from '../../Redux/Actions/knowledgeBaseActions';
import ProcedureModal from './ProcedureModal';

const ProcedureList = memo(({ categoryId, searchQuery, showFavoritesOnly }) => {
  const dispatch = useDispatch();
  const procedures = useSelector((state) => state.knowledgeBase.procedures);
  const loading = useSelector((state) => state.knowledgeBase.loading);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadProceduresData = useCallback(() => {
    const params = {};
    if (categoryId) params.categoryId = categoryId;
    if (searchQuery) params.search = searchQuery;
    if (showFavoritesOnly) params.favorite = 'true';
    
    dispatch(fetchProcedures(params));
  }, [categoryId, searchQuery, showFavoritesOnly]);

  useEffect(() => {
    loadProceduresData();
  }, [loadProceduresData]);

  const handleToggleFavorite = (procedureId) => {
    dispatch(toggleProcedureFavorite(procedureId));
  };

  const handleDelete = async (procedureId) => {
    if (!confirm('¿Estás seguro de eliminar este procedimiento?')) return;
    await dispatch(deleteProcedure(procedureId));
    loadProceduresData();
  };

  const handleOpenModal = (procedure = null) => {
    setSelectedProcedure(procedure);
    setIsEditing(!!procedure);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProcedure(null);
    setIsEditing(false);
    loadProceduresData();
  };

  const toggleExpand = (procedureId) => {
    setExpandedId(expandedId === procedureId ? null : procedureId);
  };

  const getDifficultyBadge = (difficulty) => {
    const badges = {
      easy: { color: 'bg-green-100 text-green-600', text: 'Fácil' },
      medium: { color: 'bg-yellow-100 text-yellow-600', text: 'Media' },
      hard: { color: 'bg-red-100 text-red-600', text: 'Difícil' }
    };
    return badges[difficulty] || badges.medium;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          Procedimientos {procedures.length > 0 && `(${procedures.length})`}
        </h3>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm sm:text-base"
        >
          <FaPlus />
          <span>Nuevo Procedimiento</span>
        </button>
      </div>

      {/* Loading */}
      {loading && procedures.length === 0 && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && procedures.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-gray-500">
          <FaListOl className="mx-auto text-3xl sm:text-4xl mb-2 opacity-50" />
          <p className="text-sm sm:text-base">No hay procedimientos disponibles</p>
        </div>
      ) : procedures.length > 0 ? (
        <div className="space-y-3">
          {procedures.map((procedure) => {
            const difficultyBadge = getDifficultyBadge(procedure.difficulty);
            const isExpanded = expandedId === procedure.id;

            return (
              <div
                key={procedure.id}
                className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {procedure.category?.icon && (
                          <span className="text-lg sm:text-xl flex-shrink-0">{procedure.category.icon}</span>
                        )}
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base md:text-lg">
                          {procedure.title}
                        </h4>
                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded ${difficultyBadge.color}`}>
                          {difficultyBadge.text}
                        </span>
                      </div>
                      {procedure.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{procedure.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
                      <button
                        onClick={() => handleToggleFavorite(procedure.id)}
                        className="text-yellow-500 hover:text-yellow-600 transition-colors p-1"
                        title={procedure.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      >
                        {procedure.isFavorite ? <FaStar className="text-sm sm:text-base" /> : <FaRegStar className="text-sm sm:text-base" />}
                      </button>
                      <button
                        onClick={() => handleOpenModal(procedure)}
                        className="text-blue-600 hover:text-blue-700 transition-colors p-1"
                        title="Editar"
                      >
                        <FaEdit className="text-sm sm:text-base" />
                      </button>
                      <button
                        onClick={() => handleDelete(procedure.id)}
                        className="text-red-600 hover:text-red-700 transition-colors p-1"
                        title="Eliminar"
                      >
                        <FaTrash className="text-sm sm:text-base" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 text-xs sm:text-sm text-gray-600">
                    {procedure.estimatedTime && (
                      <div className="flex items-center space-x-1">
                        <FaClock className="text-gray-400" />
                        <span>{procedure.estimatedTime}</span>
                      </div>
                    )}
                    {procedure.cost && (
                      <div className="flex items-center space-x-1">
                        <FaDollarSign className="text-gray-400" />
                        <span>{procedure.cost}</span>
                      </div>
                    )}
                    {procedure.steps && (
                      <div className="flex items-center space-x-1">
                        <FaListOl className="text-gray-400" />
                        <span>{procedure.steps.length} pasos</span>
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  {procedure.requirements && (
                    <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <div className="flex items-start space-x-2">
                        <FaExclamationTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-semibold text-yellow-800">Requisitos: </span>
                          <span className="text-yellow-700">{procedure.requirements}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {procedure.tags && procedure.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {procedure.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Toggle Steps Button */}
                  <button
                    onClick={() => toggleExpand(procedure.id)}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border-t border-gray-200 mt-2"
                  >
                    {isExpanded ? '▲ Ocultar pasos' : '▼ Ver pasos detallados'}
                  </button>
                </div>

                {/* Steps (Expandable) */}
                {isExpanded && procedure.steps && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h5 className="font-semibold text-gray-700 mb-3">Pasos del Procedimiento:</h5>
                    <div className="space-y-3">
                      {procedure.steps.map((step, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {step.order}
                            </div>
                            <div className="flex-1">
                              <h6 className="font-semibold text-gray-800 mb-1">{step.title}</h6>
                              {step.description && (
                                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                              )}
                              {step.tips && (
                                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                  💡 <span className="font-medium">Tip:</span> {step.tips}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {procedure.notes && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <span className="font-semibold text-gray-700">Notas adicionales: </span>
                        <span className="text-gray-600">{procedure.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Modal */}
      {showModal && (
        <ProcedureModal
          procedure={selectedProcedure}
          isEditing={isEditing}
          onClose={handleCloseModal}
          defaultCategoryId={categoryId}
        />
      )}
    </div>
  );
});

ProcedureList.displayName = 'ProcedureList';

export default ProcedureList;
