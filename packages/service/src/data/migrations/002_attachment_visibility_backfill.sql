ALTER TABLE attachments ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared';

UPDATE attachments
SET visibility = 'shared'
WHERE visibility IS NULL OR visibility = '';
