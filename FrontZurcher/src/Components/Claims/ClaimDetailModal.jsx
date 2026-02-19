import React, { useState } from 'react';
import {
  XMarkIcon,
  PencilSquareIcon,
  MapPinIcon,
  UserIcon,
  CalendarDaysIcon,
  PhoneIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
  PhotoIcon,
  DocumentTextIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { FireIcon } from '@heroicons/react/24/solid';

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',   badge: 'bg-slate-100 text-slate-700 ring-slate-300',          icon: ClockIcon },
  scheduled:   { label: 'Agendado',    badge: 'bg-sky-50 text-sky-700 ring-sky-200',                 icon: CalendarDaysIcon },
  in_progress: { label: 'En Progreso', badge: 'bg-violet-50 text-violet-700 ring-violet-200',        icon: WrenchScrewdriverIcon },
  completed:   { label: 'Completado',  badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',     icon: CheckCircleIcon },
  closed:      { label: 'Cerrado',     badge: 'bg-gray-100 text-gray-600 ring-gray-300',             icon: CheckCircleIcon },
  cancelled:   { label: 'Cancelado',   badge: 'bg-red-50 text-red-600 ring-red-200',                 icon: XMarkIcon },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  medium: { label: 'Media',   badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' },
  high:   { label: 'Alta',    badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  urgent: { label: 'Urgente', badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

const TYPE_CONFIG = {
  warranty:  { label: 'Garantía' },
  repair:    { label: 'Reparación' },
  callback:  { label: 'Callback' },
  complaint: { label: 'Queja' },
  other:     { label: 'Otro' },
};

const ClaimDetailModal = ({ isOpen, claim, onClose, onEdit, onStatusChange }) => {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!isOpen || !claim) return null;

  const statusCfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[claim.priority] || PRIORITY_CONFIG.medium;
  const typeCfg = TYPE_CONFIG[claim.claimType] || TYPE_CONFIG.other;
  const StatusIcon = statusCfg.icon;

  const nextStatuses = [];
  if (claim.status === 'pending') nextStatuses.push({ key: 'scheduled', label: 'Agendar', cfg: STATUS_CONFIG.scheduled });
  if (claim.status === 'pending' || claim.status === 'scheduled') nextStatuses.push({ key: 'in_progress', label: 'En Progreso', cfg: STATUS_CONFIG.in_progress });
  if (claim.status === 'in_progress') nextStatuses.push({ key: 'completed', label: 'Completar', cfg: STATUS_CONFIG.completed });

  const openMaps = () => {
    if (claim.propertyAddress) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(claim.propertyAddress)}`, '_blank');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 rounded-t-2xl px-6 py-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{claim.claimNumber}</h2>
                  <p className="text-xs text-gray-500">{typeCfg.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(claim)}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  title="Editar"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">

              {/* Status + Priority row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ring-1 ${statusCfg.badge}`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusCfg.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ring-1 ${priorityCfg.badge}`}>
                  <span className={`h-2 w-2 rounded-full ${priorityCfg.dot}`}></span>
                  {priorityCfg.label}
                  {claim.priority === 'urgent' && <FireIcon className="h-3.5 w-3.5 text-red-500" />}
                </span>
              </div>

              {/* Quick Status Change */}
              {nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map(ns => {
                    const NsIcon = ns.cfg.icon;
                    return (
                      <button
                        key={ns.key}
                        onClick={() => { onStatusChange(claim, ns.key); onClose(); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 transition hover:shadow-sm ${ns.cfg.badge}`}
                      >
                        <NsIcon className="h-3.5 w-3.5" />
                        {ns.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Client & Address */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{claim.clientName}</p>
                    {claim.clientPhone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <PhoneIcon className="h-3 w-3" />
                        <a href={`tel:${claim.clientPhone}`} className="hover:text-blue-600 transition">{claim.clientPhone}</a>
                      </div>
                    )}
                    {claim.clientEmail && (
                      <p className="text-xs text-gray-500">{claim.clientEmail}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={openMaps}
                  className="flex items-start gap-3 w-full text-left group"
                >
                  <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-red-200 transition">
                    <MapPinIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 group-hover:text-blue-600 transition">{claim.propertyAddress}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" /> Abrir en Maps
                    </p>
                  </div>
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.claimDate && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Reclamo</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{new Date(claim.claimDate).toLocaleDateString()}</p>
                  </div>
                )}
                {claim.scheduledDate && (
                  <div className="bg-sky-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-sky-600 uppercase tracking-wider flex items-center gap-1">
                      <CalendarDaysIcon className="h-3 w-3" /> Agendado
                    </p>
                    <p className="text-sm font-semibold text-sky-800 mt-1">{new Date(claim.scheduledDate).toLocaleDateString()}</p>
                  </div>
                )}
                {claim.repairDate && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircleIcon className="h-3 w-3" /> Reparado
                    </p>
                    <p className="text-sm font-semibold text-emerald-800 mt-1">{new Date(claim.repairDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Assigned Staff */}
              {claim.assignedStaff && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                  <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Asignado a</p>
                    <p className="text-sm font-semibold text-blue-900">{claim.assignedStaff.name}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Descripción</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                  {claim.description || 'Sin descripción'}
                </p>
              </div>

              {/* Notes */}
              {claim.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-amber-400" />
                    Notas
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-amber-50 rounded-lg p-4 border border-amber-100">
                    {claim.notes}
                  </p>
                </div>
              )}

              {/* Resolution */}
              {claim.resolution && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    Resolución
                  </h3>
                  <p className="text-sm text-emerald-700 leading-relaxed whitespace-pre-wrap bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    {claim.resolution}
                  </p>
                </div>
              )}

              {/* Claim Images */}
              {claim.claimImages && claim.claimImages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <PhotoIcon className="h-4 w-4 text-blue-500" />
                    Fotos del Reclamo
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">{claim.claimImages.length}</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {claim.claimImages.map((img) => (
                      <button
                        key={img.id || img.url}
                        onClick={() => setLightboxImage(img.url)}
                        className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-400 transition group relative"
                      >
                        <img src={img.url} alt="Reclamo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                          <ArrowTopRightOnSquareIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Repair Images */}
              {claim.repairImages && claim.repairImages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-emerald-500" />
                    Fotos de Reparación
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-normal">{claim.repairImages.length}</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {claim.repairImages.map((img) => (
                      <button
                        key={img.id || img.url}
                        onClick={() => setLightboxImage(img.url)}
                        className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-400 transition group relative"
                      >
                        <img src={img.url} alt="Reparación" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                          <ArrowTopRightOnSquareIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Works */}
              {(claim.linkedWork || claim.linkedSimpleWork) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                    Trabajos Vinculados
                  </h3>
                  <div className="space-y-2">
                    {claim.linkedWork && (
                      <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center">
                          <WrenchScrewdriverIcon className="h-4 w-4 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Work</p>
                          <p className="text-sm text-blue-900 font-medium">{claim.linkedWork.propertyAddress || `#${claim.linkedWork.id}`}</p>
                        </div>
                      </div>
                    )}
                    {claim.linkedSimpleWork && (
                      <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="h-8 w-8 rounded-lg bg-emerald-200 flex items-center justify-center">
                          <WrenchScrewdriverIcon className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-600 font-medium">Simple Work</p>
                          <p className="text-sm text-emerald-900 font-medium">{claim.linkedSimpleWork.propertyAddress || `#${claim.linkedSimpleWork.id}`}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Creator */}
              {claim.claimCreator && (
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>Creado por: {claim.claimCreator.name}</span>
                  {claim.createdAt && <span>{new Date(claim.createdAt).toLocaleString()}</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-2xl px-6 py-3 flex justify-end gap-2">
              <button
                onClick={() => onEdit(claim)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
            onClick={() => setLightboxImage(null)}
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt="Imagen"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ClaimDetailModal;
