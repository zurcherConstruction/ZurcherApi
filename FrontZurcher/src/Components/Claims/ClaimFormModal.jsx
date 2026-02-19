import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createClaim, updateClaim, uploadClaimImage, deleteClaimImage, fetchClaimAddresses } from '../../Redux/Actions/claimActions';
import { fetchStaff } from '../../Redux/Actions/adminActions';
import { toast } from 'react-toastify';
import { FaTimes, FaCamera, FaTrash, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const CLAIM_TYPES = [
  { value: 'warranty', label: 'Garantía' },
  { value: 'repair', label: 'Reparación' },
  { value: 'callback', label: 'Callback' },
  { value: 'complaint', label: 'Queja' },
  { value: 'other', label: 'Otro' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' },
];

const STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const initialFormState = {
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  propertyAddress: '',
  linkedWorkId: null,
  linkedSimpleWorkId: null,
  description: '',
  claimType: 'repair',
  priority: 'medium',
  status: 'pending',
  claimDate: new Date().toISOString().split('T')[0],
  scheduledDate: '',
  repairDate: '',
  assignedStaffId: '',
  notes: '',
  resolution: '',
};

const ClaimFormModal = ({ isOpen, onClose, editingClaim = null, onSaved }) => {
  const dispatch = useDispatch();
  const { staffList } = useSelector((state) => state.admin);
  const { addresses } = useSelector((state) => state.claim);

  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isEditing = !!editingClaim;

  // Load staff list
  useEffect(() => {
    if (isOpen && (!staffList || staffList.length === 0)) {
      dispatch(fetchStaff());
    }
  }, [isOpen, dispatch, staffList]);

  // Populate form when editing
  useEffect(() => {
    if (editingClaim) {
      setFormData({
        clientName: editingClaim.clientName || '',
        clientPhone: editingClaim.clientPhone || '',
        clientEmail: editingClaim.clientEmail || '',
        propertyAddress: editingClaim.propertyAddress || '',
        linkedWorkId: editingClaim.linkedWorkId || null,
        linkedSimpleWorkId: editingClaim.linkedSimpleWorkId || null,
        description: editingClaim.description || '',
        claimType: editingClaim.claimType || 'repair',
        priority: editingClaim.priority || 'medium',
        status: editingClaim.status || 'pending',
        claimDate: editingClaim.claimDate || new Date().toISOString().split('T')[0],
        scheduledDate: editingClaim.scheduledDate || '',
        repairDate: editingClaim.repairDate || '',
        assignedStaffId: editingClaim.assignedStaffId || '',
        notes: editingClaim.notes || '',
        resolution: editingClaim.resolution || '',
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingClaim]);

  // Search addresses
  const handleAddressSearch = useCallback(async (search) => {
    setAddressSearch(search);
    if (search.length >= 2) {
      await dispatch(fetchClaimAddresses(search));
      setShowAddressSuggestions(true);
    } else {
      setShowAddressSuggestions(false);
    }
  }, [dispatch]);

  const selectAddress = (addr) => {
    setFormData(prev => ({
      ...prev,
      propertyAddress: addr.address,
      linkedWorkId: addr.type === 'work' ? addr.id : null,
      linkedSimpleWorkId: addr.type === 'simpleWork' ? addr.id : null,
      // Auto-fill client name if available
      clientName: prev.clientName || addr.clientName || '',
    }));
    setAddressSearch(addr.address);
    setShowAddressSuggestions(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }
    if (!formData.propertyAddress.trim()) {
      toast.error('La dirección es requerida');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('La descripción del reclamo es requerida');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        assignedStaffId: formData.assignedStaffId || null,
      };

      if (isEditing) {
        await dispatch(updateClaim(editingClaim.id, payload));
        toast.success('Reclamo actualizado exitosamente');
      } else {
        await dispatch(createClaim(payload));
        toast.success('Reclamo creado exitosamente');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error guardando reclamo');
    } finally {
      setSaving(false);
    }
  };

  // Image upload (only in edit mode)
  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !editingClaim) return;

    setUploadingImage(true);
    try {
      await dispatch(uploadClaimImage(editingClaim.id, file, type));
      toast.success('Imagen subida exitosamente');
    } catch (error) {
      toast.error(error.message || 'Error subiendo imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId, type) => {
    if (!editingClaim || !window.confirm('¿Eliminar esta imagen?')) return;
    try {
      await dispatch(deleteClaimImage(editingClaim.id, imageId, type));
      toast.success('Imagen eliminada');
    } catch (error) {
      toast.error(error.message || 'Error eliminando imagen');
    }
  };

  // Leer datos actualizados desde Redux para que las imágenes se refresquen al subir/eliminar
  const claimsFromState = useSelector((state) => state.claim.claims);
  const liveClaimData = editingClaim
    ? claimsFromState.find((c) => c.id === editingClaim.id) || editingClaim
    : null;

  if (!isOpen) return null;

  const claimImages = liveClaimData?.claimImages || [];
  const repairImages = liveClaimData?.repairImages || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-red-50">
          <h2 className="text-xl font-bold text-red-800">
            {isEditing ? `Editar Reclamo #${editingClaim.claimNumber}` : 'Nuevo Reclamo'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => handleChange('clientPhone', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleChange('clientEmail', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Address linking */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-3">
              <FaMapMarkerAlt className="inline mr-1" /> Dirección
            </h3>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Propiedad *</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={formData.propertyAddress}
                  onChange={(e) => {
                    handleChange('propertyAddress', e.target.value);
                    handleAddressSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (formData.propertyAddress.length >= 2) {
                      handleAddressSearch(formData.propertyAddress);
                    }
                  }}
                  placeholder="Escriba para buscar direcciones existentes o ingrese nueva..."
                  className="w-full pl-10 border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              {showAddressSuggestions && addresses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addresses.map((addr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectAddress(addr)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          addr.type === 'work' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {addr.type === 'work' ? '📋 Work' : '🔧 Simple Work'}
                        </span>
                        {addr.workNumber && (
                          <span className="text-xs text-gray-500">#{addr.workNumber}</span>
                        )}
                        <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                          addr.status === 'completed' || addr.status === 'finalApproved' ? 'bg-green-100 text-green-700' :
                          addr.status === 'inProgress' || addr.status === 'installed' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {addr.status}
                        </span>
                      </div>
                      <div className="font-medium text-sm mt-1">{addr.address}</div>
                      {addr.clientName && (
                        <div className="text-xs text-gray-500 mt-0.5">👤 {addr.clientName}</div>
                      )}
                      {addr.description && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{addr.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {formData.linkedWorkId && (
                <p className="text-xs text-green-600 mt-1">✅ Vinculado a Work existente</p>
              )}
              {formData.linkedSimpleWorkId && (
                <p className="text-xs text-green-600 mt-1">✅ Vinculado a Simple Work existente</p>
              )}
            </div>
          </div>

          {/* Claim Details */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-3">Detalle del Reclamo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reclamo</label>
                <select
                  value={formData.claimType}
                  onChange={(e) => handleChange('claimType', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  {CLAIM_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-3">Programación & Asignación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Reclamo</label>
                <input
                  type="date"
                  value={formData.claimDate}
                  onChange={(e) => handleChange('claimDate', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Agendada</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Reparación</label>
                <input
                  type="date"
                  value={formData.repairDate}
                  onChange={(e) => handleChange('repairDate', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Staff</label>
                <select
                  value={formData.assignedStaffId}
                  onChange={(e) => handleChange('assignedStaffId', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Sin asignar</option>
                  {(staffList || []).map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.firstName} {staff.lastName} — {staff.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes & Resolution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notas internas del equipo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolución</label>
              <textarea
                value={formData.resolution}
                onChange={(e) => handleChange('resolution', e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción de la resolución..."
              />
            </div>
          </div>

          {/* Images (only in edit mode) */}
          {isEditing && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Imágenes</h3>

              {/* Claim Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📸 Fotos del Reclamo</label>
                <div className="flex flex-wrap gap-3">
                  {claimImages.map((img) => (
                    <div key={img.id} className="relative group w-24 h-24">
                      <img src={img.url} alt="Reclamo" className="w-24 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id, 'claim')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <FaTrash size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
                    <FaCamera className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Agregar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'claim')} />
                  </label>
                </div>
              </div>

              {/* Repair Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🔧 Fotos de Reparación</label>
                <div className="flex flex-wrap gap-3">
                  {repairImages.map((img) => (
                    <div key={img.id} className="relative group w-24 h-24">
                      <img src={img.url} alt="Reparación" className="w-24 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id, 'repair')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <FaTrash size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition">
                    <FaCamera className="text-green-400 mb-1" />
                    <span className="text-xs text-green-400">Agregar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'repair')} />
                  </label>
                </div>
              </div>

              {uploadingImage && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Subiendo imagen...
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              {isEditing ? 'Guardar Cambios' : 'Crear Reclamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimFormModal;
