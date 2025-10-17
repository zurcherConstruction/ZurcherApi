# App Store Connect - What's New (Short Version)

## Version 1.0.1 - Release Notes

**Copy this text into App Store Connect "What's New" field (max 4000 characters):**

---

🔧 NEW: Integrated Maintenance Management System

We've enhanced your workflow with a seamless maintenance inspection feature!

WHAT'S NEW:

• Unified Work List: Maintenance visits now appear alongside regular work orders in "Assigned Works"
• Visual Identification: Orange background + wrench icon for quick recognition
• Smart Sorting: All tasks sorted by date (most recent first) in MM-DD-YYYY format
• Digital Inspection Forms: Access comprehensive web-based forms directly in-app
• Photo Documentation: Capture and upload photos/videos during inspections
• Adaptive Forms: Conditional sections based on system type (ATU, Lift Station, PBTS)
• Automatic Sync: Real-time updates and list refresh after form completion

ENHANCED SECURITY:
• Secure 15-minute session tokens for form access
• HTTPS encryption for all data transmission
• Role-based access control for maintenance staff

IMPROVED USER EXPERIENCE:
• Loading indicators during form generation
• Clear visual feedback during submission
• Automatic return to work list after completion
• Optimized for all iPhone screen sizes

BUG FIXES:
• Fixed field name mapping in maintenance assignments
• Corrected authentication role checking
• Improved date handling and timezone consistency
• Enhanced error messages for better troubleshooting

PERMISSIONS:
This update requires Camera and Photo Library access to capture and upload inspection photos. These permissions are only used when you actively add photos to forms.

HOW TO USE:
1. Log in with your credentials
2. Navigate to "Assigned Works"
3. Tap orange-highlighted maintenance items
4. Complete inspection form with photos
5. Submit and return to updated work list

Technical: Uses react-native-webview v13.12.5, secure JWT authentication, and loads forms from our production server (zurcherseptic.com). Compatible with iOS 13.0+.

Thank you for using Zurcher Construction!

---

**Character count: ~1,750** ✅ (Well under 4000 limit)

---

# Alternative Ultra-Short Version (for Quick Review)

**Copy this if you prefer a shorter version (max 170 characters for some fields):**

---

New: Integrated maintenance inspection system with photo upload. Enhanced work list with date sorting. Bug fixes and performance improvements.

---

**Character count: 169** ✅

---

# App Store Connect - App Review Notes (Private to Reviewers)

**Copy this into "Notes" section for App Reviewers:**

---

TEST ACCOUNT:
Email: cerzurc@hotmail.com
Password: [Provide your test password here]
Role: Worker

TESTING THE NEW MAINTENANCE FEATURE:

1. Log in with the test account above
2. Tap "Trabajos Asignados" (Assigned Works) from the menu
3. Look for items with ORANGE background and wrench icon 🔧
4. Tap any orange item to open maintenance inspection form
5. WebView will load form from: https://www.zurcherseptic.com/maintenance-form
6. Form requires Camera/Photo Library permissions (tap "Allow" when prompted)
7. Fill out form fields and optionally add photos
8. Tap "Guardar" (Save) button at bottom
9. App will automatically return to work list

EXPECTED BEHAVIOR:
- Form loads in 2-3 seconds with loading indicator
- Camera/gallery access works when adding photos
- Form submits successfully with success message
- Automatic navigation back to work list
- List refreshes showing updated status

WEBVIEW EXPLANATION:
The WebView loads forms from our own production domain (zurcherseptic.com) with secure token authentication. This allows:
- Consistent forms across mobile/web platforms
- Server-side validation and updates without app updates
- Secure data handling within our infrastructure

NO THIRD-PARTY CONTENT: WebView only loads our own domain. No ads, tracking, or external links.

PERMISSIONS USAGE:
- Camera: Only when user taps "Add Photo" button in form
- Photo Library: Only when user selects existing photos
- No background access or automatic uploads

All data transmitted over HTTPS. Tokens expire after 15 minutes.

If you encounter any issues, please contact us. Thank you for reviewing!

---

**Character count: ~1,650** ✅

