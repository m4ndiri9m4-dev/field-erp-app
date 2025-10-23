/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// The Firebase Admin SDK to access Firebase services.
const admin = require("firebase-admin");
admin.initializeApp();

// --- FIX IS HERE ---
const db = admin.firestore(); // Removed comment entirely

// --- createUser Cloud Function (Callable) ---
// This function handles creating new users with specific roles.
// It MUST be called by an authenticated Admin or Manager.
exports.createUser = onRequest(
  {cors: true}, // Enable CORS for calling from your web app
  async (req, res) => {
    // 1. Authentication Check & Role Extraction
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      logger.error("Authentication Error: No ID token provided.");
      res.status(401).send({error: "Unauthorized: No token."});
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      logger.error("Authentication Error: Invalid ID token.", error);
      res.status(401).send({error: "Unauthorized: Invalid token."});
      return;
    }

    const callerUid = decodedToken.uid;
    // --- IMPORTANT: Ensure 'role' claim exists ---
    // If you haven't set roles for existing users (like your first admin user),
    // you might need to set it manually in Firebase Console > Auth > Users > Custom Claims
    // OR add a default role assumption here for testing.
    const callerRole = decodedToken.role || null; // Get role from custom claim, default null

    // --- TEMPORARY CHECK FOR TESTING ---
    // Remove this block once your admin user has the 'Admin' role claim set
    if (!callerRole) {
      logger.warn(`Caller UID ${callerUid} has no 'role' custom claim. Assuming 'Admin' for initial setup.`);
      // callerRole = 'Admin'; // Uncomment temporarily if needed for first deploy
    }
    // ------------------------------------


    logger.info(`createUser called by UID: ${callerUid}, Role: ${callerRole}`);

    // 2. Input Validation
    const {email, password, role: targetRole, projectId, firstName, lastName, dailyRate, designation, department, contactNumber} = req.body;

    if (!email || !password || !targetRole) {
      logger.error("Validation Error: Missing email, password, or role.");
      res.status(400).send({error: "Missing required fields: email, password, role."});
      return;
    }
    // Basic password check (Firebase has its own rules too)
    if (password.length < 6) {
      logger.error("Validation Error: Password too short.");
      res.status(400).send({error: "Password must be at least 6 characters long."});
      return;
    }

    const allowedRoles = ["Admin", "Manager", "Field Employee", "Office Staff"]; // Define valid roles
    if (!allowedRoles.includes(targetRole)) {
      logger.error("Validation Error: Invalid target role.", {targetRole});
      res.status(400).send({error: "Invalid role specified."});
      return;
    }

    // Validate project ID if role is Field Worker
    if (targetRole === "Field Employee" && !projectId) {
      logger.error("Validation Error: Project ID required for Field Employee.");
      res.status(400).send({error: "Project assignment is required for Field Workers."});
      return;
    }
    // Validate required employee fields if adding to Firestore
    if (!firstName || !lastName || !designation) {
      logger.error("Validation Error: Missing required employee details (firstName, lastName, designation).");
      res.status(400).send({error: "Missing required employee details: First Name, Last Name, Designation."});
      return;
    }


    // 3. Authorization Check (Who can create whom?)
    let authorized = false;
    if (callerRole === "Admin") {
      // Admin can create anyone
      authorized = true;
    } else if (callerRole === "Manager" && targetRole === "Field Employee") {
      // Manager can only create Field Employees
      authorized = true;
    }

    if (!authorized) {
      logger.error(`Authorization Error: Role '${callerRole}' cannot create role '${targetRole}'.`);
      res.status(403).send({error: "Forbidden: You do not have permission to create this user role."});
      return;
    }

    // 4. Create User in Firebase Authentication
    let newUserRecord;
    try {
      newUserRecord = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: false, // Or true, depending on your flow
        disabled: false,
      });
      logger.info(`Successfully created new user: ${newUserRecord.uid} with email: ${email}`);

      // 5. Set Custom Claim for the new user's role
      await admin.auth().setCustomUserClaims(newUserRecord.uid, {role: targetRole});
      logger.info(`Set custom claim 'role: ${targetRole}' for user: ${newUserRecord.uid}`);

      // 6. (Optional but Recommended) Add User to 'employees' Firestore Collection
      // Determine the correct path - THIS NEEDS TO MATCH YOUR APP.JSX LOGIC
      // Let's assume your appId isn't easily available here, so we use a simpler root collection
      // Ensure your Firestore rules allow the function (running as admin) to write here.
      const employeeCollectionPath = "employees"; // Simplified path - ADJUST IF NEEDED
      // OR if you can get appId reliably (e.g. env var):
      // const appId = process.env.YOUR_PROJECT_ID; // Requires setting env var during deploy or in console
      // const employeeCollectionPath = `artifacts/${appId}/public/data/employees`;

      const employeeData = {
        userId: newUserRecord.uid, // Link to Auth UID
        email: email,
        role: targetRole,
        firstName: firstName || "",
        lastName: lastName || "",
        dailyRate: Number(dailyRate) || 0,
        designation: designation || "",
        department: department || null, // Handle optional fields
        contactNumber: contactNumber || null,
        projectId: targetRole === "Field Employee" ? projectId : null, // Assign project only if Field Worker
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
        // Add other relevant fields from req.body
      };

      // Remove undefined fields before saving
      Object.keys(employeeData).forEach((key) => {
        if (employeeData[key] === undefined) {
          // Instead of deleting, set to null for Firestore compatibility? Depends on your needs.
          // delete employeeData[key];
          employeeData[key] = null; // Setting undefined to null might be safer
        }
      });

      // Use the Auth UID as the document ID for easy lookup
      await db.collection(employeeCollectionPath).doc(newUserRecord.uid).set(employeeData);
      logger.info(`Added/updated employee record in Firestore for user: ${newUserRecord.uid}`);


      // 7. Send Success Response
      res.status(201).send({
        success: true,
        uid: newUserRecord.uid,
        message: `User ${email} created successfully with role ${targetRole}.`,
      });
    } catch (error) {
      logger.error("Error during user creation process:", error);
      // Clean up if user was created but claims/Firestore failed
      if (newUserRecord && newUserRecord.uid) {
        try {
          await admin.auth().deleteUser(newUserRecord.uid);
          logger.warn(`Cleaned up partially created user: ${newUserRecord.uid}`);
        } catch (cleanupError) {
          logger.error(`Failed to cleanup user ${newUserRecord.uid}:`, cleanupError);
        }
      }
      // Provide more specific error messages if possible
      let userMessage = "Failed to create user.";
      if (error.code === "auth/email-already-exists") {
        userMessage = "Email address is already in use by another account.";
        res.status(409).send({error: userMessage}); // Conflict
      } else if (error.code === "auth/invalid-password") {
        userMessage = "Password is invalid (must be at least 6 characters).";
        res.status(400).send({error: userMessage});
      } else if (error.code === "auth/invalid-email") {
        userMessage = "The email address is badly formatted.";
        res.status(400).send({error: userMessage});
      } else {
        res.status(500).send({error: userMessage, details: error.message});
      }
      return; // Make sure function execution stops here on error
    }
  });

// End of index.js
