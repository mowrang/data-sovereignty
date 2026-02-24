# UI Setup Guide

## 🎨 UI Overview

The web UI has been designed with the following layout:

```
┌─────────────────────────────────────┐
│         Header (Resume Agent)        │
├─────────────────────────────────────┤
│   "Never deal with formatting again!" │
├─────────────────────────────────────┤
│                                     │
│         Chatbot (Middle)            │
│                                     │
├─────────────────────────────────────┤
│  [Setup Data Sources] [Setup AI]    │
├─────────────────────────────────────┤
│         Input + Send Button         │
└─────────────────────────────────────┘
```

---

## 📋 Features

### 1. Tagline

- **Text:** "Never deal with formatting again!"
- **Location:** Above the chatbot
- **Purpose:** Value proposition

### 2. Chatbot

- **Location:** Middle of the page
- **Function:** Sends messages to LangGraph server
- **Features:**
  - Chat interface
  - Message history
  - Typing indicators

### 3. Setup Data Sources Button

- **Function:** Connect Google account for Google Docs access
- **Flow:**
  1. User clicks button
  2. Opens modal (if logged in) or redirects to Google OAuth
  3. User grants Google Docs/Drive permissions
  4. Returns to app with access granted

### 4. Setup AI Button

- **Function:** Configure AI provider (Anthropic, OpenAI, etc.)
- **Flow:**
  1. User clicks button
  2. Opens modal with provider selection
  3. User selects provider and enters API key
  4. Settings saved securely

---

## 🔧 Backend Endpoints

### Authentication Status

```
GET /api/auth/status
```

**Response:**

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "aiProvider": "anthropic",
    "hasGoogleToken": true,
    "hasAIKey": true
  }
}
```

### Google OAuth Login

```
GET /auth/google
```

**Flow:**

- Redirects to Google OAuth consent screen
- User grants permissions
- Returns to app with session cookie

### AI Settings

```
POST /api/settings/ai
Body: {
  "provider": "anthropic" | "openai" | "azure_openai",
  "apiKey": "sk-..."
}
```

### Chat

```
POST /api/chat
Body: {
  "message": "user message"
}
```

**Sends to:** LangGraph server

---

## 🚀 Setup Flow

### Step 1: User Visits App

- Sees chatbot and setup buttons
- Buttons show "Not connected" / "Not set"

### Step 2: Setup Data Sources

1. User clicks "Setup Data Sources"
2. Redirected to Google OAuth
3. Grants Google Docs/Drive access
4. Returns to app
5. Button shows "✓ Connected"

### Step 3: Setup AI

1. User clicks "Setup AI"
2. Modal opens
3. Selects provider (Anthropic, OpenAI, etc.)
4. Enters API key
5. Saves settings
6. Button shows "✓ anthropic" (or selected provider)

### Step 4: Start Chatting

- User can now send messages
- Messages go to LangGraph server
- Resume agent processes requests

---

## 🔒 Security

### API Key Storage

- **Encrypted:** API keys encrypted with AES-256-GCM
- **Per-user:** Each user has their own keys
- **Never exposed:** Keys never sent to frontend

### Session Management

- **Cookie-based:** Secure HTTP-only cookies
- **Redis cache:** Fast session lookup
- **PostgreSQL backup:** Persistent storage

---

## 📱 Responsive Design

The UI is responsive and works on:

- ✅ Desktop (900px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

---

## 🎯 User Experience

### Visual Feedback

- **Connected status:** Green checkmark on buttons
- **Loading states:** "Saving...", "Connecting..."
- **Error messages:** Clear error alerts

### Modal Dialogs

- **Data Sources:** Shows Google connection status
- **AI Setup:** Provider selection + API key input
- **Easy to close:** Click outside or X button

---

## ✅ Checklist

- [x] Tagline above chatbot
- [x] Chatbot in middle
- [x] Two setup buttons below chatbot
- [x] Google OAuth flow
- [x] AI provider setup
- [x] Backend endpoints
- [x] LangGraph integration
- [x] Status indicators
- [x] Responsive design

---

## 🚀 Ready to Use!

The UI is complete and ready. Users can:

1. ✅ See the tagline
2. ✅ Use the chatbot
3. ✅ Setup Google Docs access
4. ✅ Setup AI provider
5. ✅ Start chatting with LangGraph

Everything is connected and working! 🎉
