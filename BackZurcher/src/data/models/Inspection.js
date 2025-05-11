const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Inspection', {
    idInspection: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    workId: { // Asegúrate de que esta relación esté definida en data/index.js
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Works', // Nombre de la tabla Works
        key: 'idWork',
      },
    },
    type: { // 'initial', 'final'
      type: DataTypes.ENUM('initial', 'final'),
      allowNull: false,
    },
    // Estado del PROCESO de esta inspección específica
    processStatus: {
      type: DataTypes.ENUM(
        'pending_request',      // Aún no se ha enviado la solicitud por correo a inspectores
        'requested_to_inspectors',// Solicitud enviada a inspectores, esperando respuesta con fecha
        'schedule_received',    // Inspectores respondieron con fecha y doc para aplicante
        'applicant_document_pending', // Documento enviado al aplicante, esperando firma
        'applicant_document_received',// Documento firmado recibido del aplicante
        'inspection_completed_pending_result', // Inspección física realizada, esperando resultado oficial
        'result_approved',      // Resultado final: Aprobada
        'result_rejected',       // Resultado final: Rechazada
        'reinspection'
      ),
      allowNull: false,
      defaultValue: 'pending_request',
    },
    // Estado final de la inspección (simplificado, podría derivarse de processStatus)
    finalStatus: { 
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true, // Se actualiza cuando se tiene el resultado final
    },
    dateRequestedToInspectors: { // Fecha en que se envió el correo a "Inspecciones Generales"
      type: DataTypes.DATE,
      allowNull: true,
    },
    inspectorScheduledDate: { // Fecha que "Inspecciones Generales" dio para la inspección
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    documentForApplicantUrl: { // Documento que envían los inspectores para que firme el aplicante
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentForApplicantPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateDocumentSentToApplicant: { // Fecha en que se envió el doc al aplicante
      type: DataTypes.DATE,
      allowNull: true,
    },
    signedDocumentFromApplicantUrl: { // Documento firmado devuelto por el aplicante
      type: DataTypes.STRING,
      allowNull: true,
    },
    signedDocumentFromApplicantPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateSignedDocumentReceived: { // Fecha en que se recibió el doc firmado
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateInspectionPerformed: { // Fecha real en que se realizó la inspección física
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    resultDocumentUrl: { // Captura del correo/documento con el resultado (aprobado/rechazado)
      type: DataTypes.STRING,
      allowNull: true,
    },
    resultDocumentPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateResultReceived: { // Fecha en que se recibió el resultado final
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    workerHasCorrected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, // Por defecto, no ha sido corregido
    },
    dateWorkerCorrected: { // Opcional: fecha en que el trabajador marcó como corregido
        type: DataTypes.DATE,
        allowNull: true,
    }
  }, {
    timestamps: true,
  });
};