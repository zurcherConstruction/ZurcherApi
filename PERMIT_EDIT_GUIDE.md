# 📋 Guía: Sistema de Múltiples Emails y Edición de Permits

## 🎯 RESUMEN

Este sistema permite:
1. **Múltiples emails** para notificaciones con un email principal
2. **Editar campos del Permit** después de creado

---

## 📧 PARTE 1: Sistema de Emails

### Estructura:
- **`applicantEmail`** (STRING): Email PRINCIPAL - Recibe invoices y SignNow
- **`notificationEmails`** (ARRAY): Emails adicionales - Solo notificaciones

### Backend - Modelo Permit:
```javascript
applicantEmail: {
  type: DataTypes.STRING,
  allowNull: true,
  validate: { isEmail: true }
},
notificationEmails: {
  type: DataTypes.ARRAY(DataTypes.STRING),
  allowNull: true,
  defaultValue: [],
  validate: {
    isValidEmailArray(value) {
      // Valida que todos sean emails válidos
    }
  }
}
```

### Backend - Controller:
```javascript
// Procesa notificationEmails (string, JSON o array)
let processedNotificationEmails = [];
if (typeof notificationEmails === 'string') {
  processedNotificationEmails = notificationEmails.split(',').map(e => e.trim());
} else if (Array.isArray(notificationEmails)) {
  processedNotificationEmails = notificationEmails.filter(e => e.trim());
}
```

### API Endpoint:
```
PATCH /api/permits/:idPermit/fields

Body:
{
  "applicantEmail": "cliente@example.com",  // Email principal
  "notificationEmails": ["vendedor@company.com", "manager@company.com"]
}
```

### Frontend - Ejemplo de Uso:
```jsx
const [emailData, setEmailData] = useState({
  primaryEmail: '', // applicantEmail
  additionalEmails: [] // notificationEmails
});

const handleSaveEmails = async () => {
  const response = await axios.patch(
    `${API_URL}/api/permits/${permitId}/fields`,
    {
      applicantEmail: emailData.primaryEmail,
      notificationEmails: emailData.additionalEmails
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
```

---

## 🔧 PARTE 2: Editar Campos del Permit

### Campos Editables:

#### Identificación:
- `permitNumber` (TEXT, UNIQUE) - Número de permiso
- `lot` (TEXT) - Lote
- `block` (TEXT) - Bloque

#### Técnicos:
- `systemType` (TEXT) - Tipo de sistema (ATU, GRVT, etc)
- `isPBTS` (BOOLEAN) - ¿Es PBTS?
- `drainfieldDepth` (TEXT) - Profundidad del campo de drenaje
- `gpdCapacity` (TEXT) - Capacidad GPD
- `excavationRequired` (STRING) - Excavación requerida
- `squareFeetSystem` (TEXT) - Pies cuadrados del sistema
- `pump` (TEXT) - Bomba

#### Fechas:
- `expirationDate` (DATEONLY) - Fecha de expiración

#### Contacto:
- `applicantName` (TEXT) - Nombre del solicitante
- `applicantPhone` (STRING) - Teléfono
- `applicantEmail` (STRING) - Email principal
- `propertyAddress` (TEXT) - Dirección
- `notificationEmails` (ARRAY) - Emails adicionales

### API Endpoint:
```
PATCH /api/permits/:idPermit/fields
Authorization: Bearer <token>
Roles: admin, recept, owner

Body:
{
  "permitNumber": "2024-1234",
  "lot": "15",
  "block": "B",
  "systemType": "ATU",
  "isPBTS": true,
  "drainfieldDepth": "36 inches",
  "gpdCapacity": "500",
  "expirationDate": "2025-12-31",
  "excavationRequired": "24 inches",
  "squareFeetSystem": "450",
  "pump": "Effluent pump required",
  "applicantName": "John Doe",
  "applicantPhone": "(555) 123-4567",
  "applicantEmail": "john@example.com",
  "propertyAddress": "123 Main St",
  "notificationEmails": ["agent@company.com", "manager@company.com"]
}
```

### Validaciones Backend:
1. **`permitNumber`**: Debe ser único (verifica que no exista en otro permit)
2. **`notificationEmails`**: Valida formato de email para cada elemento
3. **`applicantEmail`**: Valida formato de email

### Response Exitoso:
```json
{
  "success": true,
  "message": "Permit actualizado correctamente",
  "permit": {
    "idPermit": "uuid-here",
    "permitNumber": "2024-1234",
    "lot": "15",
    "block": "B",
    "systemType": "ATU",
    "isPBTS": true,
    "applicantEmail": "john@example.com",
    "notificationEmails": ["agent@company.com", "manager@company.com"],
    ...
  }
}
```

### Response con Error:
```json
{
  "error": true,
  "message": "El número de permit '2024-1234' ya está en uso",
  "field": "permitNumber"
}
```

---

## 🖥️ FRONTEND: Componente de Edición

### Ejemplo de Componente React:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EditPermitModal = ({ permitId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    permitNumber: '',
    lot: '',
    block: '',
    systemType: '',
    isPBTS: false,
    drainfieldDepth: '',
    gpdCapacity: '',
    excavationRequired: '',
    squareFeetSystem: '',
    pump: '',
    expirationDate: '',
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    propertyAddress: '',
    notificationEmails: []
  });

  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPermitData();
  }, [permitId]);

  const loadPermitData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/permits/${permitId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData(response.data);
    } catch (err) {
      setError('Error al cargar permit');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddEmail = () => {
    if (newEmail && !formData.notificationEmails.includes(newEmail)) {
      setFormData(prev => ({
        ...prev,
        notificationEmails: [...prev.notificationEmails, newEmail]
      }));
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setFormData(prev => ({
      ...prev,
      notificationEmails: prev.notificationEmails.filter(e => e !== emailToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/permits/${permitId}/fields`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSuccess(response.data.permit);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Editar Permit</h2>
        
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Identificación */}
          <section>
            <h3>Identificación</h3>
            
            <div>
              <label>Permit Number *</label>
              <input
                type="text"
                name="permitNumber"
                value={formData.permitNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label>Lot</label>
              <input
                type="text"
                name="lot"
                value={formData.lot}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>Block</label>
              <input
                type="text"
                name="block"
                value={formData.block}
                onChange={handleInputChange}
              />
            </div>
          </section>

          {/* Datos Técnicos */}
          <section>
            <h3>Datos Técnicos</h3>
            
            <div>
              <label>System Type</label>
              <select
                name="systemType"
                value={formData.systemType}
                onChange={handleInputChange}
              >
                <option value="">Select...</option>
                <option value="ATU">ATU</option>
                <option value="GRVT">GRVT</option>
                <option value="PBTS">PBTS</option>
              </select>
            </div>

            {formData.systemType === 'ATU' && (
              <div>
                <label>
                  <input
                    type="checkbox"
                    name="isPBTS"
                    checked={formData.isPBTS}
                    onChange={handleInputChange}
                  />
                  Is PBTS?
                </label>
              </div>
            )}

            <div>
              <label>Drainfield Depth</label>
              <input
                type="text"
                name="drainfieldDepth"
                value={formData.drainfieldDepth}
                onChange={handleInputChange}
                placeholder="e.g., 36 inches"
              />
            </div>

            <div>
              <label>GPD Capacity</label>
              <input
                type="text"
                name="gpdCapacity"
                value={formData.gpdCapacity}
                onChange={handleInputChange}
                placeholder="e.g., 500"
              />
            </div>

            <div>
              <label>Excavation Required</label>
              <input
                type="text"
                name="excavationRequired"
                value={formData.excavationRequired}
                onChange={handleInputChange}
                placeholder="e.g., 24 inches"
              />
            </div>

            <div>
              <label>Square Feet System</label>
              <input
                type="text"
                name="squareFeetSystem"
                value={formData.squareFeetSystem}
                onChange={handleInputChange}
                placeholder="e.g., 450"
              />
            </div>

            <div>
              <label>Pump</label>
              <input
                type="text"
                name="pump"
                value={formData.pump}
                onChange={handleInputChange}
                placeholder="e.g., Effluent pump required"
              />
            </div>
          </section>

          {/* Fechas */}
          <section>
            <h3>Fechas</h3>
            
            <div>
              <label>Expiration Date</label>
              <input
                type="date"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleInputChange}
              />
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h3>Información de Contacto</h3>
            
            <div>
              <label>Applicant Name</label>
              <input
                type="text"
                name="applicantName"
                value={formData.applicantName}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>Phone</label>
              <input
                type="tel"
                name="applicantPhone"
                value={formData.applicantPhone}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>Property Address</label>
              <input
                type="text"
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label>Email Principal *</label>
              <input
                type="email"
                name="applicantEmail"
                value={formData.applicantEmail}
                onChange={handleInputChange}
                required
              />
              <small>Este email recibirá invoices y SignNow</small>
            </div>

            <div>
              <label>Emails Adicionales (Notificaciones)</label>
              <div className="email-list">
                {formData.notificationEmails.map((email, index) => (
                  <div key={index} className="email-tag">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="email-input">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                />
                <button type="button" onClick={handleAddEmail}>
                  Agregar
                </button>
              </div>
            </div>
          </section>

          {/* Botones */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPermitModal;
```

---

## 🔄 FLUJO DE USO

### 1. Enviar Budget/Invoice con Múltiples Emails:

El `sendBudgetToSignNow` en `BudgetController.js` ya debería enviar a:
- **Email principal**: `permit.applicantEmail` → Recibe link de SignNow
- **Emails adicionales**: `permit.notificationEmails` → Reciben notificación

### 2. Editar Permit desde EditBudget:

```jsx
// En EditBudget.jsx
const [showEditPermitModal, setShowEditPermitModal] = useState(false);

// Botón para abrir modal
<button onClick={() => setShowEditPermitModal(true)}>
  Editar Permit
</button>

// Modal
{showEditPermitModal && (
  <EditPermitModal
    permitId={currentBudget.PermitIdPermit}
    onClose={() => setShowEditPermitModal(false)}
    onSuccess={(updatedPermit) => {
      // Recargar budget para ver cambios
      dispatch(getBudgetById(selectedBudgetId));
    }}
  />
)}
```

---

## 📊 TESTING

### Test 1: Actualizar Emails
```bash
curl -X PATCH http://localhost:3001/api/permits/:idPermit/fields \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantEmail": "cliente@example.com",
    "notificationEmails": ["vendedor@company.com", "manager@company.com"]
  }'
```

### Test 2: Actualizar Campos Técnicos
```bash
curl -X PATCH http://localhost:3001/api/permits/:idPermit/fields \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permitNumber": "2024-1234",
    "systemType": "ATU",
    "isPBTS": true,
    "drainfieldDepth": "36 inches",
    "gpdCapacity": "500"
  }'
```

### Test 3: Actualizar Todo Junto
```bash
curl -X PATCH http://localhost:3001/api/permits/:idPermit/fields \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permitNumber": "2024-5678",
    "lot": "15",
    "block": "B",
    "systemType": "ATU",
    "isPBTS": false,
    "drainfieldDepth": "36 inches",
    "gpdCapacity": "500",
    "excavationRequired": "24 inches",
    "squareFeetSystem": "450",
    "pump": "Effluent pump",
    "expirationDate": "2025-12-31",
    "applicantName": "John Doe",
    "applicantPhone": "(555) 123-4567",
    "applicantEmail": "john@example.com",
    "propertyAddress": "123 Main St",
    "notificationEmails": ["agent@company.com"]
  }'
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend:
- [x] Modelo Permit con `notificationEmails` y `applicantEmail`
- [x] Controller `updatePermitFields` creado
- [x] Validación de `permitNumber` único
- [x] Procesamiento de arrays de emails
- [x] Ruta `PATCH /api/permits/:idPermit/fields`

### Frontend:
- [ ] Crear componente `EditPermitModal.jsx`
- [ ] Integrar en `EditBudget.jsx`
- [ ] Agregar UI para múltiples emails
- [ ] Validación de formulario
- [ ] Manejo de errores

### Testing:
- [ ] Probar actualización de emails
- [ ] Probar actualización de campos técnicos
- [ ] Verificar validación de `permitNumber` único
- [ ] Verificar formato de emails en array

---

## 🚨 CONSIDERACIONES IMPORTANTES

1. **Email Principal**: `applicantEmail` es el que recibe invoices y SignNow
2. **Emails Adicionales**: `notificationEmails` solo reciben copias de notificaciones
3. **Permit Number**: Debe ser único en toda la base de datos
4. **Validaciones**: Backend valida formato de emails automáticamente
5. **Permisos**: Solo admin, recept, owner pueden editar permits

---

¿Quieres que genere el componente React completo o prefieres enfocarnos primero en probar el backend?
