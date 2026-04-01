import React from 'react';

const sourceLabel = {
  lead: '📋 Lead',
  budget: '💰 Budget',
  permit: '📄 Permit',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  created: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
};

/**
 * Muestra una advertencia de duplicado para un campo específico.
 * 
 * @param {Object} props
 * @param {'email'|'phone'|'address'} props.field
 * @param {{ found: boolean, matches: Array }} props.data
 * @param {string} props.label  - Nombre legible del campo (ej: "Email", "Teléfono")
 */
const DuplicateWarning = ({ field, data, label }) => {
  if (!data?.found) return null;

  const match = data.matches[0]; // Mostrar el primero, con contador si hay más

  return (
    <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-sm">
      <p className="font-semibold text-amber-800 flex items-center gap-1">
        ⚠️ {label} ya existe en el sistema
        {data.matches.length > 1 && (
          <span className="text-xs font-normal text-amber-600">
            ({data.matches.length} coincidencias)
          </span>
        )}
      </p>
      <div className="mt-1 space-y-0.5">
        {data.matches.slice(0, 3).map((m, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5 text-amber-700 text-xs">
            <span className="font-medium">{sourceLabel[m.source] || m.source}</span>
            <span>·</span>
            <span className="font-semibold">{m.applicantName}</span>
            {m.detail && (
              <>
                <span>·</span>
                <span className="text-amber-600 truncate max-w-[160px]">{m.detail}</span>
              </>
            )}
            {m.status && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusColors[m.status] || 'bg-gray-100 text-gray-600'}`}>
                {m.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicateWarning;
