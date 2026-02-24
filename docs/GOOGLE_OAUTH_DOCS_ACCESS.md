# Google OAuth & Google Docs Access

## ✅ Yes, Google OAuth Allows Access to Google Docs!

**Short Answer:** Yes, but you need to request the right **scopes** during OAuth.

---

## 🔐 Required Scopes

Your application already requests the correct scopes:

```typescript
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email", // User email
  "https://www.googleapis.com/auth/userinfo.profile", // User profile
  "https://www.googleapis.com/auth/documents", // ✅ Google Docs access
  "https://www.googleapis.com/auth/drive", // ✅ Google Drive access
];
```

---

## 📋 What Each Scope Does

### 1. `userinfo.email` & `userinfo.profile`

- **Purpose:** User authentication
- **Access:** User's email and basic profile info
- **Used for:** Login, user identification

### 2. `https://www.googleapis.com/auth/documents` ✅

- **Purpose:** Google Docs API access
- **Access:** Read and write Google Docs
- **Used for:**
  - Reading resume content
  - Updating resume content
  - Creating new documents
  - Modifying existing documents

### 3. `https://www.googleapis.com/auth/drive` ✅

- **Purpose:** Google Drive API access
- **Access:** Full Drive access (read, copy, create)
- **Used for:**
  - Copying documents
  - Creating new documents
  - Reading document metadata
  - Managing file permissions

---

## 🔄 How It Works

### Step 1: User Logs In

```
User clicks "Login with Google"
  ↓
Redirected to Google OAuth consent screen
  ↓
Google shows: "This app wants to access your Google Docs"
  ↓
User grants permission
  ↓
Google returns authorization code
```

### Step 2: Exchange Code for Tokens

```typescript
// Your code does this:
const { tokens } = await oauth2Client.getToken(code);
// tokens.refresh_token is stored securely
```

### Step 3: Use Tokens to Access Docs

```typescript
// MCP server uses refresh token to access Docs API
oauth2Client.setCredentials({
  refresh_token: user.refresh_token,
});

const docs = google.docs({ version: "v1", auth: oauth2Client });
// Now you can read/write Google Docs!
```

---

## ✅ What Your App Can Do

With these scopes, your application can:

1. **Read Google Docs**

   - Read resume content
   - Get document structure
   - Read comments

2. **Write to Google Docs**

   - Update resume content
   - Add/remove text
   - Format text

3. **Create Google Docs**

   - Create new resumes
   - Copy existing documents
   - Create tailored versions

4. **Access Google Drive**
   - List documents
   - Copy files
   - Manage permissions

---

## 🔒 Security & Permissions

### What Users See

When users log in, Google shows them:

```
This app wants to:
✓ See your email address
✓ See your personal info
✓ See, edit, create, and delete your Google Docs documents
✓ See, edit, create, and delete all of your Google Drive files
```

### User Control

- ✅ Users can **revoke access** anytime in Google Account settings
- ✅ Users can **see what's accessed** in Google security dashboard
- ✅ Access is **per-user** (each user grants their own permission)

---

## 📝 Current Implementation

### In `src/auth/auth-server.ts`:

```typescript
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/documents", // ✅ Docs access
  "https://www.googleapis.com/auth/drive", // ✅ Drive access
];

// Request these scopes during OAuth
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // Get refresh token
  scope: scopes,
  prompt: "consent", // Force consent screen
});
```

### In `mcp-google-docs/server.ts`:

```typescript
// Uses refresh token to access Docs API
oauth2Client.setCredentials({
  refresh_token: refreshToken,
});

this.docs = google.docs({ version: "v1", auth: oauth2Client });
this.drive = google.drive({ version: "v3", auth: oauth2Client });
```

---

## ⚠️ Important Notes

### 1. Refresh Token Required

**For offline access (server-side), you need:**

- `access_type: "offline"` ✅ (already set)
- `prompt: "consent"` ✅ (already set)
- Refresh token stored securely ✅ (encrypted in database)

### 2. Scope Limitations

**What you CAN'T do:**

- ❌ Access other users' documents (only the user who logged in)
- ❌ Access documents not owned/shared with the user
- ❌ Bypass Google's security settings

**What you CAN do:**

- ✅ Access user's own documents
- ✅ Access documents shared with the user
- ✅ Create new documents in user's Drive

### 3. Token Expiration

**Access tokens expire** (usually 1 hour)

- **Refresh tokens don't expire** (unless revoked)
- Your code automatically refreshes access tokens using refresh token ✅

---

## 🧪 Testing

### Verify Scopes Are Working

1. **User logs in** → Check Google consent screen shows Docs/Drive permissions
2. **Try reading a doc** → Should work if scopes are correct
3. **Check token** → Refresh token should be stored in database

### Common Issues

**Problem:** "Insufficient permissions"

- **Solution:** Make sure scopes include `documents` and `drive`

**Problem:** "No refresh token"

- **Solution:** Set `access_type: "offline"` and `prompt: "consent"` ✅

**Problem:** "Token expired"

- **Solution:** Use refresh token to get new access token ✅ (already implemented)

---

## 📚 Google API Documentation

- **Google Docs API:** https://developers.google.com/docs/api
- **Google Drive API:** https://developers.google.com/drive/api
- **OAuth Scopes:** https://developers.google.com/identity/protocols/oauth2/scopes

---

## ✅ Summary

**Yes, Google OAuth allows access to Google Docs!**

**Your app already has:**

- ✅ Correct scopes requested (`documents` + `drive`)
- ✅ Refresh token stored securely
- ✅ Automatic token refresh
- ✅ Per-user access (each user's own docs)

**What users grant:**

- Access to their Google Docs
- Access to their Google Drive
- Ability to read/write documents

**Security:**

- Users can revoke access anytime
- Access is per-user (isolated)
- Tokens are encrypted in database

**Everything is configured correctly!** 🎉
