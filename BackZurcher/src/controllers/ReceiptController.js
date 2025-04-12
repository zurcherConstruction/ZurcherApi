const { Receipt } = require('../data');

const createReceipt = async (req, res) => {
    try {
      const { relatedModel, relatedId, type, notes } = req.body;
      const pdfData = req.file ? req.file.buffer : null;
  
      if (!relatedModel || !relatedId || !type) {
        return res.status(400).json({ error: 'relatedModel, relatedId, and type are required.' });
      }
  
      const receipt = await Receipt.create({
        relatedModel,
        relatedId,
        type,
        pdfData,
        notes,
      });
  
      res.status(201).json(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const getReceiptsByRelated = async (req, res) => {
    try {
      const { relatedModel, relatedId } = req.params;
      const receipts = await Receipt.findAll({ where: { relatedModel, relatedId } });
      res.status(200).json(receipts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const deleteReceipt = async (req, res) => {
    try {
      const { idReceipt } = req.params;
      await Receipt.destroy({ where: { idReceipt } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  module.exports = {
    createReceipt,
    getReceiptsByRelated,
    deleteReceipt,
  };