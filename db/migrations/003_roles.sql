-- Database users (local development passwords are in the README).
--   hr_app     the application itself
--   qa_reader  read-only, for DBeaver and JDBC checks
--   qa_writer  read and write, for test setup over JDBC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_app') THEN
    CREATE ROLE hr_app LOGIN PASSWORD 'hr_app';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qa_reader') THEN
    CREATE ROLE qa_reader LOGIN PASSWORD 'qa_reader';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qa_writer') THEN
    CREATE ROLE qa_writer LOGIN PASSWORD 'qa_writer';
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO hr_app, qa_reader, qa_writer', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO hr_app, qa_reader, qa_writer;

-- The app also needs TRUNCATE (for reset) and UPDATE on sequences (to restart ids at 1001 after a reset).
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO hr_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO hr_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qa_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qa_writer;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_reader;

-- Tables created by later migrations get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO hr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qa_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO qa_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO qa_writer;
