-- Rename deprecated affiliation type to client (pre-production, no back-compat).
alter type portal.affiliation_type rename value 'community_member' to 'client';
