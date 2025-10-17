# App Store Release Notes - Version 1.0.1

## What's New in This Version

### 🔧 New Feature: Integrated Maintenance Management System

**For Field Workers and Maintenance Staff:**

We've added a comprehensive maintenance inspection system that seamlessly integrates into your existing workflow. Now maintenance visits appear directly in your "Assigned Works" list, eliminating the need to switch between different sections of the app.

#### Key Features:

**Visual Identification:**
- Maintenance visits are displayed with an orange background and wrench icon 🔧 for easy identification
- All tasks (regular work orders and maintenance visits) are now unified in a single, organized list

**Smart Scheduling:**
- Tasks are sorted by date with the most recent items appearing first
- Date format: MM-DD-YYYY for clear visibility
- Schedule and track maintenance visits alongside regular work orders

**Digital Inspection Forms:**
- Access comprehensive web-based maintenance inspection forms directly within the app
- Complete detailed inspections with conditional sections based on system type:
  - ATU (Aerobic Treatment Unit) systems
  - Lift Station systems
  - PBTS (Pretreatment Biological Treatment System)
- Capture and upload photos/videos directly from your device
- Forms adapt to the specific septic system being serviced

**Seamless Integration:**
- Tap any maintenance assignment to open the inspection form
- Forms load securely with time-limited access tokens
- Automatic list refresh upon form completion
- Real-time synchronization with the backend system

**Enhanced Workflow:**
- Secure 15-minute session tokens for form access
- Offline-ready architecture for field work
- Automatic data submission and validation
- Instant feedback and error handling

#### Technical Improvements:

**Performance & Security:**
- Optimized WebView implementation for iOS using WKWebView
- Secure JWT token authentication for maintenance forms
- HTTPS encryption for all data transmission
- Improved error handling with automatic retry mechanisms

**User Experience:**
- Loading indicators during form generation
- Clear visual feedback during data submission
- Intuitive navigation with automatic return to work list
- Responsive design optimized for all iPhone screen sizes

**Data Management:**
- Real-time synchronization with backend servers
- Proper handling of multimedia uploads (photos/videos)
- Field-specific file association for inspection documentation
- Automatic work list refresh after form completion

#### Permissions Required:

This update requires access to:
- **Camera**: To capture photos during maintenance inspections
- **Photo Library**: To upload existing photos and save inspection documentation

These permissions are only used when you actively choose to add photos to maintenance forms.

---

## Bug Fixes & Improvements

- Fixed field name mapping in maintenance visit assignments
- Corrected authentication role checking for maintenance access
- Improved date handling and timezone consistency (America/New_York)
- Enhanced error messages for better troubleshooting
- Optimized network request handling for maintenance endpoints
- Fixed hook ordering in WebView component for iOS compatibility

---

## For Administrators & Supervisors

- Assign maintenance visits to field workers or maintenance staff
- Track completion status in real-time
- View uploaded inspection photos and documentation
- Monitor scheduled vs. completed maintenance visits
- Access detailed inspection reports with field-specific data

---

## What to Expect

After updating:
1. Log in with your worker or maintenance credentials
2. Navigate to "Assigned Works" (Trabajos Asignados)
3. Look for orange-highlighted maintenance items
4. Tap any maintenance visit to open the inspection form
5. Complete the form with photos and required information
6. Submit - you'll automatically return to your updated work list

---

## Technical Details for Review

**WebView Implementation:**
- Uses react-native-webview v13.12.5 (industry-standard library)
- Loads forms from: https://www.zurcherseptic.com/maintenance-form
- Two-way communication via postMessage API
- Secure token-based authentication (15-minute expiration)
- Fallback error handling for network issues

**Backend Integration:**
- REST API endpoints for maintenance visit management
- Multipart/form-data support for file uploads (20 file limit)
- JWT authentication with role-based access control
- CORS properly configured for production domain

**iOS Compatibility:**
- Supports iOS 13.0 and later
- Optimized for iPhone and iPad
- Uses WKWebView (Apple's recommended web engine)
- All required permissions declared in Info.plist
- Tested on iOS 15, 16, and 17

**Data Privacy:**
- All data transmission over HTTPS
- No third-party analytics or tracking
- Photos/videos only uploaded when user explicitly submits form
- Secure token-based authentication prevents unauthorized access
- Tokens expire after 15 minutes for enhanced security

---

## Testing Instructions for Review Team

To test the maintenance feature:

1. **Login Credentials** (test account):
   - Email: cerzurc@hotmail.com
   - Role: Worker

2. **Navigate to Assigned Works:**
   - From the main menu, select "Trabajos Asignados" (Assigned Works)

3. **Identify Maintenance Items:**
   - Look for items with orange background and wrench icon
   - These are maintenance visits assigned to the logged-in worker

4. **Open Maintenance Form:**
   - Tap any orange maintenance item
   - WebView will open with the maintenance inspection form
   - You should see a loading indicator followed by the form

5. **Test Form Submission:**
   - Fill out any required fields
   - Optionally add photos using the camera/photo library
   - Click "Guardar" (Save) button
   - App should return to work list automatically
   - List should refresh showing updated data

6. **Expected Behavior:**
   - Form loads within 2-3 seconds
   - Photos can be selected from library or camera
   - Submission shows success message
   - Automatic navigation back to work list
   - No crashes or frozen screens

---

## What Hasn't Changed

- All existing features remain fully functional
- Current work order management unchanged
- Notification system operates as before
- User authentication and security maintained
- Performance and stability preserved

---

## Version History

**Version 1.0.1** (Current)
- Added integrated maintenance management system
- Improved work list organization with date sorting
- Enhanced WebView support for iOS
- Added camera/photo library permissions for maintenance forms

**Version 1.0.0**
- Initial release with work order tracking
- Staff authentication and role management
- Push notifications
- Image upload for work documentation

---

## Contact & Support

For questions about this update:
- Technical issues: Review the detailed documentation in the repository
- Feature requests: Contact the development team
- Security concerns: All data transmitted securely via HTTPS

---

**Build Number:** 5  
**Bundle Identifier:** com.zurcher.construction  
**Minimum iOS Version:** 13.0  
**Target SDK:** iOS 17.0

---

## For App Review Team

This update introduces a work order management enhancement specifically for field maintenance staff. The WebView component loads forms from our production web server (https://www.zurcherseptic.com) with secure token authentication. This approach allows us to:

1. Maintain consistent forms across mobile and web platforms
2. Update form logic without requiring app updates
3. Ensure data validation occurs server-side
4. Provide a seamless user experience with native navigation

The WebView is strictly limited to our own domain and does not load any third-party content or advertising. All user data remains within our secure infrastructure.

**Privacy Note:** Camera and Photo Library access are only used when the user explicitly chooses to add photos to maintenance forms. No photos are accessed or transmitted without user action.

Thank you for reviewing our app update!
