import React, { useState } from 'react';
import './ExpandableCard.css';

const ExpandableCard = ({ title, totalAmount, paidAmount, unpaidAmount, totalCount, paidCount, unpaidCount, items, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount) || 0);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status) => {
    return status === 'paid' ? '✅' : '⏳';
  };

  const paidPercentage = totalAmount > 0 ? (parseFloat(paidAmount) / parseFloat(totalAmount)) * 100 : 0;

  return (
    <div className={`expandable-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Header de la tarjeta */}
      <div className="card-header" onClick={toggleExpand}>
        <div className="card-title">
          <h3>{title}</h3>
          <span className="item-count">{totalCount} gastos</span>
        </div>
        
        <div className="card-summary">
          <div className="amount-info">
            <div className="total-amount">{formatCurrency(totalAmount)}</div>
            <div className="status-breakdown">
              <span className="paid">✅ {formatCurrency(paidAmount)} ({paidCount})</span>
              <span className="unpaid">⏳ {formatCurrency(unpaidAmount)} ({unpaidCount})</span>
            </div>
          </div>
          
          <div className="progress-info">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${paidPercentage}%` }}
              ></div>
            </div>
            <span className="percentage">{paidPercentage.toFixed(1)}% pagado</span>
          </div>
        </div>
        
        <div className="expand-icon">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="card-content">
          <div className="content-header">
            <h4>Detalles de Gastos</h4>
            <div className="sort-info">
              Ordenado por fecha (más reciente primero)
            </div>
          </div>
          
          <div className="expenses-list">
            {items && items.length > 0 ? (
              items.map((expense, index) => (
                <div key={expense.idExpense || index} className={`expense-item ${expense.paymentStatus}`}>
                  <div className="expense-main">
                    <div className="expense-header">
                      <span className="expense-status">
                        {getStatusIcon(expense.paymentStatus)}
                      </span>
                      <span className="expense-amount">
                        {formatCurrency(expense.amount)}
                      </span>
                      <span className="expense-date">
                        {formatDate(expense.date)}
                      </span>
                      {type === 'paymentMethod' && (
                        <span className="expense-client">
                          🏢 {expense.clientName}
                        </span>
                      )}
                      {type === 'expenseType' && (
                        <span className="expense-method">
                          💳 {expense.paymentMethod}
                        </span>
                      )}
                    </div>
                    
                    <div className="expense-details">
                      <div className="expense-notes">
                        📝 {expense.notes || 'Sin notas'}
                      </div>
                      
                      {/* Información de Gasto Fijo si existe */}
                      {expense.fixedExpenseInfo && (
                        <div className="fixed-expense-info">
                          <span className="fixed-expense-badge">💼 Gasto Fijo</span>
                          <div className="fixed-expense-details">
                            <strong>{expense.fixedExpenseInfo.name}</strong>
                            {expense.fixedExpenseInfo.description && (
                              <span> - {expense.fixedExpenseInfo.description}</span>
                            )}
                            {expense.fixedExpenseInfo.category && (
                              <span className="fixed-expense-category">
                                📂 {expense.fixedExpenseInfo.category}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Información de dirección si existe */}
                      {expense.propertyAddress && expense.propertyAddress !== 'Sin dirección' && (
                        <div className="property-address">
                          📍 {expense.propertyAddress}
                        </div>
                      )}
                      
                      <div className="expense-meta">
                        <span className="expense-id">ID: {expense.idExpense}</span>
                        {expense.workId && (
                          <span className="work-id">Work: {expense.workId}</span>
                        )}
                        {expense.relatedFixedExpenseId && (
                          <span className="fixed-expense-id">Gasto Fijo: {expense.relatedFixedExpenseId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-expenses">
                No hay gastos para mostrar
              </div>
            )}
          </div>
          
          <div className="card-footer">
            <div className="summary-stats">
              <div className="stat">
                <span className="label">Total:</span>
                <span className="value">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="stat paid">
                <span className="label">Pagados:</span>
                <span className="value">{paidCount} gastos - {formatCurrency(paidAmount)}</span>
              </div>
              <div className="stat unpaid">
                <span className="label">Por pagar:</span>
                <span className="value">{unpaidCount} gastos - {formatCurrency(unpaidAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableCard;