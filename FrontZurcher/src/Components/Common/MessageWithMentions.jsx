import React from 'react';

const MessageWithMentions = ({ message, className = '' }) => {
  if (!message) return null;

  // Parsear mensaje y resaltar menciones @usuario
  const parts = message.split(/(@\w+)/g);

  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          // Es una mención - resaltar en azul
          return (
            <span
              key={index}
              className="text-blue-600 font-semibold hover:text-blue-800 cursor-pointer"
              title="Usuario mencionado"
            >
              {part}
            </span>
          );
        }
        // Texto normal
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

export default MessageWithMentions;
