# Google Docs Font Formatting Guide

## ✅ You Have Full Read/Write Access!

**Current Scopes:**

- ✅ `https://www.googleapis.com/auth/documents` - Read/write Google Docs
- ✅ `https://www.googleapis.com/auth/drive` - Full Drive access

**These scopes allow:**

- ✅ Reading documents
- ✅ Writing/updating documents
- ✅ Formatting text (fonts, styles, colors)
- ✅ Creating new documents
- ✅ Copying documents

---

## 🎨 Font Formatting Capabilities

I've added a new `format_text` tool to the MCP server that allows you to:

### Available Formatting Options

1. **Bold** - Make text bold
2. **Italic** - Make text italic
3. **Font Size** - Set font size in points (e.g., 12, 14, 16)
4. **Font Family** - Change font (e.g., "Arial", "Times New Roman", "Calibri")
5. **Text Color** - Set text color (RGB values)

---

## 🔧 How to Use Font Formatting

### Method 1: Using the `format_text` Tool

**Via MCP (in your code):**

```typescript
await callMCPTool(mcpClient, "format_text", {
  documentId: "your-doc-id",
  startIndex: 0, // Start position
  endIndex: 10, // End position (exclusive)
  bold: true, // Make bold
  fontSize: 14, // Set font size to 14pt
  fontFamily: "Arial", // Change font
});
```

**Example: Make heading bold and larger:**

```typescript
await callMCPTool(mcpClient, "format_text", {
  documentId: docId,
  startIndex: 0,
  endIndex: 20, // First 20 characters
  bold: true,
  fontSize: 16,
  fontFamily: "Calibri",
});
```

**Example: Change text color:**

```typescript
await callMCPTool(mcpClient, "format_text", {
  documentId: docId,
  startIndex: 0,
  endIndex: 50,
  foregroundColor: {
    red: 0.2, // 0-1 range
    green: 0.4,
    blue: 0.8,
  },
});
```

### Method 2: Automatic Formatting

The `update_google_doc` tool now **automatically formats headings**:

- Lines that are ALL CAPS and short (< 50 chars) → **Bold + 14pt**
- This makes resumes look more professional automatically

---

## 📋 Formatting Examples

### Example 1: Format Resume Heading

```typescript
// Make "JOHN DOE" bold and larger
await callMCPTool(mcpClient, "format_text", {
  documentId: resumeId,
  startIndex: 0,
  endIndex: 8, // "JOHN DOE"
  bold: true,
  fontSize: 18,
  fontFamily: "Calibri",
});
```

### Example 2: Format Section Headers

```typescript
// Format "EXPERIENCE" section header
await callMCPTool(mcpClient, "format_text", {
  documentId: resumeId,
  startIndex: 100,
  endIndex: 110, // "EXPERIENCE"
  bold: true,
  fontSize: 14,
  italic: false,
});
```

### Example 3: Format Contact Info

```typescript
// Make email address blue
await callMCPTool(mcpClient, "format_text", {
  documentId: resumeId,
  startIndex: 50,
  endIndex: 80, // Email address
  foregroundColor: {
    red: 0.0,
    green: 0.4,
    blue: 0.8, // Blue color
  },
});
```

---

## 🎯 Common Font Formatting Tasks

### Make Text Bold

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  bold: true,
});
```

### Make Text Italic

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  italic: true,
});
```

### Change Font Size

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  fontSize: 16, // 16 points
});
```

### Change Font Family

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  fontFamily: "Times New Roman",
});
```

### Change Text Color

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  foregroundColor: {
    red: 1.0, // Red
    green: 0.0,
    blue: 0.0,
  },
});
```

### Combine Multiple Formats

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 20,
  bold: true,
  italic: false,
  fontSize: 16,
  fontFamily: "Calibri",
  foregroundColor: {
    red: 0.0,
    green: 0.0,
    blue: 0.8, // Blue
  },
});
```

---

## 📊 Supported Font Families

Common fonts available in Google Docs:

- **Arial**
- **Calibri** (default)
- **Times New Roman**
- **Georgia**
- **Verdana**
- **Courier New**
- **Comic Sans MS**
- **Trebuchet MS**
- And more...

---

## 🎨 Color Reference

**RGB values are 0-1 range:**

| Color     | Red | Green | Blue |
| --------- | --- | ----- | ---- |
| Black     | 0.0 | 0.0   | 0.0  |
| White     | 1.0 | 1.0   | 1.0  |
| Red       | 1.0 | 0.0   | 0.0  |
| Green     | 0.0 | 1.0   | 0.0  |
| Blue      | 0.0 | 0.0   | 1.0  |
| Dark Blue | 0.0 | 0.4   | 0.8  |
| Gray      | 0.5 | 0.5   | 0.5  |

---

## 🔍 Finding Text Positions

To format specific text, you need to know its position in the document:

```typescript
// First, read the document to find text positions
const readResult = await callMCPTool(mcpClient, "read_google_doc", {
  documentId: docId,
});

const content = readResult.content[0].text;
const searchText = "EXPERIENCE";
const startIndex = content.indexOf(searchText);
const endIndex = startIndex + searchText.length;

// Now format it
await callMCPTool(mcpClient, "format_text", {
  documentId: docId,
  startIndex,
  endIndex,
  bold: true,
  fontSize: 14,
});
```

---

## ⚙️ Integration with Resume Agent

The resume agent can now format resumes automatically:

```typescript
// In update-resume.ts, after updating content:
// Format headings automatically
const lines = updatedContent.split("\n");
let index = 1; // After insert

for (const line of lines) {
  if (isHeading(line)) {
    await callMCPTool(mcpClient, "format_text", {
      documentId: copiedResumeId,
      startIndex: index,
      endIndex: index + line.length,
      bold: true,
      fontSize: 14,
    });
  }
  index += line.length + 1; // +1 for newline
}
```

---

## ✅ Verification

### Check Your Scopes

Your OAuth scopes include:

```typescript
"https://www.googleapis.com/auth/documents"; // ✅ Read/write Docs
"https://www.googleapis.com/auth/drive"; // ✅ Full Drive access
```

**These scopes allow full formatting access!**

### Test Formatting

```bash
# Test via MCP server
npm run mcp:test

# Or test via Resume Agent
npm run resume:cli
```

---

## 📚 Google Docs API Documentation

- **Text Formatting:** https://developers.google.com/docs/api/how-tos/format-text
- **UpdateTextStyle:** https://developers.google.com/docs/api/reference/rest/v1/documents/request#UpdateTextStyleRequest
- **TextStyle:** https://developers.google.com/docs/api/reference/rest/v1/documents#TextStyle

---

## 🎉 Summary

**You have full access to:**

- ✅ Read Google Docs
- ✅ Write/update Google Docs
- ✅ Format fonts (bold, italic, size, family, color)
- ✅ Create and copy documents

**New capabilities added:**

- ✅ `format_text` tool for manual formatting
- ✅ Automatic heading formatting in `update_google_doc`
- ✅ Support for all common font properties

**Everything is ready!** You can now format resumes with proper fonts, sizes, and styles! 🎨
