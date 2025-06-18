const { format, parseISO } = require('date-fns');

// Helper para formatear fechas
const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    let dateObj;
    if (typeof dateInput === 'string') {
      dateObj = parseISO(dateInput);
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else {
      return 'Invalid Date';
    }
    return format(dateObj, 'MM-dd-yyyy');
  } catch (e) {
    console.error("Error formateando fecha:", dateInput, e);
    return 'Invalid Date';
  }
};

module.exports = {
  formatDateDDMMYYYY
};