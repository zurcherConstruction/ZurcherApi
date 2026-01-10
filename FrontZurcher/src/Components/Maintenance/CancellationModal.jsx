import React, { useState } from 'react';
import Swal from 'sweetalert2';

const CancellationModal = ({ visit, onCancel, onPostpone, onCancelOther }) => {
  const [showModal, setShowModal] = useState(false);
  
  const handleClientCancel = async () => {
    const { value: reason } = await Swal.fire({
      title: '🚫 Cliente no quiere mantenimiento',
      html: `
        <div class="text-left space-y-4">
          <p class="text-sm text-gray-600 mb-4">
            <strong>Visita #${visit.visitNumber}</strong><br>
            El cliente ha decidido no realizar el mantenimiento.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motivo detallado:
            </label>
            <textarea 
              id="reason" 
              rows="4"
              placeholder="Ej: Cliente dice que no necesita mantenimiento este año, sistema funciona bien..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            ></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cancelar Visita',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#ea580c',
      preConfirm: () => {
        const reason = document.getElementById('reason').value;
        if (!reason.trim()) {
          Swal.showValidationMessage('Debe especificar el motivo');
          return false;
        }
        return reason.trim();
      }
    });

    if (reason) {
      try {
        await onCancel(visit.id, reason);
        Swal.fire({
          icon: 'success',
          title: 'Visita Cancelada',
          text: 'La visita ha sido cancelada por solicitud del cliente.',
          timer: 3000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cancelar la visita.'
        });
      }
    }
  };

  const handleNoAccessPostpone = async () => {
    const { value: formData } = await Swal.fire({
      title: '📍 Cliente no está presente',
      html: `
        <div class="text-left space-y-4">
          <p class="text-sm text-gray-600 mb-4">
            <strong>Visita #${visit.visitNumber}</strong><br>
            El cliente no estaba disponible para el mantenimiento.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motivo detallado:
            </label>
            <textarea 
              id="reason" 
              rows="3"
              placeholder="Ej: Nadie en casa, vecino dice que están de viaje..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Reagendar para (opcional):
            </label>
            <input 
              type="date" 
              id="rescheduleDate" 
              min="${new Date().toISOString().split('T')[0]}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              Si se especifica, se creará una nueva visita para esta fecha
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Postergar Visita',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#7c3aed',
      preConfirm: () => {
        const reason = document.getElementById('reason').value;
        const rescheduleDate = document.getElementById('rescheduleDate').value;
        
        if (!reason.trim()) {
          Swal.showValidationMessage('Debe especificar el motivo');
          return false;
        }
        
        return {
          reason: reason.trim(),
          rescheduleDate: rescheduleDate || null
        };
      }
    });

    if (formData) {
      try {
        await onPostpone(visit.id, formData.reason, formData.rescheduleDate);
        Swal.fire({
          icon: 'success',
          title: 'Visita Postergada',
          text: formData.rescheduleDate 
            ? `Visita postergada y reagendada para ${formData.rescheduleDate}`
            : 'Visita postergada por cliente ausente.',
          timer: 3000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al postergar la visita.'
        });
      }
    }
  };

  const handleOtherCancel = async () => {
    const { value: reason } = await Swal.fire({
      title: '❌ Cancelar por otros motivos',
      html: `
        <div class="text-left space-y-4">
          <p class="text-sm text-gray-600 mb-4">
            <strong>Visita #${visit.visitNumber}</strong><br>
            Especifique el motivo de cancelación.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motivo de cancelación:
            </label>
            <textarea 
              id="reason" 
              rows="4"
              placeholder="Ej: Clima adverso, emergencia, problema de acceso..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            ></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cancelar Visita',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626',
      preConfirm: () => {
        const reason = document.getElementById('reason').value;
        if (!reason.trim()) {
          Swal.showValidationMessage('Debe especificar el motivo');
          return false;
        }
        return reason.trim();
      }
    });

    if (reason) {
      try {
        await onCancelOther(visit.id, reason);
        Swal.fire({
          icon: 'success',
          title: 'Visita Cancelada',
          text: 'La visita ha sido cancelada.',
          timer: 3000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cancelar la visita.'
        });
      }
    }
  };

  const showCancellationOptions = async () => {
    const { value: option } = await Swal.fire({
      title: '🎯 Gestionar Visita',
      html: `
        <div class="text-left space-y-4">
          <p class="text-sm text-gray-600 mb-4">
            <strong>Visita #${visit.visitNumber}</strong><br>
            ¿Qué sucedió con esta visita?
          </p>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      showConfirmButton: true,
      confirmButtonText: '🚫 Cliente no quiere',
      denyButtonText: '📍 Cliente ausente',
      cancelButtonText: '❌ Otros motivos',
      confirmButtonColor: '#ea580c',
      denyButtonColor: '#7c3aed',
      cancelButtonColor: '#dc2626',
      focusConfirm: false,
      preConfirm: () => 'client_cancel',
      preDeny: () => 'no_access',
      preCancel: () => 'other'
    });

    if (option === 'client_cancel') {
      await handleClientCancel();
    } else if (option === 'no_access') {
      await handleNoAccessPostpone();
    } else if (option === 'other') {
      await handleOtherCancel();
    }
  };

  return { showCancellationOptions };
};

export default CancellationModal;