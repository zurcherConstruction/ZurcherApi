# 🎯 Permit Edit - Quick Reference Card

## 🚀 How to Use (User Guide)

### Step 1: Open Edit Permit Modal
1. Go to **EditBudget** component
2. Search and select a budget
3. Click **"Editar Campos del Permit"** button (green button with pencil icon)

### Step 2: Edit Fields
**4 Sections Available**:

#### 📋 Identificación
- Permit Number (validates uniqueness)
- Lot
- Block

#### 🔧 Técnicos
- System Type (dropdown)
- PBTS (checkbox)
- Drainfield Depth
- GPD Capacity
- Excavation Required
- Square Feet System
- Pump

#### 📅 Fechas
- Expiration Date

#### 👤 Contacto
- Applicant Name
- Applicant Phone
- Property Address (validates uniqueness)

#### 📧 Emails
- Primary Email (applicantEmail) - for invoices/SignNow
- Additional Emails (notificationEmails) - for notifications

### Step 3: Real-Time Validation
- **Wait 1 second** after typing
- **Green border** = ✅ Valid/Available
- **Red border** = ❌ Duplicate/Error
- **Blue border** = 🔵 Checking...

### Step 4: Save Changes
1. Click **"Guardar Cambios"**
2. Wait for save (loading state)
3. Modal closes automatically
4. **Search is cleared** - search again with new values!

---

## 🔍 What Happens After Save

### Automatic Updates
1. ✅ Backend updates **Permit table**
2. ✅ Backend syncs **Budget table**
3. ✅ Frontend refetches updated budget
4. ✅ **EditBudget** shows new values immediately
5. ✅ **BudgetList** shows new values (no refresh needed)
6. ✅ **Search is cleared** (search again with updated values)

### Where to See Changes
- **EditBudget**: Form fields update immediately
- **BudgetList**: Table shows updated propertyAddress/applicantName
- **Search**: Search with NEW values to find budget

---

## ⚠️ Important Notes

### Search After Edit
**IMPORTANT**: After editing a Permit, the search box is **cleared automatically**.  
**Why?**: If you searched for "5500 Blvd" and changed it to "7900 Blvd", the old search won't find the budget anymore.  
**Solution**: Search again with the NEW propertyAddress!

### Duplicate Prevention
- **Permit Number**: Must be unique across all permits
- **Property Address**: Must be unique across all permits
- **Real-time validation**: Checks as you type (800ms debounce)
- **Form blocks submission**: Cannot save if duplicates detected

### Email Management
- **Primary Email** (applicantEmail): Used for invoices and SignNow
- **Additional Emails**: Add multiple notification recipients
- **Format**: Must be valid email format
- **Tag UI**: Click "×" to remove additional emails

---

## 🐛 Troubleshooting

### "Can't find budget after editing"
**Problem**: Searched for old propertyAddress  
**Solution**: Search with the NEW propertyAddress you just saved

### "Changes not showing in EditBudget"
**Problem**: formData not updating  
**Solution**: Close and re-open the budget (should auto-update)  
**Check console**: Look for "🔄 Recreando formData"

### "Changes not showing in BudgetList"
**Problem**: Redux state not updating  
**Solution**: Refresh the page (should not be needed)  
**Check network**: Look for `GET /budget/:id` call after save

### "Validation says duplicate but it's not"
**Problem**: Comparing against self  
**Solution**: Backend excludes current permit - if still showing, data might be stale  
**Check**: Try a different value to confirm validation works

### "Cannot save - button disabled"
**Problem**: Validation failed (duplicate detected)  
**Solution**: 
1. Check for red borders on fields
2. Read error messages below fields
3. Change values to unique ones
4. Wait for green borders before saving

---

## 🔑 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal |
| `Tab` | Navigate between fields |
| `Enter` | Submit form (if no validation errors) |

---

## 📊 Visual Indicators

### Field Borders
| Color | Meaning |
|-------|---------|
| 🔵 Blue | Checking for duplicates... |
| ✅ Green | Valid/Available |
| ❌ Red | Duplicate/Error |
| ⚪ Gray | No validation (idle) |

### Button States
| State | Appearance | Action |
|-------|------------|--------|
| Normal | Green | Click to save |
| Disabled | Gray (opacity 50%) | Cannot click (validation failed) |
| Loading | Spinner icon | Saving... (wait) |

### Messages
| Icon | Type | Meaning |
|------|------|---------|
| ✅ | Success | Value available/saved |
| ⚠️ | Warning | Duplicate detected |
| ❌ | Error | Validation failed |
| ℹ️ | Info | Informational message |

---

## 🧪 Quick Test (1 minute)

1. **Open Edit Permit Modal** → ✅ All fields populated
2. **Change applicantName** → Add " a" at the end → ✅ Saves
3. **Check EditBudget form** → ✅ Shows " a" at the end
4. **Search is cleared** → ✅ Search box empty
5. **Search with new name** → ✅ Budget found

If all 5 steps pass → **Everything working!** 🎉

---

## 📞 Support

### Check Logs
**Frontend Console**:
```
🔄 Recreando formData - formData is updating
✅ Permit actualizado - Save successful
🔍 Búsqueda limpiada - Search cleared
```

**Backend Console**:
```
🔧 Actualizando Permit - Processing update
✅ Permit actualizado correctamente - Update successful
🔄 Sincronizados X Budget(s) - Budget synced
```

### Check Network
**API Calls to Verify**:
```
PATCH /permit/:id/fields → 200 OK (save)
GET /budget/:id → 200 OK (refetch)
GET /permit/check-permit-number/:number → 200 OK (validation)
GET /permit/check-by-address?propertyAddress=... → 200 OK (validation)
```

---

## 📚 Documentation

For detailed technical documentation, see:
- **PERMIT_EDIT_FEATURE_COMPLETE.md** - Complete feature overview
- **PERMIT_EDIT_TESTING_GUIDE.md** - Detailed testing procedures
- **PERMIT_EDIT_GUIDE.md** - Full implementation guide

---

**Last Updated**: January 2025  
**Status**: ✅ READY TO USE  
**Branch**: yani39
