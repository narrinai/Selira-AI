# Selira AI Content Moderation Policy

**Company:** G-Cas Trading (trading as Selira AI)
**Document Version:** 1.0
**Last Updated:** November 2025
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

### 3.1 Text Chat Moderation

#### 3.1.1 API-Level Filtering
All chat requests are processed through OpenAI/OpenRouter APIs which include built-in content moderation:
- Automatic rejection of illegal content requests
- Filtering of content involving minors
- Blocking of extreme violence or illegal activity instructions

#### 3.1.2 System Prompt Safeguards
Each AI character includes system-level instructions that:
- Prohibit generating content involving minors
- Reject requests for illegal activity instructions
- Prevent impersonation of real public figures
- Block content promoting self-harm or violence

#### 3.1.3 Keyword Blacklist
The following categories are blocked at the prompt level:
- **Age-related:** "underage", "minor", "child", "teen" (in sexual context), "loli", "shota"
- **Illegal activities:** Specific terms related to illegal content production
- **Violence:** Extreme violence, gore, snuff content
- **Non-consensual:** Rape scenarios, forced content (unless clearly fantasy roleplay between adults)

### 3.2 Image Generation Moderation

#### 3.2.1 Tag-Based System
Image generation uses a **predefined tag/keyword system**:
- Users select from approved poses, outfits, and scenarios
- Custom prompts are filtered through API-level moderation
- No free-form image upload or image-to-image generation

#### 3.2.2 API Provider Moderation
- **Replicate (Censored Mode):** Built-in NSFW filtering, blocks illegal content
- **Promptchan (Uncensored Mode):** Adult content allowed, but strict filtering for:
  - Content depicting minors
  - Non-consensual scenarios
  - Extreme violence
  - Real person deepfakes

#### 3.2.3 Blocked Image Generation Terms
The following are blocked from image generation prompts:
- Any terms suggesting minors or underage individuals
- Real celebrity/public figure names
- Extreme violence or gore
- Non-consensual scenarios

### 3.3 Age Verification
- **Mandatory Age Gate:** All users must confirm they are 18+ before accessing the platform
- **Implementation:** JavaScript-based popup on first visit
- **Storage:** Verification stored in localStorage (persistent)
- **Denial Action:** Users who deny being 18+ are redirected to Google.com

---

## 4. Active Moderation Measures (Detection & Response)

### 4.1 User Reporting System

#### 4.1.1 In-Chat Reporting
Users can report individual AI messages via:
- **Report Icon (⚑):** Visible on hover under each AI message
- **Quick Report:** One-click report with optional reason
- **Data Captured:** Message content, user ID, character ID, timestamp

#### 4.1.2 General Reporting Channels
- **Email:** hello@selira.ai
- **Phone:** +31 6 8209 5964
- **Contact Form:** Available at selira.ai/contact

#### 4.1.3 Response Times
| Report Type | Initial Response | Resolution |
|-------------|------------------|------------|
| Illegal Content | Within 4 hours | Within 24 hours |
| Policy Violation | Within 24 hours | Within 72 hours |
| General Complaint | Within 48 hours | Within 7 business days |

### 4.2 Content Review Process

#### 4.2.1 Reported Content Review
1. Report received via email notification to moderation team
2. Content reviewed against platform policies
3. Action taken:
   - **If Illegal:** Content removed immediately, user banned, reported to authorities if required
   - **If Policy Violation:** Content removed, user warned or banned
   - **If False Report:** No action, report logged

#### 4.2.2 Automated Flagging
- Messages containing blacklisted keywords are flagged for review
- High-frequency reporters are monitored for abuse
- Unusual usage patterns trigger manual review

### 4.3 User Enforcement Actions

| Violation Level | Action |
|-----------------|--------|
| First Warning | Warning email sent |
| Second Warning | 7-day account suspension |
| Third Warning | Permanent account ban |
| Illegal Content | Immediate permanent ban |

### 4.4 Content Removal Timeline
- **Illegal Content:** Removed without undue delay (target: within 4 hours)
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

### 5.2 Prohibited (Content Removed, User Warned)
- Impersonation of real public figures
- Extreme realistic violence or gore
- Content promoting self-harm or suicide
- Harassment or doxxing of real individuals
- Spam or commercial solicitation

### 5.3 Restricted (Flagged for Review)
- Edge cases involving fantasy violence
- Roleplay scenarios requiring context review
- Reports from other users

---

## 6. Technical Implementation

### 6.1 Data Storage
- **Platform:** Airtable (secure cloud database)
- **Chat History:** Stored with user ID, character ID, timestamps
- **Reports:** Stored in dedicated Support_Messages table
- **Retention:** Chat history retained for service improvement; deleted upon user request

### 6.2 Logging & Audit Trail
All moderation actions are logged with:
- Timestamp
- Action taken
- Moderator ID (if manual)
- Reason for action
- Original content (for audit purposes)

### 6.3 API Security
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
- NowPayments cryptocurrency payment processor terms

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
