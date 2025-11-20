/**
 * Migración: Crear tabla BankTransaction
 * 
 * Registra todos los movimientos bancarios (depósitos, retiros, transferencias)
 * Vincula automáticamente con Incomes, Expenses y pagos de tarjetas
 * 
 * EJECUTAR: node migrations/20251118-create-bank-transactions.js
 */

const { sequelize } = require('../src/data');
const { DataTypes } = require('sequelize');

const runMigration = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('💳 Iniciando migración: Crear tabla BankTransactions...\n');

    // Verificar si la tabla ya existe
    const tables = await queryInterface.showAllTables();
    if (tables.includes('BankTransactions')) {
      console.log('⚠️  Tabla BankTransactions ya existe. Saltando creación.');
      return;
    }

    await queryInterface.createTable('BankTransactions', {
      idTransaction: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      bankAccountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BankAccounts',
          key: 'idBankAccount'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Cuenta bancaria asociada a la transacción'
      },
      transactionType: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer_in', 'transfer_out'),
        allowNull: false,
        comment: 'Tipo de transacción: deposit=entrada, withdrawal=salida, transfer=transferencia'
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Monto de la transacción (siempre positivo)'
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha de la transacción'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Descripción de la transacción'
      },

      // Vinculación con registros existentes
      relatedIncomeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Incomes',
          key: 'idIncome'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Income asociado (si aplica)'
      },
      relatedExpenseId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Expenses',
          key: 'idExpense'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Expense asociado (si aplica)'
      },
      relatedCreditCardPaymentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'SupplierInvoices',
          key: 'idSupplierInvoice'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Pago de tarjeta asociado (si aplica)'
      },

      // Para transferencias entre cuentas
      transferToAccountId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'BankAccounts',
          key: 'idBankAccount'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Cuenta destino en transferencias'
      },
      transferFromAccountId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'BankAccounts',
          key: 'idBankAccount'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Cuenta origen en transferencias'
      },
      relatedTransferId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'BankTransactions',
          key: 'idTransaction'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Transacción relacionada (enlaza entrada/salida de transferencia)'
      },

      // Metadatos
      category: {
        type: DataTypes.ENUM('income', 'expense', 'transfer', 'credit_card_payment', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
        comment: 'Categoría de la transacción'
      },
      balanceAfter: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Balance de la cuenta después de esta transacción'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales'
      },
      createdByStaffId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Staff que creó la transacción'
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

    // Foreign key para Staff (se agrega después porque Staff puede tener nombre de tabla diferente)
    try {
      await sequelize.query(`
        ALTER TABLE "BankTransactions" 
        ADD CONSTRAINT "BankTransactions_createdByStaffId_fkey" 
        FOREIGN KEY ("createdByStaffId") 
        REFERENCES "Staff" ("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `);
      console.log('✅ Foreign key para Staff creada');
    } catch (err) {
      console.log('⚠️  No se pudo crear foreign key para Staff (probablemente la tabla se llama diferente)');
      console.log('   Esto no afecta el funcionamiento, solo la integridad referencial');
    }

    // Índices para mejorar rendimiento
    await queryInterface.addIndex('BankTransactions', ['bankAccountId'], {
      name: 'idx_bank_transactions_account'
    });

    await queryInterface.addIndex('BankTransactions', ['date'], {
      name: 'idx_bank_transactions_date'
    });

    await queryInterface.addIndex('BankTransactions', ['transactionType'], {
      name: 'idx_bank_transactions_type'
    });

    await queryInterface.addIndex('BankTransactions', ['category'], {
      name: 'idx_bank_transactions_category'
    });

    await queryInterface.addIndex('BankTransactions', ['relatedIncomeId'], {
      name: 'idx_bank_transactions_income'
    });

    await queryInterface.addIndex('BankTransactions', ['relatedExpenseId'], {
      name: 'idx_bank_transactions_expense'
    });

    await queryInterface.addIndex('BankTransactions', ['relatedCreditCardPaymentId'], {
      name: 'idx_bank_transactions_cc_payment'
    });

    console.log('✅ Tabla BankTransactions creada exitosamente');
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
