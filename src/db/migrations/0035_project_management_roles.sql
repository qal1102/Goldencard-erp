INSERT INTO roles (name, description)
VALUES
  ('project_manager', 'Project management, technical coordination, delivery oversight'),
  ('chief_engineer', 'Chief engineer, technical review, survey and installation oversight')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS job_title varchar(150);
