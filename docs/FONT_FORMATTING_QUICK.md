# Font Formatting - Quick Guide

## ✅ You Have Full Access!

**Scopes:** ✅ Already configured

- `https://www.googleapis.com/auth/documents` - Read/write Docs
- `https://www.googleapis.com/auth/drive` - Full Drive access

**You can:**

- ✅ Read Google Docs
- ✅ Write/update Google Docs
- ✅ Format fonts (bold, italic, size, color, family)

---

## 🎨 New Formatting Tool

**Tool:** `format_text`

**Usage:**

```typescript
await callMCPTool(mcpClient, "format_text", {
  documentId: "doc-id",
  startIndex: 0, // Start position
  endIndex: 10, // End position
  bold: true, // Make bold
  fontSize: 14, // Font size in points
  fontFamily: "Arial", // Font name
  italic: true, // Make italic
  foregroundColor: {
    // Text color (RGB 0-1)
    red: 0.0,
    green: 0.4,
    blue: 0.8,
  },
});
```

---

## 📋 Common Examples

### Make Text Bold

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 10,
  bold: true,
});
```

### Change Font Size

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 20,
  fontSize: 16, // 16 points
});
```

### Change Font Family

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 20,
  fontFamily: "Times New Roman",
});
```

### Make Heading (Bold + Larger)

```typescript
format_text({
  documentId: docId,
  startIndex: 0,
  endIndex: 20,
  bold: true,
  fontSize: 16,
  fontFamily: "Calibri",
});
```

---

## ✨ Automatic Formatting

The `update_google_doc` tool now **automatically formats headings**:

- ALL CAPS lines → **Bold + 14pt**
- Makes resumes look professional automatically!

---

## 🎯 Quick Reference

| Format          | Property                  | Example                                        |
| --------------- | ------------------------- | ---------------------------------------------- |
| **Bold**        | `bold: true`              | `bold: true`                                   |
| **Italic**      | `italic: true`            | `italic: true`                                 |
| **Font Size**   | `fontSize: number`        | `fontSize: 14`                                 |
| **Font Family** | `fontFamily: string`      | `fontFamily: "Arial"`                          |
| **Color**       | `foregroundColor: object` | `foregroundColor: {red: 0, green: 0, blue: 1}` |

---

## ✅ Ready to Use!

Everything is configured. You can now:

1. Read/write Google Docs ✅
2. Format fonts ✅
3. Fix font styles ✅

See `docs/GOOGLE_DOCS_FONT_FORMATTING.md` for complete guide!
