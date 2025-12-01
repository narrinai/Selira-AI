# Selira AI Content Moderation Policy

**Company:** G-Cas Trading (trading as Selira AI)
**Document Version:** 1.1
**Last Updated:** December 2025
**Contact:** hello@selira.ai | +31 6 8209 5964

---

## 1. Overview

Selira AI is an AI-only companion chat platform where users interact exclusively with AI-generated characters. This document outlines our comprehensive content moderation approach to ensure compliance with payment processor requirements and applicable laws.

---

## 2. Platform Architecture & Content Types

### 2.1 AI Character Chat (Text Generation)
- **Technology:** OpenAI GPT-4 / OpenRouter API with built-in safety filters
- **Content Type:** Text-based conversations between users and AI characters
- **User Input:** Text prompts only (no file uploads)
- **AI Output:** AI-generated text responses

### 2.2 AI Image Generation
- **Technology:** Replicate API (censored mode) / Promptchan API (uncensored mode)
- **Content Type:** AI-generated images based on text prompts
- **Input Method:** Predefined tag/keyword system + optional custom text prompts
- **No User Uploads:** Users cannot upload images; all content is generated from text

### 2.3 AI Characters
- **Creation:** All characters are AI-generated using Stable Diffusion / Flux models
- **No Real Persons:** Characters do not represent or imitate real individuals
- **No User-Uploaded Avatars:** Character images are system-generated only

---

## 3. Passive Moderation Measures (Prevention)

### 3.1 Real-Time Content Moderation System

All user messages are processed through a multi-layer moderation system **before** being sent to the AI:

#### 3.1.1 Rule-Based Detection (First Layer)
Pattern-matching detection for critical content categories:

| Category | Severity | Action |
|----------|----------|--------|
| CSAM (Child Sexual Abuse Material) | CRITICAL | Immediate block + auto-ban |
| Human Trafficking | CRITICAL | Immediate block + auto-ban |
| Terrorism / Mass Violence | CRITICAL | Immediate block + flag user |
| Illegal Drug Manufacturing | HIGH | Immediate block + flag user |
| Self-Harm | HIGH | Block + provide resources |

#### 3.1.2 AI-Powered Moderation (Second Layer)
Messages passing rule-based checks are analyzed by **Mistral AI Moderation API**:
- **Model:** `mistral-moderation-latest` (direct API) or `mistral-nemo` (via OpenRouter)
- **Categories Checked:** sexual content involving minors, hate/discrimination, violence/threats, dangerous/criminal content, self-harm
- **Threshold:** 90%+ confidence required to block (prevents false positives on adult platform)
- **Fail-Safe:** System fails open on technical errors to avoid blocking legitimate users

#### 3.1.3 API-Level Filtering (Third Layer)
All chat requests processed through OpenAI/OpenRouter APIs include built-in content moderation:
- Automatic rejection of illegal content requests
- Filtering of content involving minors
- Blocking of extreme violence or illegal activity instructions

### 3.2 System Prompt Safeguards
Each AI character includes system-level instructions that:
- Prohibit generating content involving minors
- Reject requests for illegal activity instructions
- Prevent impersonation of real public figures
- Block content promoting self-harm or violence

### 3.3 Keyword Blacklist Patterns
The following regex patterns are blocked at the prompt level:

**CSAM Patterns:**
- Child/minor terms combined with sexual terms
- Age references (e.g., "X years old") with explicit content
- Known CSAM terminology (loli, shota, cp, etc.)

**Trafficking Patterns:**
- Buy/sell/trade combined with person references
- Trafficking, smuggling, slave terminology

**Violence Patterns:**
- Bomb-making, terrorist attack planning
- Mass shooting references
- School/public attack planning

**Drug Patterns:**
- Manufacturing instructions for controlled substances
- Distribution/dealing terminology

### 3.4 Image Generation Moderation

#### 3.4.1 Tag-Based System
Image generation uses a **predefined tag/keyword system**:
- Users select from approved poses, outfits, and scenarios
- Custom prompts are filtered through API-level moderation
- No free-form image upload or image-to-image generation

#### 3.4.2 API Provider Moderation
- **Replicate (Censored Mode):** Built-in NSFW filtering, blocks illegal content
- **Promptchan (Uncensored Mode):** Adult content allowed, but strict filtering for:
  - Content depicting minors
  - Non-consensual scenarios
  - Extreme violence
  - Real person deepfakes

### 3.5 Age Verification
- **Mandatory Age Gate:** All users must confirm they are 18+ before accessing the platform
- **Implementation:** JavaScript-based popup on first visit
- **Storage:** Verification stored in localStorage (persistent)
- **Denial Action:** Users who deny being 18+ are redirected to Google.com

---

## 4. Active Moderation Measures (Detection & Response)

### 4.1 User Reporting System

#### 4.1.1 In-Chat Reporting
Users can report individual AI messages via:
- **Report Button:** Visible on hover under each AI message (flag icon)
- **Report Modal:** Pop-up with reason selection
- **Feedback Options:** Thumbs up/down + report with reason

#### 4.1.2 Data Captured on Report
Reports are stored in the **ChatHistory** table with the following fields:
- `report_reason` - User-provided reason for report
- `thumbs_up` / `thumbs_down` - User feedback
- `User_ID` - Link to user record
- `Message` - The reported message content
- `CreatedTime` - Timestamp of original message

#### 4.1.3 General Reporting Channels
- **Email:** hello@selira.ai
- **Phone:** +31 6 8209 5964
- **Contact Form:** Available at selira.ai/contact

#### 4.1.4 Response Times
| Report Type | Initial Response | Resolution |
|-------------|------------------|------------|
| Illegal Content | Within 4 hours | Within 24 hours |
| Policy Violation | Within 24 hours | Within 72 hours |
| General Complaint | Within 48 hours | Within 7 business days |

### 4.2 Automated User Flagging System

#### 4.2.1 How Flagging Works
When a user's message is blocked by the moderation system:
1. User's `content_violations` counter is incremented
2. `flagged_at` timestamp is recorded
3. `last_violation_reason` is saved (e.g., "CSAM", "Terrorism")

#### 4.2.2 User Record Fields
| Field | Description |
|-------|-------------|
| `content_violations` | Count of policy violations |
| `flagged_at` | Timestamp of last violation |
| `last_violation_reason` | Category of last violation |
| `is_banned` | Boolean ban status |
| `ban_reason` | Reason for ban (if applicable) |

### 4.3 User Enforcement Actions

#### 4.3.1 Three-Strike Auto-Ban System
| Violation Count | Action |
|-----------------|--------|
| 1st Violation | Message blocked, violation logged |
| 2nd Violation | Message blocked, violation logged |
| 3rd Violation | **Automatic permanent ban** |
| CSAM/Trafficking | **Immediate permanent ban** (any violation) |

#### 4.3.2 Ban Message
Banned users receive: *"Account restricted due to content policy violations"*

#### 4.3.3 Pre-Message Ban Check
Every message request first checks if the user is banned:
- If `is_banned = true`, the message is rejected with 403 status
- Ban reason is provided in the response

### 4.4 Content Review Process

#### 4.4.1 Automated Blocking
- Messages matching prohibited patterns are blocked in real-time
- User is notified: *"Message blocked due to content policy violation"*
- No blocked content reaches the AI or is stored

#### 4.4.2 Manual Review (for reports)
1. Report received via email notification to moderation team
2. Content reviewed against platform policies
3. Action taken:
   - **If Illegal:** User banned, reported to authorities if required
   - **If Policy Violation:** User warned or banned based on history
   - **If False Report:** No action, report logged

### 4.5 Content Removal Timeline
- **Illegal Content:** Blocked in real-time (never stored)
- **Policy Violations:** Removed within 24 hours of confirmation
- **User Account Data:** Available for deletion upon request within 48 hours

---

## 5. Prohibited Content Categories

### 5.1 Strictly Prohibited (Immediate Ban)
- Content depicting or sexualizing minors in any form
- Real person deepfakes without verified consent
- Content promoting terrorism or violent extremism
- Content facilitating human trafficking
- Child Sexual Abuse Material (CSAM)
- Non-consensual intimate imagery of real persons

### 5.2 Prohibited (Content Blocked, User Flagged)
- Impersonation of real public figures
- Extreme realistic violence or gore
- Content promoting self-harm or suicide
- Instructions for illegal drug manufacturing
- Harassment or doxxing of real individuals

### 5.3 Allowed (Adult Platform)
- Consensual adult sexual content
- Fantasy roleplay between adults
- Terms of endearment ("baby", "daddy", etc.) in adult context
- Adult character interactions

---

## 6. Technical Implementation

### 6.1 Moderation Function
**File:** `netlify/functions/content-moderation.js`

**Flow:**
```
User Message → Ban Check → Rule-Based Check → AI Moderation → Allow/Block
```

**API Endpoints:**
- `POST /content-moderation` - Check message before sending
- `POST /save-message-feedback` - Save user reports/feedback

### 6.2 Data Storage
- **Platform:** Airtable (secure cloud database)
- **Chat History Table:** Messages with user ID, character ID, timestamps, feedback
- **Users Table:** User data including violation counts and ban status
- **Retention:** Chat history retained for service improvement; deleted upon user request

### 6.3 Logging & Audit Trail
All moderation actions are logged with:
- Timestamp
- Action taken (blocked/allowed)
- Category (if blocked)
- Severity level
- User email (for flagging)

### 6.4 API Security
- All API keys stored as environment variables
- HTTPS encryption for all data transmission
- No storage of payment information (handled by payment processors)

---

## 7. Compliance & Legal

### 7.1 Applicable Laws
Selira AI operates in compliance with:
- EU Digital Services Act (DSA)
- GDPR (General Data Protection Regulation)
- Dutch telecommunications and e-commerce laws
- Payment processor terms (Stripe, NowPayments)

### 7.2 Cooperation with Authorities
Selira AI will:
- Respond to valid legal requests from law enforcement
- Report suspected CSAM to relevant authorities (NCMEC, Dutch Police)
- Preserve evidence when legally required

### 7.3 Documentation Available on Request
Upon request from payment processors or regulators:
- Full moderation process documentation
- Sample moderation logs (anonymized)
- Test account credentials with full access
- Technical architecture documentation

---

## 8. Contact Information

**Moderation Team Contact:**
- Email: hello@selira.ai
- Phone: +31 6 8209 5964
- Response Time: Within 48 hours (urgent: within 4 hours)

**Company Information:**
- Legal Name: G-Cas Trading
- Address: Fladderiepvliet 3, 3545 AJ Utrecht, Netherlands
- Country of Incorporation: Netherlands

---

## 9. Policy Updates

This policy is reviewed quarterly and updated as needed. Users are notified of material changes via email and website notice.

**Version History:**
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | November 2025 | Initial policy document |
| 1.1 | December 2025 | Updated to reflect actual implementation: Added AI moderation (Mistral), updated three-strike system, clarified data storage locations, added technical implementation details |
