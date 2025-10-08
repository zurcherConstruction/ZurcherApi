# 🧪 Permit Edit - Complete Testing Guide

## 📋 Overview
This guide provides step-by-step testing procedures to verify that Permit edits are correctly synchronized across all components (EditBudget, BudgetList, and Search).

---

## ✅ Pre-Testing Checklist

### Backend Running
- [ ] Backend server running on Railway or localhost
- [ ] Database accessible
- [ ] No errors in backend console

### Frontend Running
- [ ] Frontend running (Vite dev server)
- [ ] No errors in browser console
- [ ] Logged in as admin/owner/recept

### Browser DevTools Open
- [ ] Open Console tab (to see logs)
- [ ] Open Network tab (to see API calls)

---

## 🧪 Test Case 1: Basic Permit Edit

### Step 1: Search for Budget
1. Go to **EditBudget** component
2. In the search box, type a property address (e.g., "8900 Blvd")
3. **Expected**: Budget appears in search results
4. Click to select the budget

**Console Logs to Verify**:
```
Dispatching fetchBudgetById for ID: 2268
```

**Network Calls to Verify**:
```
GET /budget/2268 → 200 OK
```

### Step 2: Open Edit Permit Modal
1. Click **"Editar Campos del Permit"** button
2. **Expected**: Modal opens with current Permit data
3. Verify all fields are populated correctly

**Console Logs to Verify**:
```
✅ Datos del Permit cargados
```

**Network Calls to Verify**:
```
GET /permit/09691f3b-15b7-4745-8e14-05d16740d878 → 200 OK
```

### Step 3: Edit Permit Fields
1. Change **applicantName**: "Hanna Zurcher" → "Hanna Zurcher a"
2. Change **propertyAddress**: "8900 Blvd Lehigh Acres, FL" → "8900 Blvd  Lehigh Acres, FL 33974"
3. Click **"Guardar Cambios"**

**Console Logs to Verify**:
```
✅ Permit actualizado, recargando datos...
🔍 Búsqueda limpiada - busca de nuevo con los valores actualizados
🔄 Recreando formData con datos actualizados del Permit
📝 Valores clave: {
  permitNumber: '36-SN-2787667',
  applicantName: 'Hanna Zurcher a',
  propertyAddress: '8900 Blvd  Lehigh Acres, FL 33974',
  ...
}
✅ Datos recargados y modal cerrado
```

**Backend Logs to Verify**:
```
🔧 Actualizando Permit 09691f3b-15b7-4745-8e14-05d16740d878...
✅ Permit actualizado correctamente
🔄 Sincronizados 1 Budget(s) asociados con el Permit
```

**Network Calls to Verify**:
```
PATCH /permit/09691f3b-15b7-4745-8e14-05d16740d878/fields → 200 OK
GET /budget/2268 → 200 OK (refetch budget)
```

### Step 4: Verify EditBudget Shows Updated Data
1. **Expected**: Modal closes after 1 second
2. **Expected**: Search box is EMPTY (cleared)
3. **Expected**: Search results list is EMPTY
4. Look at the form fields in EditBudget
5. **Expected**: applicantName shows "Hanna Zurcher a"
6. **Expected**: propertyAddress shows "8900 Blvd  Lehigh Acres, FL 33974"

**✅ PASS CRITERIA**: All fields show updated values

### Step 5: Verify Search with NEW Value
1. In the search box, type the NEW property address: "8900 Blvd  Lehigh Acres, FL 33974"
2. **Expected**: Budget appears in search results
3. **Expected**: Budget shows updated applicantName and propertyAddress

**✅ PASS CRITERIA**: Budget found with new values

### Step 6: Verify Search with OLD Value
1. Clear the search box
2. Type the OLD property address: "8900 Blvd Lehigh Acres, FL" (without 33974)
3. **Expected**: Budget NOT found (or partial match if substring matches)

**✅ PASS CRITERIA**: Search correctly filters by updated values

---

## 🧪 Test Case 2: BudgetList Synchronization

### Step 1: Navigate to BudgetList
1. After editing Permit (from Test Case 1), navigate to **BudgetList** component
2. Find Budget ID 2268 in the list
3. **Expected**: propertyAddress column shows "8900 Blvd  Lehigh Acres, FL 33974"
4. **Expected**: applicantName shows "Hanna Zurcher a" (if visible in list)

**Network Calls to Verify**:
```
GET /budget/all?page=1&pageSize=10 → 200 OK
```

**✅ PASS CRITERIA**: BudgetList shows updated data without manual refresh

### Step 2: Verify Pagination
1. If Budget is on page 2, navigate to page 2
2. **Expected**: Budget still shows updated data
3. Navigate back to page 1
4. **Expected**: Other budgets still show correct data

**✅ PASS CRITERIA**: No data corruption across pages

---

## 🧪 Test Case 3: Real-Time Validation

### Step 1: Edit Permit with Duplicate permitNumber
1. Open EditBudget, select a budget
2. Click "Editar Campos del Permit"
3. Change **permitNumber** to an existing number (e.g., another budget's permit number)
4. Wait 1 second (debounce)
5. **Expected**: Red border on permitNumber field
6. **Expected**: Error message: "⚠️ Ya existe un Permit con este número"
7. Click "Guardar Cambios"
8. **Expected**: Form submission BLOCKED

**Console Logs to Verify**:
```
🔍 Validando permitNumber...
❌ permitNumber duplicado
```

**Network Calls to Verify**:
```
GET /permit/check-permit-number/36-SN-2787667 → 200 { exists: true }
```

**✅ PASS CRITERIA**: Duplicate prevented, user cannot save

### Step 2: Edit Permit with Duplicate propertyAddress
1. Change **propertyAddress** to an existing address
2. Wait 1 second (debounce)
3. **Expected**: Red border on propertyAddress field
4. **Expected**: Error message: "⚠️ Ya existe un Permit con esta dirección"
5. Click "Guardar Cambios"
6. **Expected**: Form submission BLOCKED

**✅ PASS CRITERIA**: Duplicate prevented

### Step 3: Edit Permit with Valid Unique Values
1. Change **permitNumber** to a unique value (e.g., "36-SN-9999999")
2. Wait 1 second (debounce)
3. **Expected**: Green border on permitNumber field
4. **Expected**: Success message: "✅ Número de permit disponible"
5. Change **propertyAddress** to a unique value
6. Wait 1 second (debounce)
7. **Expected**: Green border on propertyAddress field
8. **Expected**: Success message: "✅ Dirección disponible"
9. Click "Guardar Cambios"
10. **Expected**: Form saves successfully

**✅ PASS CRITERIA**: Validation passes, form saves

---

## 🧪 Test Case 4: Edge Cases

### Edge Case 1: Edit Permit, Don't Change Unique Fields
1. Open Edit Permit Modal
2. Change only **applicantPhone** (not permitNumber or propertyAddress)
3. Click "Guardar Cambios"
4. **Expected**: No validation errors
5. **Expected**: Form saves successfully
6. **Expected**: EditBudget shows updated phone number

**✅ PASS CRITERIA**: Unchanged fields don't trigger validation

### Edge Case 2: Edit Permit Multiple Times
1. Edit Permit, change propertyAddress to "Address A"
2. Save successfully
3. Immediately open Edit Permit Modal again
4. Change propertyAddress to "Address B"
5. Save successfully
6. **Expected**: formData recreates correctly each time
7. **Expected**: Search cleared each time
8. **Expected**: BudgetList shows "Address B" (latest value)

**✅ PASS CRITERIA**: Multiple edits work correctly

### Edge Case 3: Edit Permit with Empty Email Array
1. Open Edit Permit Modal
2. Remove all additional emails (leave only applicantEmail)
3. Save
4. **Expected**: Backend processes empty array correctly
5. **Expected**: No errors

**Console Logs to Verify**:
```
📧 Email principal: yanicorc@gmail.com
📧 Emails adicionales: []
```

**✅ PASS CRITERIA**: Empty array handled gracefully

### Edge Case 4: Edit Permit on Different Page
1. In BudgetList, navigate to page 2 or 3
2. Note the current budget on that page
3. Go to EditBudget, select a DIFFERENT budget
4. Edit that budget's Permit
5. Save changes
6. Go back to BudgetList
7. **Expected**: BudgetList still on same page
8. **Expected**: Current page shows correct data
9. Navigate to the page with the edited budget
10. **Expected**: Edited budget shows updated data

**✅ PASS CRITERIA**: No pagination corruption

---

## 🧪 Test Case 5: Race Conditions (Stress Test)

### Scenario: Rapid Edits
1. Edit Permit, change propertyAddress
2. Click "Guardar Cambios"
3. **IMMEDIATELY** (while modal is closing) click "Editar Campos del Permit" again
4. Make another change
5. Save again
6. **Expected**: No errors
7. **Expected**: Latest values shown correctly

**✅ PASS CRITERIA**: No race condition errors

### Scenario: Network Delay
1. Open Browser DevTools → Network tab
2. Enable "Slow 3G" or "Fast 3G" throttling
3. Edit Permit, change fields
4. Click "Guardar Cambios"
5. **Expected**: Loading state shown
6. **Expected**: User cannot click save again (button disabled)
7. Wait for save to complete
8. **Expected**: Data updated correctly despite slow network

**✅ PASS CRITERIA**: Loading states work correctly

---

## 📊 Success Criteria Summary

### Must Pass (Critical)
- [ ] Permit edits save to backend successfully
- [ ] EditBudget shows updated data immediately after save
- [ ] BudgetList shows updated data without manual refresh
- [ ] Search cleared after Permit edit
- [ ] Search finds budget by NEW propertyAddress
- [ ] Real-time validation prevents duplicates
- [ ] Backend syncs Budget table when Permit updates

### Should Pass (Important)
- [ ] Multiple edits work correctly
- [ ] Pagination doesn't break after edits
- [ ] Empty email arrays handled gracefully
- [ ] Loading states shown during saves
- [ ] No console errors

### Nice to Have (Optional)
- [ ] Smooth animations on modal close
- [ ] Toast notifications on save
- [ ] Optimistic UI updates

---

## 🐛 Common Issues and Solutions

### Issue: "Search still shows old data"
**Cause**: searchTerm not cleared  
**Solution**: Verify `setSearchTerm("")` is called in onSuccess  
**Check**: Console log should show "🔍 Búsqueda limpiada"

### Issue: "BudgetList shows old data"
**Cause**: fetchBudgets() race condition  
**Solution**: Verify fetchBudgets() is NOT called in onSuccess (only fetchBudgetById)  
**Check**: Network tab should NOT show duplicate `/budget/all` calls after edit

### Issue: "formData not updating"
**Cause**: forceFormDataRefresh not incrementing  
**Solution**: Verify `setForceFormDataRefresh(prev => prev + 1)` in onSuccess  
**Check**: Console log should show "🔄 Recreando formData"

### Issue: "Validation not triggering"
**Cause**: Debounce timer not completing  
**Solution**: Wait 1 second after typing before expecting validation  
**Check**: Network tab should show `/permit/check-permit-number/:number` call

### Issue: "Backend not syncing Budget"
**Cause**: Budget.update() not called  
**Solution**: Verify backend logs show "🔄 Sincronizados X Budget(s)"  
**Check**: Backend console should show sync message

---

## 📝 Test Results Template

```
Date: [Date]
Tester: [Name]
Environment: [Railway/Localhost]
Branch: yani39

Test Case 1: Basic Permit Edit
- Step 1: [ ] PASS / [ ] FAIL
- Step 2: [ ] PASS / [ ] FAIL
- Step 3: [ ] PASS / [ ] FAIL
- Step 4: [ ] PASS / [ ] FAIL
- Step 5: [ ] PASS / [ ] FAIL
- Step 6: [ ] PASS / [ ] FAIL

Test Case 2: BudgetList Synchronization
- Step 1: [ ] PASS / [ ] FAIL
- Step 2: [ ] PASS / [ ] FAIL

Test Case 3: Real-Time Validation
- Step 1: [ ] PASS / [ ] FAIL
- Step 2: [ ] PASS / [ ] FAIL
- Step 3: [ ] PASS / [ ] FAIL

Test Case 4: Edge Cases
- Edge Case 1: [ ] PASS / [ ] FAIL
- Edge Case 2: [ ] PASS / [ ] FAIL
- Edge Case 3: [ ] PASS / [ ] FAIL
- Edge Case 4: [ ] PASS / [ ] FAIL

Test Case 5: Race Conditions
- Rapid Edits: [ ] PASS / [ ] FAIL
- Network Delay: [ ] PASS / [ ] FAIL

Overall Status: [ ] ALL PASS / [ ] SOME FAILURES
Notes: [Any additional observations]
```

---

## 🚀 Quick Smoke Test (5 minutes)

If you only have time for a quick test, do this:

1. **Search for budget** → Select → Edit Permit → Change propertyAddress → Save
2. **Verify**: Search cleared ✅
3. **Verify**: Search with new address finds budget ✅
4. **Navigate to BudgetList** → Find budget → Check propertyAddress column ✅
5. **Try duplicate permitNumber** → Verify blocked ✅

If all 5 steps pass → Feature is working! 🎉

---

**Last Updated**: January 2025  
**Status**: Ready for Testing  
**Branch**: yani39
