# Data Privacy & GDPR Compliance

**Summary**: Explains the data privacy guidelines, data residency choices, data deletion policies, and GDPR compliance tasks for the PocketCoach application.

**Sources**: None

**Last updated**: 2026-07-18

---

## Data Privacy Framework

As a tool operating in a German/European badminton club, the application must adhere to the General Data Protection Regulation (GDPR) standards.

### 1. Data Residency (EU-Only Storage)
To ensure compliance, all user and operational data must reside within the European Union.
* **Database & Authentication**: Choose the **Frankfurt, Germany** region when setting up the database/BaaS instance (e.g., `eu-central-1` in AWS for Supabase, or `europe-west3` in GCP for Firebase).
* **Hosting Logs**: Cloudflare Pages / Vercel cache and route requests through European edge locations, keeping IP processing compliant with EU standards.

### 2. Data Processing Agreements (DPAs)
The club acts as the **Data Controller**, while the third-party platforms act as **Data Processors** (or sub-processors). Standard DPAs containing EU Standard Contractual Clauses (SCCs) must be accepted inside the developer accounts of:
* **Supabase / Firebase** (for Database and Auth services)
* **Cloudflare / Vercel** (for Web and API Hosting)
* **Resend / Brevo** (for transactional invitation emails)

### 3. Personal Identifiable Information (PII)
The application collects and processes the following PII:
* **Emails & Names**: Required for trainer registration and profile display.
* **Profile Pictures**: Uploaded optionally by trainers.
* **Availability & Absence Data**: Collected dynamically for session planning.
* **Session & Post-session Notes**: Free-text fields containing notes on trainers or court activities.

*Compliance Guideline*: Keep data collection minimal. Session notes and post-session notes should focus purely on sports and court management, avoiding records of sensitive medical or private trainer data.

### 4. Right to Erasure (Data Deletion & Anonymization)
Trainers can request to have their accounts removed (source: overview-roles-auth.md, section: Account Management).
* **Profile Deletion**: Deleting a user must cascade-delete all personal profile entries (emails, names, profile images).
* **Anonymization of History**: To avoid breaking past scheduling and session records, assignments and post-session notes should not be deleted. Instead, foreign key references to the deleted trainer must be set to `NULL` or replaced with an anonymized string (e.g., *"Former Trainer"*).

---

## Checklist for Launch
1. Configure database region to **Frankfurt (Germany)**.
2. Accept DPAs inside the Supabase/Firebase, Cloudflare, and Resend consoles.
3. Publish a brief privacy policy page visible on the login screen, explaining the legitimate interest in processing emails and names for club coaching scheduling.

## Related pages

- [[feasibility-and-costs]]
- [[../requirements/readme]]
- [[../requirements/non-functional-requirements]]
- [[../requirements/overview-roles-auth]]
