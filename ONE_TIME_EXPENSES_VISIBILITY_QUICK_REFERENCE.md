# One-Time Expenses Visibility - Quick Reference

## Quick Start

### 1. Backend Auto-Deactivation ✅ ACTIVE
**When**: Every time a one_time expense is fully paid  
**What Happens**: `isActive` automatically set to `false`  
**Code**: [fixedExpensePaymentController.js](BackZurcher/src/controllers/fixedExpensePaymentController.js#L356-L368)  
**Status**: ✅ Already deployed, working now

### 2. API Query Filtering ✅ ACTIVE
**Endpoint**: `GET /fixed-expenses`  
**Usage**: Add `?isActive=false` to get inactive expenses  
**Code**: [fixedExpenseController.js](BackZurcher/src/controllers/fixedExpenseController.js#L398-L410)  
**Status**: ✅ Already deployed, ready to use

### 3. Retroactive Cleanup Script ✅ READY
**Command**: `node deactivate-completed-onetime-expenses.js`  
**Purpose**: Deactivate already-completed one_time expenses  
**Location**: [BackZurcher/deactivate-completed-onetime-expenses.js](BackZurcher/deactivate-completed-onetime-expenses.js)  
**Status**: ✅ Ready to run in production

---

## Typical User Journey

### Scenario 1: One-time Expense Gets Paid Today
```
1. User creates "Inspection" (one_time, $500, isActive=true)
2. User registers payment for $500
3. System auto-deactivates: isActive=false
4. "Inspection" no longer appears in main list
5. User can see it in history section (isActive=false)
```

### Scenario 2: One-time with Multiple Partial Payments
```
1. User creates "Survey" (one_time, $1000, isActive=true)
2. First payment: $600 registered → stays active (60% paid)
3. Second payment: $400 registered → auto-deactivated (100% paid)
4. Both payments visible in payment history
5. No longer in active list
```

### Scenario 3: View Historical/Completed Expenses
```
GET /fixed-expenses
// Shows: Active expenses only (isActive=true)

GET /fixed-expenses?isActive=false
// Shows: Completed one_time and other inactive expenses
```

---

## API Reference

### Get Active Expenses (DEFAULT)
```bash
curl http://localhost:3001/fixed-expenses

# Response:
{
  "fixedExpenses": [
    {
      "idFixedExpense": "...",
      "name": "Monthly Rent",
      "frequency": "monthly",
      "isActive": true,  // ✅ All have isActive=true
      ...
    }
  ],
  "stats": {
    "total": 42,
    "active": 38,
    "inactive": 4
  }
}
```

### Get Inactive/Historical Expenses
```bash
curl "http://localhost:3001/fixed-expenses?isActive=false"

# Response:
{
  "fixedExpenses": [
    {
      "idFixedExpense": "...",
      "name": "Site Inspection",
      "frequency": "one_time",
      "isActive": false,  // ✅ All have isActive=false
      "totalAmount": 500,
      "paidAmount": 500,
      "paymentStatus": "paid"
      ...
    }
  ]
}
```

### Combine Filters
```bash
# Get inactive expenses in "Utilities" category
curl "http://localhost:3001/fixed-expenses?isActive=false&category=Utilities"

# Get inactive expenses with "inspection" in name
curl "http://localhost:3001/fixed-expenses?isActive=false&search=inspection"

# Multiple filters
curl "http://localhost:3001/fixed-expenses?isActive=false&category=Utilities&paymentMethod=check"
```

---

## Running the Retroactive Script

### One-Time Setup (Local or Production)
```bash
cd BackZurcher

# Run the script
node deactivate-completed-onetime-expenses.js

# Script will:
# 1. Find all one_time expenses that are active but fully paid
# 2. Show you the list with amounts and percentages
# 3. Ask for confirmation
# 4. Deactivate them
# 5. Show success/error report
```

### In Production (Railway)
```bash
# SSH into Railway container
railway shell

# Navigate and run
cd /app
node deactivate-completed-onetime-expenses.js

# Or via Railway CLI
railway run node deactivate-completed-onetime-expenses.js
```

### Example Interaction
```
🔄 DESACTIVADOR DE GASTOS ONE_TIME COMPLETADOS
================================================================================

📋 Gastos one_time activos encontrados: 12

🔴 Gastos one_time COMPLETAMENTE PAGADOS (a desactivar): 7

Lista de gastos a desactivar:
1. "Site Inspection" - $500.00 - 100% pagado ✓
2. "Permit Application" - $1,200.00 - 100% pagado ✓
3. "Survey" - $800.00 - 100% pagado ✓
...

================================================================================

⚠️  Se desactivarán 7 gasto(s).

¿Proceder con la desactivación? (s/n): s

✅ Desactivación completada exitosamente!
- Gastos desactivados: 7
- Errores: 0

✅ Los 7 gastos one_time han sido desactivados.
```

---

## Testing the Feature

### Quick Test
```javascript
// 1. Create a one_time expense
POST /fixed-expenses
{
  "name": "Test Inspection",
  "totalAmount": 500,
  "frequency": "one_time",
  "paymentMethod": "cash",
  ...
}
// Response: { idFixedExpense: "uuid-123", isActive: true, ... }

// 2. Register payment for full amount
POST /fixed-expenses/uuid-123/payments
{
  "amount": 500,
  "paymentMethod": "cash",
  ...
}
// Response: { success: true, message: "✅ Gasto one_time completado y desactivado automáticamente" }

// 3. Verify it's deactivated
GET /fixed-expenses
// "Test Inspection" should NOT appear

GET /fixed-expenses?isActive=false
// "Test Inspection" should appear
```

---

## Common Commands

### View All One-Time Expenses (Active)
```bash
GET /fixed-expenses?category=one_time  # If filtering by frequency available
# Or view manually in UI
```

### View Completed One-Time Expenses
```bash
GET /fixed-expenses?isActive=false
# Shows all inactive expenses (mostly completed one_time)
```

### Reactivate a Specific One-Time (if needed)
```bash
PATCH /fixed-expenses/{idFixedExpense}
{
  "isActive": true
}
```

### Check Deactivation Logs
```bash
# In app logs, search for:
"✅ Gasto one_time completado y desactivado automáticamente"

# Or query database:
SELECT * FROM FixedExpense 
WHERE frequency = 'one_time' 
AND isActive = false
ORDER BY updatedAt DESC;
```

---

## Frontend Optional Enhancement

### Current Behavior
- Frontend always shows active expenses by default
- API supports filtering but frontend doesn't use it yet

### Recommended Enhancement
Add a toggle button to show/hide historical expenses:

```javascript
const [showHistorical, setShowHistorical] = useState(false);

const loadExpenses = async () => {
  const params = showHistorical ? { isActive: 'false' } : {};
  const response = await api.get('/fixed-expenses', { params });
  setExpenses(response.data.fixedExpenses);
};

// In render:
<button onClick={() => setShowHistorical(!showHistorical)}>
  {showHistorical ? '📜 Hide Historical (4)' : '📜 Show Historical (4)'}
</button>
```

---

## Files Changed

### Backend Changes
✅ [fixedExpensePaymentController.js](BackZurcher/src/controllers/fixedExpensePaymentController.js#L356-L368)  
✅ [fixedExpenseController.js](BackZurcher/src/controllers/fixedExpenseController.js#L398-L410)

### Scripts
✅ [deactivate-completed-onetime-expenses.js](BackZurcher/deactivate-completed-onetime-expenses.js)

### Documentation
✅ [ONE_TIME_EXPENSES_VISIBILITY_IMPLEMENTATION.md](ONE_TIME_EXPENSES_VISIBILITY_IMPLEMENTATION.md) - Full details
✅ [ONE_TIME_EXPENSES_VISIBILITY_QUICK_REFERENCE.md](ONE_TIME_EXPENSES_VISIBILITY_QUICK_REFERENCE.md) - This file

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| One_time not deactivating after payment | Check payment amount in DB, verify it >= totalAmount |
| Retroactive script finds 0 expenses | OK - all completed one_time already inactive |
| API filtering not working | Verify backend deployed, try direct URL with ?isActive=false |
| Historical expenses not showing | Make API call with ?isActive=false parameter |
| Need to reactivate expense | PATCH endpoint with isActive=true |

---

## Status Summary

| Component | Status | When Ready |
|-----------|--------|-----------|
| Auto-Deactivation | ✅ ACTIVE | Now |
| API Filtering | ✅ ACTIVE | Now |
| Retroactive Script | ✅ READY | Run anytime |
| Frontend Toggle (Optional) | 📋 NOT STARTED | Optional |

---

**Last Updated**: January 8, 2026  
**Implementation Status**: Complete ✅  
**Production Ready**: Yes ✅
