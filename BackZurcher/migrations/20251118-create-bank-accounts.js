/**
 * Migración: Crear tabla BankAccount
 * 
 * Sistema de gestión de cuentas bancarias para control de flujo de efectivo
 * Permite rastrear balances y movimientos de cada cuenta
 * 
 * EJECUTAR: node migrations/20251118-create-bank-accounts.js
 */

const { sequelize } = require('../src/data');
const { DataTypes } = require('sequelize');

const runMigration = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🏦 Iniciando migración: Crear tabla BankAccounts...\n');

    // Verificar si la tabla ya existe
    const tables = await queryInterface.showAllTables();
    if (tables.includes('BankAccounts')) {
      console.log('⚠️  Tabla BankAccounts ya existe. Saltando creación.');
      return;
    }

    await queryInterface.createTable('BankAccounts', {
      idBankAccount: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      accountName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Nombre de la cuenta bancaria o método de pago'
      },
      accountType: {
        type: DataTypes.ENUM('checking', 'savings', 'cash', 'credit_card'),
        allowNull: false,
        defaultValue: 'checking',
        comment: 'Tipo de cuenta: checking=cuenta corriente, savings=ahorros, cash=efectivo'
      },
      currentBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Balance actual de la cuenta en USD'
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'Código de moneda ISO 4217'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la cuenta está activa para transacciones'
      },
      bankName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nombre del banco (ej: Chase, Bank of America)'
      },
      accountNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Últimos 4 dígitos de la cuenta para identificación'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre la cuenta'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para mejorar rendimiento de consultas
    await queryInterface.addIndex('BankAccounts', ['accountName'], {
      name: 'idx_bank_accounts_name'
    });

    await queryInterface.addIndex('BankAccounts', ['isActive'], {
      name: 'idx_bank_accounts_active'
    });

    console.log('✅ Tabla BankAccounts creada exitosamente');
    console.log('✅ Índices creados');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

runMigration();
