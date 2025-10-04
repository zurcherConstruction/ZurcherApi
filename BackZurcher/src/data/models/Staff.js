const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define(
    "Staff",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // Genera automáticamente un UUID
        primaryKey: true, // Define este campo como clave primaria
      },
      name: {
        type: DataTypes.STRING,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: { 
        type: DataTypes.STRING,
        allowNull: true, 
      },
      idFrontUrl: { 
        type: DataTypes.STRING,
        allowNull: true,
      },
      idFrontPublicId: { 
        type: DataTypes.STRING,
        allowNull: true,
      },
      idBackUrl: { // Nuevo campo para la URL de la imagen del dorso del ID
        type: DataTypes.STRING,
        allowNull: true,
      },
      idBackPublicId: { // Nuevo campo para el public_id de Cloudinary del dorso del ID
        type: DataTypes.STRING,
        allowNull: true,
      },

      role: {
        type: DataTypes.ENUM("recept", "admin", "owner", "worker", "finance", "maintenance", "sales_rep"),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
      },
      lastLogout: {
        type: DataTypes.DATE,
      },

      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tokenCreatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pushToken: {
        type: DataTypes.STRING, // Expo push tokens son strings
        allowNull: true,       // Puede ser nulo si el usuario no usa la app o no ha dado permiso
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      paranoid: true,
    }
  );
};
