# Product Requirements Document (PRD)

## Multi-Source Resume Optimization Platform

**Version:** 1.0  
**Date:** February 9, 2026  
**Status:** Active Development

---

## 1. Executive Summary

### 1.1 Product Vision

A scalable, AI-powered resume optimization platform that allows users to store and update their resumes from multiple data sources (Google Docs, Microsoft OneDrive, local files) while maintaining document formatting and providing intelligent job recommendations.

### 1.2 Key Value Propositions

- **Never deal with formatting again** - Automatic formatting preservation across all data sources
- **Multi-source flexibility** - Use Google Docs, Microsoft OneDrive, or upload files directly
- **AI-powered optimization** - Intelligent resume tailoring based on job descriptions
- **Job recommendations** - Automatic job suggestions based on the job description the applicant is tailoring their resume for (shows similar jobs)
- **Seamless integration** - Clear separation between AI processing and data storage

### 1.3 Target Users

- **Primary:** Job seekers actively applying to multiple positions
- **Secondary:** Career changers needing resume updates
- **Tertiary:** Recruiters and hiring managers (future)

---

## 2. Product Overview

### 2.1 Core Features

#### 2.1.1 Multi-Source Resume Storage

- Support for Google Docs (fully implemented)
- Support for Microsoft OneDrive / Word Online (partially implemented)
- Support for local file uploads (.docx, .pdf, .txt, .md)
- Future: Dropbox, Box, AWS S3, GitHub Gists

#### 2.1.2 AI-Powered Resume Optimization

- Read resume from any supported source
- Tailor resume content based on job descriptions provided by the user
- **Job recommendation trigger**: When user tailors resume for a specific job description, automatically find and display similar jobs
- Preserve original formatting (fonts, styles, structure)
- Generate multiple versions for different job applications

#### 2.1.3 Job Recommendations

- **Primary recommendation source**: When an applicant tailors their resume based on a specific job description, automatically show similar jobs based on that job description
- Context-aware matching: Extract keywords, skills, and requirements from the job description being used for resume tailoring
- History-based recommendations: Show jobs based on past job descriptions the user has tailored resumes for
- Location-aware job matching: Consider location preferences from job descriptions
- Integration with job boards (Adzuna, Indeed, ZipRecruiter)

#### 2.1.4 User Management

- Google OAuth authentication (no separate username/password)
- Per-user AI account configuration (Anthropic, OpenAI)
- User history tracking (job descriptions, resume updates)
- Session management with Redis and PostgreSQL

### 2.2 Architecture Principles

#### 2.2.1 Separation of Concerns

```
┌─────────────────┐
│  Resume Agent   │  ← AI Processing Layer
│   (LangGraph)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MCP Server    │  ← Interface Layer (Model Context Protocol)
│  (Abstraction)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│DataSourceManager│  ← Data Source Abstraction
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ▼         ▼          ▼         ▼
┌────────┐ ┌─────────┐ ┌──────┐ ┌──────┐
│ Google │ │Microsoft│ │Local │ │Future│
│  Docs  │ │OneDrive │ │Files │ │Sources│
└────────┘ └─────────┘ └──────┘ └──────┘
```

**Key Principle:** Clear separation between AI processing (Resume Agent) and data storage (Data Sources) via MCP interface.

#### 2.2.2 Formatting Preservation

- **Requirement:** Original document formatting must be preserved
- **Implementation:**
  - Google Docs: Use Google Docs API formatting features
  - Microsoft OneDrive: Use Microsoft Word API formatting
  - Local Files: Parse and preserve formatting from .docx/.pdf files

---

## 3. Functional Requirements

### 3.1 Data Source Management

#### FR-1: Google Docs Integration

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Read documents from Google Docs
  - Copy documents with new titles
  - Update document content
  - Format text (bold, italic, font size, color)
  - Get comments from documents
  - OAuth 2.0 authentication
  - Preserve Google Docs formatting

#### FR-2: Microsoft OneDrive Integration

- **Priority:** P0 (Critical)
- **Status:** ⚠️ Partially Implemented
- **Requirements:**
  - Read Word documents (.docx) from OneDrive/SharePoint
  - Parse Word document content (using mammoth library)
  - Copy documents with new titles
  - Update document content while preserving formatting
  - Format text using Microsoft Word API
  - Get comments from documents
  - OAuth 2.0 authentication
  - Preserve Microsoft Word formatting

#### FR-3: Local File Upload

- **Priority:** P1 (High)
- **Status:** ⚠️ Basic Implementation
- **Requirements:**
  - Upload resume files (.docx, .pdf, .txt, .md)
  - Parse .docx files (using mammoth)
  - Parse .pdf files (using pdf-parse)
  - Store files securely (cloud storage: S3/Azure)
  - Read uploaded files
  - Update file content
  - Preserve formatting where possible
  - Support file versioning

#### FR-4: Data Source Selection

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Requirements:**
  - Users can select preferred data source
  - Auto-detect provider from document URL
  - Support multiple connected sources per user
  - Switch between sources seamlessly

### 3.2 Resume Processing

#### FR-5: Resume Reading

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Read resume from any supported source
  - Extract text content
  - Preserve document structure
  - Handle authentication automatically
  - Cache resume content for performance

#### FR-6: Resume Copying

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Create copy of resume with new title
  - Preserve all formatting
  - Generate unique document IDs
  - Return document URL for access

#### FR-7: Resume Updating

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Update resume content based on job description
  - Preserve original formatting
  - Apply automatic heading formatting
  - Support incremental updates
  - Track update history

#### FR-8: Formatting Preservation

- **Priority:** P0 (Critical)
- **Status:** ⚠️ Partial
- **Requirements:**
  - Preserve fonts, sizes, colors
  - Preserve bold/italic formatting
  - Preserve document structure (headings, paragraphs)
  - Preserve lists and tables
  - Handle formatting across different providers

### 3.3 Job Recommendations

#### FR-9: Automatic Job Recommendations

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Requirements:**
  - **Primary trigger**: When user tailors resume based on a job description, automatically show similar jobs based on that specific job description
  - Extract keywords, skills, and requirements from the job description being used for resume tailoring
  - Show recommendations immediately after resume update completes
  - Match score calculation based on job description similarity
  - Location-aware recommendations (extract location from job description if available)
  - Integration with multiple job boards (Adzuna, Indeed, ZipRecruiter)
  - Display recommendations automatically in UI (no button click required)

#### FR-10: History-Based Recommendations

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Requirements:**
  - Track user job descriptions
  - Track resume update history
  - Extract keywords from job descriptions
  - Provide personalized recommendations

### 3.4 User Management

#### FR-11: Authentication

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Google OAuth login
  - No separate username/password
  - Session management
  - Secure token storage (encrypted)

#### FR-12: AI Configuration

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Requirements:**
  - Configure Anthropic API key
  - Configure OpenAI API key
  - Per-user AI preferences
  - Secure key storage (encrypted)

#### FR-13: Data Source Configuration

- **Priority:** P1 (High)
- **Status:** ⚠️ Partial
- **Requirements:**
  - Connect Google account
  - Connect Microsoft account
  - Upload local files
  - Manage connected sources
  - Set default data source

---

## 4. Technical Requirements

### 4.1 Architecture Requirements

#### TR-1: MCP Server as Interface Layer

- **Requirement:** MCP server must act as the interface between Resume Agent and Data Sources
- **Rationale:** Clear separation of concerns, allows AI to work with any data source
- **Implementation:**
  - MCP server uses DataSourceManager
  - MCP tools map to DataSource operations
  - Resume Agent only interacts with MCP, not data sources directly

#### TR-2: Data Source Abstraction

- **Requirement:** All data sources must implement IDataSource interface
- **Rationale:** Consistent API across all providers
- **Implementation:**
  - IDataSource interface defines contract
  - DataSourceManager routes requests
  - Each provider implements interface independently

#### TR-3: Formatting Preservation

- **Requirement:** Formatting must be preserved across all operations
- **Rationale:** User expectation - "Never deal with formatting again"
- **Implementation:**
  - Google Docs: Use Google Docs API formatting
  - Microsoft: Use Microsoft Word API formatting
  - Local Files: Parse and preserve formatting metadata

### 4.2 Performance Requirements

#### TR-4: Response Time

- **Requirement:** Resume read operations < 2 seconds
- **Requirement:** Resume update operations < 10 seconds
- **Requirement:** Job recommendations < 3 seconds

#### TR-5: Scalability

- **Requirement:** Support 100+ concurrent users
- **Requirement:** Handle 1000+ resume updates per day
- **Requirement:** Cache frequently accessed documents

### 4.3 Security Requirements

#### TR-6: Data Encryption

- **Requirement:** Encrypt all stored tokens (AES-256-GCM)
- **Requirement:** Encrypt API keys
- **Requirement:** Use HTTPS for all communications

#### TR-7: Authentication

- **Requirement:** OAuth 2.0 for all external providers
- **Requirement:** Secure session management
- **Requirement:** Token refresh handling

### 4.4 Reliability Requirements

#### TR-8: Error Handling

- **Requirement:** Graceful degradation if data source unavailable
- **Requirement:** Retry logic for transient failures
- **Requirement:** Clear error messages to users

#### TR-9: Data Backup

- **Requirement:** Backup user data regularly
- **Requirement:** Support data recovery
- **Requirement:** Version control for documents

---

## 5. User Experience Requirements

### 5.1 UI/UX Requirements

#### UX-1: Setup Flow

- **Requirement:** Simple 2-button setup ("Setup Data Sources", "Setup AI")
- **Requirement:** Clear instructions for each step
- **Requirement:** Visual feedback for connected sources

#### UX-2: Resume Update Flow

- **Requirement:** Natural language chat interface
- **Requirement:** User provides job description they want to tailor resume for
- **Requirement:** Show progress during processing
- **Requirement:** Display updated resume URL
- **Requirement:** Automatically show similar jobs based on the job description used for resume tailoring

#### UX-3: Job Recommendations

- **Requirement:** Automatic display when user tailors resume for a job description (no button click needed)
- **Requirement:** Show recommendations based on the job description being used for resume tailoring
- **Requirement:** Display match scores indicating similarity to the job description
- **Requirement:** Show header indicating "Related Jobs (Based on your resume update)" or similar
- **Requirement:** One-click apply functionality
- **Requirement:** Filter by location, salary, etc.

### 5.2 Accessibility Requirements

#### UX-4: Accessibility

- **Requirement:** WCAG 2.1 AA compliance
- **Requirement:** Keyboard navigation support
- **Requirement:** Screen reader compatibility

---

## 6. Integration Requirements

### 6.1 External Services

#### INT-1: Job Board APIs

- **Adzuna** - ✅ Integrated
- **Indeed** - Planned
- **ZipRecruiter** - Planned

#### INT-2: AI Services

- **Anthropic Claude** - ✅ Integrated
- **OpenAI GPT** - ✅ Integrated

#### INT-3: Cloud Storage

- **AWS S3** - Planned (for local file storage)
- **Azure Blob** - Planned

### 6.2 API Requirements

#### INT-4: REST API

- **Requirement:** RESTful API design
- **Requirement:** JSON request/response format
- **Requirement:** Rate limiting
- **Requirement:** API versioning

---

## 7. Data Requirements

### 7.1 Data Storage

#### DATA-1: User Data

- User profiles (encrypted tokens)
- AI configuration
- Data source preferences
- Session data

#### DATA-2: Resume Data

- Resume content (cached)
- Document metadata
- Update history
- Formatting information

#### DATA-3: Job Data

- Job descriptions
- Application history
- Recommendation history
- Click tracking

### 7.2 Data Privacy

#### DATA-4: Privacy

- **Requirement:** GDPR compliance
- **Requirement:** User data deletion
- **Requirement:** Data export functionality
- **Requirement:** Privacy policy

---

## 8. Non-Functional Requirements

### 8.1 Performance

- **NFR-1:** Page load time < 2 seconds
- **NFR-2:** API response time < 500ms (p95)
- **NFR-3:** Support 1000+ concurrent users

### 8.2 Reliability

- **NFR-4:** 99.9% uptime
- **NFR-5:** Automatic failover
- **NFR-6:** Error recovery

### 8.3 Maintainability

- **NFR-7:** Comprehensive unit tests (>80% coverage)
- **NFR-8:** Documentation for all components
- **NFR-9:** Code review process

---

## 9. Success Metrics

### 9.1 User Metrics

- **SM-1:** Number of active users
- **SM-2:** Resume updates per user per month
- **SM-3:** Job applications through platform
- **SM-4:** User retention rate

### 9.2 Technical Metrics

- **SM-5:** API response times
- **SM-6:** Error rates
- **SM-7:** Data source usage distribution
- **SM-8:** Cache hit rates

### 9.3 Business Metrics

- **SM-9:** Revenue from job board clicks
- **SM-10:** Cost per user
- **SM-11:** User acquisition cost

---

## 10. Roadmap

### 10.1 Phase 1: Core Functionality (Current)

- ✅ Multi-user architecture
- ✅ Google Docs integration
- ✅ AI-powered resume updates
- ✅ Job recommendations
- ⚠️ Microsoft OneDrive (partial)
- ⚠️ Local file upload (basic)

### 10.2 Phase 2: Enhanced Data Sources (Q1 2026)

- Complete Microsoft OneDrive integration
- Complete local file upload with parsing
- Add Dropbox support
- Add S3 cloud storage

### 10.3 Phase 3: Advanced Features (Q2 2026)

- Resume templates
- Multi-resume management
- Resume analytics
- ATS optimization

### 10.4 Phase 4: Enterprise Features (Q3 2026)

- Team accounts
- Bulk resume processing
- API access
- White-label options

---

## 11. Risks and Mitigations

### 11.1 Technical Risks

#### Risk-1: Formatting Loss

- **Risk:** Formatting may be lost during updates
- **Mitigation:** Comprehensive testing, format preservation libraries
- **Impact:** High

#### Risk-2: API Rate Limits

- **Risk:** External APIs may have rate limits
- **Mitigation:** Caching, rate limit handling, multiple API keys
- **Impact:** Medium

#### Risk-3: Data Source Changes

- **Risk:** External APIs may change
- **Mitigation:** Abstraction layer, versioning, monitoring
- **Impact:** Medium

### 11.2 Business Risks

#### Risk-4: User Adoption

- **Risk:** Users may not adopt multi-source approach
- **Mitigation:** Clear value proposition, easy onboarding
- **Impact:** High

#### Risk-5: Competition

- **Risk:** Competitors may offer similar features
- **Mitigation:** Focus on unique value (formatting preservation, multi-source)
- **Impact:** Medium

---

## 12. Dependencies

### 12.1 External Dependencies

- Google OAuth API
- Microsoft Graph API
- Anthropic API
- OpenAI API
- Adzuna API
- AWS Services (for deployment)

### 12.2 Internal Dependencies

- LangGraph framework
- MCP SDK
- PostgreSQL database
- Redis cache
- Express.js server

---

## 13. Open Questions

1. **Q1:** Should we support real-time collaboration (multiple users editing)?

   - **Answer:** Not in Phase 1, consider for Phase 3

2. **Q2:** Should we support resume versioning?

   - **Answer:** Yes, track update history

3. **Q3:** Should we charge for premium features?

   - **Answer:** TBD - consider freemium model

4. **Q4:** Should we support resume templates?
   - **Answer:** Yes, Phase 3 feature

---

## 14. Approval

**Product Owner:** [To be filled]  
**Engineering Lead:** [To be filled]  
**Design Lead:** [To be filled]  
**Date:** February 9, 2026

---

## Appendix A: Glossary

- **MCP:** Model Context Protocol - Interface layer between AI and data sources
- **DataSourceManager:** Manages multiple data source implementations
- **IDataSource:** Interface contract for all data sources
- **Resume Agent:** LangGraph-based AI agent for resume processing
- **Formatting Preservation:** Maintaining original document formatting during updates

## Appendix B: References

- [Architecture Documentation](./DATA_SOURCES.md)
- [API Documentation](./API.md)
- [Deployment Guide](./ABIRAD_AWS_DEPLOYMENT.md)
