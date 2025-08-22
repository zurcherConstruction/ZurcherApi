const { resetAndSeedBudgetItems } = require('./src/utils/items');
require('dotenv').config();

resetAndSeedBudgetItems()
  .then((res) => {
    console.log(res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });