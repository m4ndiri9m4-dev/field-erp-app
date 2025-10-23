// Netlify function to create a Firebase user with custom claims and Firestore record
// Make sure to install firebase-admin in your ROOT project: npm install firebase-admin

const admin = require("firebase-admin");

// --- Initialize Firebase Admin SDK ---
// Securely load credentials from environment variable
let serviceAccount;
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 env var not set.");
  }
  const serviceAccountJson = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
    "base64"
  ).toString("utf-8");
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (e) {
  console.error("!!! Critical Error: Parsing Firebase service account key failed:", e.message);
  // Return structure expected by Netlify functions for internal server error
  // Log the error but return a generic message to the client
  return {
     statusCode: 500,
     body: JSON.stringify({ error: "Server configuration error. Check function logs." }),
  };
}


// Prevent duplicate initialization (important for Netlify's execution environment)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` // Usually not needed for Firestore v9+ Admin SDK
    });
     console.log("Firebase Admin SDK initialized successfully.");
  } catch (initError) {
      console.error("!!! Critical Error: Initializing Firebase Admin SDK failed:", initError);
       // Log the error but return a generic message to the client
       return {
          statusCode: 500,
          body: JSON.stringify({ error: "Server initialization error. Check function logs." }),
       };
  }
} else {
    console.log("Firebase Admin SDK already initialized.");
}

const db = admin.firestore();
const auth = admin.auth();
// Use your specific Firebase Project ID here or from env var
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "reportdashboard-c6f0d";


// --- Netlify Function Handler ---
exports.handler = async (event, context) => {
  // --- CORS Headers (CRITICAL for frontend calls) ---
  // Adjust origin in production for security!
  const headers = {
    "Access-Control-Allow-Origin": "*", // Or specific domain: "https://your-netlify-app.netlify.app"
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS", // Include OPTIONS for preflight
  };

  // Handle CORS preflight requests (sent by browser before actual POST)
  if (event.httpMethod === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return {
      statusCode: 204, // No Content
      headers,
      body: '',
    };
  }

  // Only allow POST requests for actual creation
  if (event.httpMethod !== "POST") {
    console.warn(`Method Not Allowed: Received ${event.httpMethod}`);
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { ...headers, Allow: "POST, OPTIONS" }, // Include Allow header for 405
    };
  }

  // 1. Authentication Check & Role Extraction (from caller)
  const idToken = event.headers.authorization?.split("Bearer ")[1];
  if (!idToken) {
    console.error("Authentication Error: No ID token provided.");
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized: No token provided." }),
      headers, // Include CORS headers in error responses too
    };
  }

  let decodedToken;
  let callerUid;
  let callerRole;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
    callerUid = decodedToken.uid;
    // IMPORTANT: Ensure you've set the 'role' custom claim for the calling user (e.g., Admin)
    callerRole = decodedToken.role || null;
    console.log(`createUser invoked by UID: ${callerUid}, Role: ${callerRole}`);

     // TEMPORARY CHECK FOR INITIAL ADMIN SETUP
     // Remove this section once your first Admin user has their role claim set via Firebase Console/CLI/another script
     if (!callerRole) {
         console.warn(`!!! WARNING: Caller UID ${callerUid} has no 'role' custom claim. FOR TESTING ONLY, assuming 'Admin'. Set claim properly for production!`);
         callerRole = 'Admin'; // TEMPORARY OVERRIDE
     }

  } catch (error) {
    console.error("Authentication Error: Invalid ID token.", error);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized: Invalid or expired token." }),
      headers,
    };
  }


  // 2. Input Validation
  let bodyData;
  try {
      bodyData = JSON.parse(event.body || "{}");
      console.log("Received data:", bodyData);
  } catch(parseError) {
       console.error("Error parsing request body:", parseError);
       return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body format." }), headers };
  }

  const {email, password, role: targetRole, projectId, firstName, lastName, dailyRate, designation, department, contactNumber} = bodyData;

  // Basic checks (add more specific validation as needed)
  if (!email || !password || !targetRole || !firstName || !lastName || !designation) {
    const missing = ["email", "password", "targetRole", "firstName", "lastName", "designation"].filter(f => !bodyData[f]);
    console.error("Validation Error: Missing required fields:", missing);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}.` }),
      headers,
    };
  }
   if (password.length < 6) {
      console.error("Validation Error: Password too short.");
      return { statusCode: 400, body: JSON.stringify({error: "Password must be at least 6 characters long."}), headers };
   }

  const allowedRoles = ["Admin", "Manager", "Field Employee", "Office Staff"];
  if (!allowedRoles.includes(targetRole)) {
    console.error("Validation Error: Invalid target role.", {targetRole});
    return { statusCode: 400, body: JSON.stringify({error: `Invalid role specified: ${targetRole}. Must be one of: ${allowedRoles.join(', ')}`}), headers };
  }

   if (targetRole === "Field Employee" && !projectId) {
       console.error("Validation Error: Project ID required for Field Employee.");
       return { statusCode: 400, body: JSON.stringify({error: "Project assignment is required for Field Workers."}), headers };
   }


  // 3. Authorization Check
  let authorized = false;
  if (callerRole === "Admin") {
    authorized = true;
  } else if (callerRole === "Manager" && targetRole === "Field Employee") {
    // Optional: Add check if manager actually manages the assigned projectId
    authorized = true;
  }

  if (!authorized) {
    console.error(`Authorization Error: Role '${callerRole}' attempted to create role '${targetRole}'. Denied.`);
    return {
      statusCode: 403, // Forbidden
      body: JSON.stringify({ error: "Forbidden: Your role does not have permission to create this type of user." }),
      headers,
    };
  }

  // 4. Create User in Firebase Auth & Firestore
  let newUserRecord = null; // Initialize to null
  try {
    // Create Auth user
    newUserRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // Or true if you have verification flow
      displayName: `${firstName} ${lastName}`, // Set display name
      disabled: false,
    });
    console.log(`Successfully created new auth user: ${newUserRecord.uid} with email: ${email}`);

    // Set Custom Claim for role
    await auth.setCustomUserClaims(newUserRecord.uid, { role: targetRole });
    console.log(`Set custom claim 'role: ${targetRole}' for user: ${newUserRecord.uid}`);

    // Add to Firestore 'employees' collection
    // IMPORTANT: Ensure this path structure matches your App.jsx structure EXACTLY
    // Using firebaseProjectId ensures it uses the correct project ID dynamically
    const employeeCollectionPath = `artifacts/${firebaseProjectId}/public/data/employees`;
    console.log(`Attempting to write to Firestore path: ${employeeCollectionPath}/${newUserRecord.uid}`);

    const employeeData = {
      // Use Auth UID as Firestore doc ID for easy lookup
      // id: newUserRecord.uid, // We use the doc ID itself, no need for an 'id' field
      userId: newUserRecord.uid, // Link back to Auth UID
      email: email.toLowerCase(), // Store emails consistently
      role: targetRole,
      firstName: firstName || "",
      lastName: lastName || "",
      dailyRate: Number(dailyRate) || 0,
      designation: designation || "",
      department: department || null, // Use null for potentially empty fields
      contactNumber: contactNumber || null,
      projectId: targetRole === "Field Employee" ? projectId : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      // profilePhoto: null, // Add if needed
      // middleName: null, // Add if needed
    };

    // Remove any explicitly undefined fields before saving
     const cleanedEmployeeData = {};
     for (const key in employeeData) {
       if (employeeData[key] !== undefined) {
         cleanedEmployeeData[key] = employeeData[key];
       }
     }

    // Use Auth UID as Firestore doc ID
    await db.collection(employeeCollectionPath).doc(newUserRecord.uid).set(cleanedEmployeeData);
    console.log(`Added/updated employee record in Firestore for user: ${newUserRecord.uid}`);

    // 5. Send Success Response
    console.log("User creation successful.");
    return {
      statusCode: 201, // Created
      body: JSON.stringify({
        success: true,
        uid: newUserRecord.uid,
        message: `User ${email} created successfully with role ${targetRole}.`,
      }),
      headers,
    };

  } catch (error) {
    console.error("!!! Error during user creation process:", error);

    // --- Error Handling & Cleanup ---
    // If Auth user was created but Firestore failed, delete the Auth user
    if (newUserRecord && newUserRecord.uid) {
      console.warn(`Attempting to clean up partially created auth user: ${newUserRecord.uid}`);
      try {
        await auth.deleteUser(newUserRecord.uid);
        console.log(`Cleaned up partially created auth user: ${newUserRecord.uid}`);
      } catch (cleanupError) {
        // Log cleanup error, but don't mask the original error
        console.error(`!!! CRITICAL: Failed to cleanup partially created user ${newUserRecord.uid}. Manual cleanup required.`, cleanupError);
      }
    }

    // Handle specific Firebase Auth errors gracefully for the client
    let userMessage = "An unexpected error occurred while creating the user.";
    let statusCode = 500; // Internal Server Error default
     if (error.code === 'auth/email-already-exists') {
         userMessage = "This email address is already in use by another account.";
         statusCode = 409; // Conflict
     } else if (error.code === 'auth/invalid-password') {
         userMessage = "Password is invalid (must be at least 6 characters).";
          statusCode = 400; // Bad Request
     } else if (error.code === 'auth/invalid-email') {
         userMessage = "The email address is badly formatted.";
          statusCode = 400; // Bad Request
     } else if (error.code === 'auth/internal-error' || error.message.includes('firestore')) {
        // More generic error if it seems related to backend services
         userMessage = "A server error occurred while saving user data. Please try again later.";
         statusCode = 500;
     }
     // Add more specific error code handling if needed

    // Log the detailed error on the server, return a user-friendly message
    console.error(`Responding with status ${statusCode}: ${userMessage}`);
    return {
      statusCode: statusCode,
      body: JSON.stringify({ error: userMessage }), // Don't expose detailed error message to client
      headers,
    };
  }
};

