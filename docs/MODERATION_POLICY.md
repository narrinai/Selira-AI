Selira AI Content Moderation Policy

Version: 1.4
Last Updated: December 2025
Contact: hello@selira.ai | +31 6 8209 5964


1. Platform Overview

Selira AI is an 18+ AI companion chat platform. All characters are 100% AI-generated using Stable Diffusion/Flux models. No real persons are depicted or imitated. Users cannot upload images—all visual content is generated from text prompts through our tag-based system.


2. Multi-Layer Content Moderation System

2.1 Detection Layers

Layer 1 - Rule-Based Filtering:
- Pattern matching for explicitly prohibited content categories
- Regex-based detection of CSAM terminology, trafficking keywords, etc.
- Executes first, blocks immediately if matched

Layer 2 - AI-Powered Analysis:
- Context-aware content evaluation using machine learning
- Catches edge cases and sophisticated attempts to bypass filters
- Analyzes semantic meaning, not just keywords

Layer 3 - API-Level Moderation:
- Third-party moderation services as additional safety layer
- Applied to both user input and AI output
- Redundant check to catch anything missed by previous layers

2.2 AI Output Moderation

- AI responses are also checked to prevent characters from generating prohibited content
- Characters are instructed to always be 18+ years old
- System prompts enforce age and content guidelines


3. Prohibited Content Categories

3.1 Zero Tolerance (Immediate Permanent Ban)

The following content triggers auto_ban and results in immediate account restriction:

CSAM - Content depicting or sexualizing minors in any form - Immediate ban
Child Exploitation - Any sexual content involving characters under 18 - Immediate ban
Human Trafficking - Content promoting or depicting trafficking - Immediate ban
Terrorism - Terrorism promotion or mass violence planning - Immediate ban
Incest - Requests for family roleplay or incest content - Immediate ban
Bestiality/Zoophilia - Sexual content involving animals - Immediate ban

3.2 Severe Violations (Immediate Ban)

Realistic violence involving minors - Gore/violence with underage victims - Immediate ban
Non-consensual imagery of real persons - Deepfakes, revenge porn of real people - Immediate ban
Real person exploitation - Sexual content depicting identifiable real people - Immediate ban

3.3 Moderate Violations (Warning System)

Extreme violence/gore - Graphic depictions of violence - Warning + violation count
Self-harm promotion - Content encouraging self-injury or suicide - Warning + violation count
Hate speech - Content targeting protected groups - Warning + violation count
Harassment - Targeted abuse or threats - Warning + violation count
Illegal drug manufacturing - Instructions for creating illegal substances - Warning + violation count

3.4 General Violations

Spam - Repetitive/automated content - Warning
Impersonation - Pretending to be public figures - Warning + violation count
Copyright infringement - Unauthorized use of copyrighted material - Warning
Jailbreak attempts - Attempts to bypass safety measures - Warning + violation count


4. Violation Response System

4.1 Strike System

Strike 1: Warning message displayed to user
Strike 2: Final warning with account notice
Strike 3: Automatic account restriction

4.2 Immediate Ban Triggers

Content with auto_ban bypasses the strike system:
- CSAM/child exploitation
- Human trafficking
- Terrorism content

4.3 Technical Implementation

Airtable Fields:
- content_violations (number): Counts violations per user
- is_banned (boolean): Account restriction status
- ban_reason (text): Reason for restriction

Ban Logic:
Account is banned when violations >= 3 OR auto_ban is triggered


5. Allowed Content

Selira AI permits the following adult content:

- Consensual adult content between adult AI characters
- Adult fantasy roleplay
- Creative storytelling and adult themes
- Romantic and explicit conversations with AI companions
- NSFW content with proper age verification

Key Requirement: All users must verify they are 18+ before accessing the platform.


6. User Rights and Appeals

6.1 User Rights

Users have the right to:
- Receive notification of content violations
- Appeal account restrictions
- Request explanation of moderation decisions
- Report false positives

6.2 Appeal Process

1. User contacts hello@selira.ai with appeal request
2. Appeal reviewed within 48 hours
3. If false positive confirmed, account reinstated
4. User notified of decision via email

6.3 Account Unrestriction

Administrators can unrestrict accounts via:
- Direct Airtable edit (set is_banned to false)
- Reset content_violations to 0 if appropriate


7. Reporting and Response Times

Illegal Content (CSAM, trafficking) - Within 4 hours
Policy Violations - Within 24 hours
General Complaints - Within 48 hours
Account Appeals - Within 48 hours

7.1 Report Button

Users can use the report button under any AI message to flag concerns. Reports are logged and reviewed by the moderation team.


8. Platform Safeguards

8.1 Age Verification
- Mandatory 18+ verification for all users before platform access
- Age gate on registration

8.2 AI Character Rules
- All AI characters are programmed to be 18+ years old
- System prompts explicitly state: "You are always at least 18 years old"
- Characters cannot claim to be minors

8.3 No User Uploads
- Users cannot upload images
- All visual content is AI-generated from text prompts
- Prevents real person imagery


9. Payment Processor Compliance

Selira AI maintains full compliance with all payment processor requirements:

- Comprehensive moderation documentation (this document)
- Test accounts available on request
- Anonymized moderation logs available on request
- Regular policy reviews and updates

Supported Payment Methods:
- NowPayments (cryptocurrency)
- Traditional payment processors (as applicable)


10. Technical Reference

10.1 Key Files

netlify/functions/content-moderation.js - Main moderation function
chat.html - Frontend violation modal and ban check
about.html - Public-facing moderation policy
terms-and-conditions.html - Legal terms including Section 3.7

10.2 Detection Patterns

Patterns are defined in content-moderation.js and include:
- Child-related sexual content patterns (CSAM)
- Trafficking-related patterns
- Violence and self-harm patterns
- Jailbreak attempt patterns
- Incest/family roleplay patterns
- Bestiality/zoophilia patterns

10.3 API Endpoints

Content Moderation Check:
POST /.netlify/functions/content-moderation

Request body includes:
- message (string)
- user_email (string)
- user_id (optional string)
- status_check_only (optional boolean)

Response for blocked content includes:
- blocked: true
- banned: true/false
- ban_reason: string
- reason: Message blocked due to content policy violation
- category: csam, trafficking, violence, etc.


11. Changelog

Version 1.0 - Nov 2025 - Initial policy
Version 1.1 - Dec 2025 - Added multi-layer detection, AI output moderation
Version 1.2 - Dec 2025 - Added pre-send ban check, updated violation system
Version 1.3 - Dec 2025 - Added incest/family roleplay detection with immediate ban
Version 1.4 - Dec 2025 - Added bestiality/zoophilia detection with immediate ban (payment processor compliance)


12. Contact Information

Selira AI Support Team

Company: G-Cas Trading
Registered Address: Fladderiepvliet 3, 3545 AJ Utrecht, Netherlands
Country of Incorporation: Netherlands
Customer Support Phone: +31 6 8209 5964
Email: hello@selira.ai
