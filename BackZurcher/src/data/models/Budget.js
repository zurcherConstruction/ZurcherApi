const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("Budget", {
    idBudget: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    propertyAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      references: {
        model: 'Permits',
        key: 'propertyAddress'
      }
    },
    applicantName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), // Aseguramos precisión decimal
      allowNull: false,
    },
    initialPayment: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("created","send", "approved", "notResponded", "rejected"),
      allowNull: false,
    },
    // propertyAddress: {
    //   type: DataTypes.TEXT,
    //   allowNull: false, // Asegúrate de que sea obligatorio
    // },
     systemType: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    drainfieldDepth: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gpdCapacity: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentInvoice: { // Guarda la URL del comprobante
      type: DataTypes.STRING, 
      allowNull: true, 
    },
    // --- NUEVO CAMPO ---
    paymentProofType: { // Guarda el TIPO del comprobante
      type: DataTypes.ENUM('pdf', 'image'), 
      allowNull: true, 
    },
    
    
  });
};
