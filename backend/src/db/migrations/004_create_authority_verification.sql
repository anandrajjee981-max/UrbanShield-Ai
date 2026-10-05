-- Climate Smart City :: 004_create_authority_verification
-- Authority candidate applications and their admin verification:
--
--   submit / resubmit ---> PENDING
--   PENDING --(admin verify)--> VERIFIED
--   PENDING --(admin reject)--> REJECTED
--   REJECTED --(resubmit)---> PENDING
--
-- The central rule of this migration: an AUTHORITY *candidate* is not a verified
-- authority. Registration already grants `users.role = 'AUTHORITY'` (see
-- registerSchema), but that only means "wants to be an authority". The privilege
-- that matters lives here, in `verification_status`, and only an admin can move
-- it to VERIFIED. Nothing in this schema lets the role alone imply authority
-- access, and no column on this table is writable from a request body.
--
-- Kept in its own tables rather than on `users`: the personal, identity and
-- professional fields have different lifetimes than an account, must be deleted
-- with the account without touching auth data, and are governed by different
-- access rules (admin-only reads).
--
-- NOT part of this migration (deliberately):
--   AI document/identity/face verification, task assignment, workload
--   balancing, estimated completion times, performance scoring and revocation.
--   The professional columns below are the inputs that engine will read later;
--   no workload or task data is invented here.

-- ---------------------------------------------------------------------------
-- Enum domains
-- ---------------------------------------------------------------------------
-- Every list below is a PostgreSQL enum domain rather than a VARCHAR + CHECK.
-- A domain gives a single definition that the DAO, the Zod schemas and the
-- database all agree on: an unknown value fails at the column, and
-- `pg_enum` tells you exactly which values exist. The same values appear as
-- constants in src/types/authority.types.ts - that file is the TypeScript source
-- of truth and this block mirrors it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_verification_status') THEN
        -- The whole verification workflow. PENDING is the state a submission
        -- always lands in; there is no REVOKED status, because revocation is a
        -- separate future admin workflow (see 004 module notes).
        CREATE TYPE authority_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_department') THEN
        CREATE TYPE authority_department AS ENUM (
            'WATER_MANAGEMENT', 'SANITATION', 'DRAINAGE', 'ROAD_MAINTENANCE',
            'ELECTRICITY', 'WASTE_MANAGEMENT', 'PUBLIC_HEALTH', 'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_skill') THEN
        CREATE TYPE authority_skill AS ENUM (
            'PLUMBING', 'DRAINAGE_REPAIR', 'ROAD_MAINTENANCE',
            'ELECTRICAL_MAINTENANCE', 'WASTE_MANAGEMENT', 'EMERGENCY_RESPONSE'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_designation') THEN
        CREATE TYPE authority_designation AS ENUM (
            'MUNICIPAL_WORKER', 'FIELD_OFFICER', 'ENGINEER', 'SUPERVISOR',
            'DEPARTMENT_OFFICER', 'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_jurisdiction_type') THEN
        CREATE TYPE authority_jurisdiction_type AS ENUM (
            'DISTRICT', 'CITY', 'MUNICIPALITY', 'WARD', 'ZONE'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_availability') THEN
        -- Declared, not driven by any endpoint yet. This is the profile shape the
        -- future assignment engine reads; no workload numbers are stored here,
        -- because inventing them would be worse than leaving them absent.
        CREATE TYPE authority_availability AS ENUM (
            'AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'government_id_type') THEN
        CREATE TYPE government_id_type AS ENUM ('AADHAAR', 'GOVERNMENT_ID', 'OTHER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_verification_action') THEN
        -- SUBMIT/RESUBMIT are written by the candidate, VERIFY/REJECT by an admin.
        CREATE TYPE authority_verification_action AS ENUM (
            'SUBMIT', 'RESUBMIT', 'VERIFY', 'REJECT'
        );
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- authority_applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authority_applications (
    id                      UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The candidate. One application per account: a re-submission after a
    -- rejection updates this row rather than adding a second one, so there is a
    -- single source of truth for "what is this person's current standing".
    -- The past decisions are not lost - they live in
    -- authority_verification_audit.
    --
    -- ON DELETE CASCADE: removing the account must also remove the personal and
    -- government identity data it collected.
    user_id                 UUID                        NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    -- ------------------------------------------------ personal information
    full_name               VARCHAR(120)                NOT NULL,
    date_of_birth           DATE                        NOT NULL,
    phone                   VARCHAR(20)                 NOT NULL,
    email                   VARCHAR(320)                NOT NULL,
    address                 VARCHAR(500)                NOT NULL,

    -- ------------------------------------------ government identity (secret)
    -- SENSITIVE. `government_id_number` is the raw value exactly as the
    -- candidate typed it. It is never selected by any DAO read that feeds an API
    -- response, never logged, and never returned: responses carry only the
    -- derived mask (see maskGovernmentId in src/utils/mask.ts).
    --
    -- Stored in the clear rather than hashed because an admin has to *compare*
    -- it against the uploaded document by eye. The compensating controls are the
    -- column comment, the admin-only read path and the masking at the edge; a
    -- future encryption-at-rest pass can wrap this column without touching any
    -- other layer.
    --
    -- `government_id_last4` is the trailing four characters, kept as its own
    -- column so a masked value can be rendered without re-deriving it from the
    -- secret, and so the value is fixed for the life of the application even if
    -- the masking rules change later.
    government_id_type      government_id_type          NOT NULL,
    government_id_number    VARCHAR(64)                 NOT NULL,
    government_id_last4     VARCHAR(4)                  NOT NULL,

    -- ------------------------------------------- uploaded document (private)
    -- The document bytes are NOT in PostgreSQL. Only the ImageKit reference is
    -- stored, exactly like issue photos in 002_create_issues.sql. The file is
    -- uploaded as a private ImageKit file, so the URL only resolves for a
    -- signed request.
    --
    -- These two columns are excluded from every candidate-facing read (see
    -- toSafeAuthorityApplication) and only appear in the admin review payload.
    document_url            VARCHAR(1000),
    document_file_id        VARCHAR(255),
    document_mime_type      VARCHAR(100),

    -- ------------------------------------------ professional information
    department              authority_department        NOT NULL,
    designation             authority_designation       NOT NULL,
    -- The kind of area the candidate operates in, plus its name. Splitting the
    -- two is what makes jurisdiction matchable later: the assignment engine
    -- compares a JURISDICTION_TYPE/WARD against the ward an issue belongs to.
    jurisdiction_type       authority_jurisdiction_type NOT NULL,
    jurisdiction_name       VARCHAR(200)                NOT NULL,
    -- See the authority_availability domain. Stored on the profile, not yet
    -- driven by an endpoint.
    availability            authority_availability      NOT NULL DEFAULT 'AVAILABLE',

    -- ------------------------------------------------ verification status
    -- Never accepted from a request body. INSERT leaves it to the DEFAULT and
    -- only verifyAuthorityApplication / rejectAuthorityApplication in
    -- src/dao/authority.dao.ts write it afterwards, both guarded by the source
    -- status in their WHERE clause.
    verification_status     authority_verification_status NOT NULL DEFAULT 'PENDING',

    -- Shown to the candidate so they know what to correct. Optional (an admin may
    -- reject without explaining), but never blank when present.
    rejection_reason        VARCHAR(500),

    -- When the current submission was made. Reset to NOW() on re-submission, so
    -- the admin queue sorts by "most recently submitted" while `created_at`
    -- still records when the person first applied.
    submitted_at            TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

    -- Admin decision metadata. `verified_by` / `rejected_by` are user ids only:
    -- the `users` join resolves the name and email, so no identity is copied and
    -- nothing goes stale. ON DELETE SET NULL because deleting an admin account
    -- must not erase the fact that a decision was taken.
    verified_by             UUID                        REFERENCES users (id) ON DELETE SET NULL,
    verified_at             TIMESTAMPTZ,
    rejected_by             UUID                        REFERENCES users (id) ON DELETE SET NULL,
    rejected_at             TIMESTAMPTZ,

    created_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

    CONSTRAINT authority_applications_user_unique UNIQUE (user_id),

    -- Text must carry information. A blank name or address is a client bug, and
    -- the Zod schemas already reject it - this is the last line of defence.
    CONSTRAINT authority_applications_full_name_not_blank   CHECK (BTRIM(full_name)   <> ''),
    CONSTRAINT authority_applications_address_not_blank    CHECK (BTRIM(address)     <> ''),
    CONSTRAINT authority_applications_jurisdiction_not_blank CHECK (BTRIM(jurisdiction_name) <> ''),
    CONSTRAINT authority_applications_email_lowercase       CHECK (email = LOWER(email)),
    CONSTRAINT authority_applications_id_number_not_blank  CHECK (BTRIM(government_id_number) <> ''),
    CONSTRAINT authority_applications_last4_matches_id     CHECK (RIGHT(BTRIM(government_id_number), 4) = government_id_last4),
    CONSTRAINT authority_applications_phone_digits          CHECK (phone ~ '^[0-9]{10,15}$'),
    CONSTRAINT authority_applications_rejection_reason_not_blank CHECK (rejection_reason IS NULL OR BTRIM(rejection_reason) <> ''),

    -- The document is mandatory proof, so it is all-or-nothing: a reference, a
    -- file id and a mime type are either all present or all absent.
    CONSTRAINT authority_applications_document_complete CHECK (
        (document_url IS NULL AND document_file_id IS NULL AND document_mime_type IS NULL)
        OR
        (document_url IS NOT NULL AND document_file_id IS NOT NULL AND document_mime_type IS NOT NULL)
    ),

    -- An adult can hold the role: a date of birth in the future, or before the
    -- applicant turned 18, cannot be accepted. The upper bound keeps an obvious
    -- typo (year 2200) from passing the lower one.
    CONSTRAINT authority_applications_dob_adult CHECK (
        date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
        AND date_of_birth >= (CURRENT_DATE - INTERVAL '100 years')
    ),

    -- The status and its metadata must agree, so a row can never claim VERIFIED
    -- without a timestamp, or carry a rejection reason while still PENDING.
    -- Mirrors issues_verification_state_valid from 003_add_issue_verification.sql.
    --
    -- The admin id itself is deliberately NOT required: ON DELETE SET NULL above
    -- can clear it while the decision history stays intact. The service layer
    -- requires the reviewer id on the normal path.
    CONSTRAINT authority_applications_verification_state_valid CHECK (
        CASE verification_status
            WHEN 'VERIFIED' THEN (verified_at IS NOT NULL
                                  AND rejected_at IS NULL
                                  AND rejected_by IS NULL
                                  AND rejection_reason IS NULL)
            WHEN 'REJECTED' THEN (rejected_at IS NOT NULL
                                  AND verified_at IS NULL
                                  AND verified_by IS NULL)
            ELSE (verified_by IS NULL
                  AND verified_at IS NULL
                  AND rejected_by IS NULL
                  AND rejected_at IS NULL
                  AND rejection_reason IS NULL)
        END
    )
);

-- Candidate-facing reads: one application per user.
CREATE INDEX IF NOT EXISTS authority_applications_user_idx
    ON authority_applications (user_id);

-- The admin queue lists by status, then newest submission first. This index
-- serves that query directly.
CREATE INDEX IF NOT EXISTS authority_applications_status_submitted_idx
    ON authority_applications (verification_status, submitted_at DESC);

-- Prefiltering the queue by department and jurisdiction is the first thing an
-- admin triage screen wants, and the assignment engine will need both.
CREATE INDEX IF NOT EXISTS authority_applications_department_idx
    ON authority_applications (department);
CREATE INDEX IF NOT EXISTS authority_applications_jurisdiction_idx
    ON authority_applications (jurisdiction_type, jurisdiction_name);

-- ---------------------------------------------------------------------------
-- authority_application_skills
-- ---------------------------------------------------------------------------
-- A separate table rather than an array column: the future assignment engine
-- has to answer "verified authorities with DRAINAGE_REPAIR in this ward", which
-- is a plain indexed join, and a skill can be constrained by the enum domain.
--
-- The primary key is (application_id, skill), so the same skill cannot be listed
-- twice on one application.
CREATE TABLE IF NOT EXISTS authority_application_skills (
    application_id UUID              NOT NULL REFERENCES authority_applications (id) ON DELETE CASCADE,
    skill          authority_skill   NOT NULL,
    created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT authority_application_skills_pkey PRIMARY KEY (application_id, skill)
);

-- Reverse lookup: "which applications list this skill". The leading column of the
-- primary key already covers "skills of one application".
CREATE INDEX IF NOT EXISTS authority_application_skills_skill_idx
    ON authority_application_skills (skill);

-- ---------------------------------------------------------------------------
-- authority_verification_audit
-- ---------------------------------------------------------------------------
-- The audit trail. Verification is an administrative decision about a person's
-- legal identity, so "who decided what, when, and from which state" has to be
-- answerable later without trusting application code to still remember it.
--
-- Every status change - a candidate submission, a re-submission, an admin verify
-- or reject - appends one row. The table is append-only by convention; nothing in
-- src/dao/authority.dao.ts updates or deletes an entry.
--
-- Note the payload columns are deliberately ABSENT: this records decisions, not
-- identity documents. The rejected document and ID number belong to the
-- application row, which the current application overwrites on re-submission.
CREATE TABLE IF NOT EXISTS authority_verification_audit (
    id              UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID                              NOT NULL REFERENCES authority_applications (id) ON DELETE CASCADE,

    -- NULL for SUBMIT / RESUBMIT: those are the candidate's own actions, not an
    -- admin decision. ON DELETE SET NULL keeps the history if the admin's account
    -- is later removed.
    admin_id        UUID                              REFERENCES users (id) ON DELETE SET NULL,

    action          authority_verification_action     NOT NULL,
    -- NULL only for the very first submission, where there is no prior state.
    previous_status authority_verification_status,
    new_status      authority_verification_status     NOT NULL,
    -- The admin's optional explanation. Never the candidate's ID or document.
    reason          VARCHAR(500),

    created_at      TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),

    CONSTRAINT authority_verification_audit_reason_not_blank CHECK (reason IS NULL OR BTRIM(reason) <> ''),

    -- An admin action must name the admin who took it. This is the database-level
    -- version of the rule the service enforces.
    CONSTRAINT authority_verification_audit_admin_required CHECK (
        (action IN ('VERIFY', 'REJECT') AND admin_id IS NOT NULL)
        OR
        (action IN ('SUBMIT', 'RESUBMIT') AND admin_id IS NULL)
    ),

    -- A decision that does not change the state is not a transition.
    CONSTRAINT authority_verification_audit_status_changed CHECK (
        previous_status IS NULL OR previous_status <> new_status
    )
);

-- Reading one application's history, oldest first.
CREATE INDEX IF NOT EXISTS authority_verification_audit_application_idx
    ON authority_verification_audit (application_id, created_at);

-- "What has this admin decided, and when" - the question an audit is asked most
-- often.
CREATE INDEX IF NOT EXISTS authority_verification_audit_admin_idx
    ON authority_verification_audit (admin_id, created_at DESC)
    WHERE admin_id IS NOT NULL;

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS authority_applications_set_updated_at ON authority_applications;

CREATE TRIGGER authority_applications_set_updated_at
    BEFORE UPDATE ON authority_applications
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();