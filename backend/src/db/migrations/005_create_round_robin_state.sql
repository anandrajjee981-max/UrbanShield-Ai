-- Climate Smart City :: 005_create_round_robin_state
-- Persistent pointer for the round-robin authority selector.
--
-- One row per assignment group (the group key is supplied by the caller, e.g.
-- requiredSkill + requiredJurisdiction derived later by the integration layer;
-- this migration deliberately does not define that derivation).
--
-- The row stores ONLY the last selected authority - never the eligible list,
-- which is computed fresh on every call by the eligibility service (Prompt 4).
-- The pointer must survive server restarts, so no in-memory state is used.
--
-- Concurrency contract (implemented in src/dao/round-robin.dao.ts): callers
-- BEGIN a transaction and SELECT this row ... FOR UPDATE, so two simultaneous
-- requests for the same group are serialised by PostgreSQL and never select
-- the same authority twice.
--
-- NOT part of this migration (deliberately): task creation, issue assignment,
-- issue status changes, notifications, workload tables.

CREATE TABLE IF NOT EXISTS round_robin_state (
    -- Stable key supplied by the caller. UNIQUE is the primary key here.
    assignment_group           VARCHAR(200) PRIMARY KEY,

    -- The authority chosen most recently for this group. NULL = never assigned.
    -- ON DELETE SET NULL: if an application row disappears the pointer simply
    -- resets to the first eligible authority instead of blocking or orphaning.
    last_assigned_authority_id UUID REFERENCES authority_applications (id) ON DELETE SET NULL,

    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT round_robin_state_group_not_blank CHECK (BTRIM(assignment_group) <> '')
);

-- Updated automatically by the DAO on every selection.
CREATE OR REPLACE FUNCTION set_round_robin_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS round_robin_state_updated_at_trg ON round_robin_state;
CREATE TRIGGER round_robin_state_updated_at_trg
    BEFORE UPDATE ON round_robin_state
    FOR EACH ROW
    EXECUTE FUNCTION set_round_robin_state_updated_at();
