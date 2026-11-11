-- Regions and countries, and the country each employee works in.
--
--   regions    20 world regions (UN geoscheme sub-regions), ids 1 to 20
--   countries  countries by ISO 3166 two-letter code (CA, US, GB, ...), each in one region
--   employees.country_code  the country the employee works in; their region follows from it
--
-- Regions and countries are reference data: read-only for everyone (qa_writer included),
-- and a reset does not touch them.

CREATE TABLE regions (
  id    INTEGER     PRIMARY KEY,
  name  VARCHAR(40) NOT NULL,
  CONSTRAINT regions_name_unique UNIQUE (name),
  CONSTRAINT regions_id_range CHECK (id BETWEEN 1 AND 20)
);

CREATE TABLE countries (
  code       CHAR(2)     PRIMARY KEY,
  name       VARCHAR(60) NOT NULL,
  region_id  INTEGER     NOT NULL REFERENCES regions (id),
  CONSTRAINT countries_name_unique UNIQUE (name),
  CONSTRAINT countries_code_format CHECK (code ~ '^[A-Z]{2}$')
);
CREATE INDEX countries_region_idx ON countries (region_id);

INSERT INTO regions (id, name) VALUES
  (1, 'Northern America'),
  (2, 'Central America'),
  (3, 'Caribbean'),
  (4, 'South America'),
  (5, 'Northern Europe'),
  (6, 'Western Europe'),
  (7, 'Southern Europe'),
  (8, 'Eastern Europe'),
  (9, 'Northern Africa'),
  (10, 'Western Africa'),
  (11, 'Middle Africa'),
  (12, 'Eastern Africa'),
  (13, 'Southern Africa'),
  (14, 'Western Asia'),
  (15, 'Central Asia'),
  (16, 'Southern Asia'),
  (17, 'Eastern Asia'),
  (18, 'South-eastern Asia'),
  (19, 'Australia and New Zealand'),
  (20, 'Pacific Islands');

INSERT INTO countries (code, name, region_id) VALUES
  ('CA', 'Canada', 1),
  ('US', 'United States', 1),
  ('MX', 'Mexico', 2),
  ('GT', 'Guatemala', 2),
  ('CR', 'Costa Rica', 2),
  ('PA', 'Panama', 2),
  ('JM', 'Jamaica', 3),
  ('CU', 'Cuba', 3),
  ('DO', 'Dominican Republic', 3),
  ('TT', 'Trinidad and Tobago', 3),
  ('BR', 'Brazil', 4),
  ('AR', 'Argentina', 4),
  ('CL', 'Chile', 4),
  ('CO', 'Colombia', 4),
  ('PE', 'Peru', 4),
  ('GB', 'United Kingdom', 5),
  ('IE', 'Ireland', 5),
  ('SE', 'Sweden', 5),
  ('NO', 'Norway', 5),
  ('DK', 'Denmark', 5),
  ('FI', 'Finland', 5),
  ('FR', 'France', 6),
  ('DE', 'Germany', 6),
  ('NL', 'Netherlands', 6),
  ('BE', 'Belgium', 6),
  ('CH', 'Switzerland', 6),
  ('AT', 'Austria', 6),
  ('IT', 'Italy', 7),
  ('ES', 'Spain', 7),
  ('PT', 'Portugal', 7),
  ('GR', 'Greece', 7),
  ('PL', 'Poland', 8),
  ('UA', 'Ukraine', 8),
  ('RO', 'Romania', 8),
  ('CZ', 'Czechia', 8),
  ('HU', 'Hungary', 8),
  ('EG', 'Egypt', 9),
  ('MA', 'Morocco', 9),
  ('DZ', 'Algeria', 9),
  ('TN', 'Tunisia', 9),
  ('NG', 'Nigeria', 10),
  ('GH', 'Ghana', 10),
  ('SN', 'Senegal', 10),
  ('CI', 'Côte d''Ivoire', 10),
  ('CM', 'Cameroon', 11),
  ('CD', 'Democratic Republic of the Congo', 11),
  ('AO', 'Angola', 11),
  ('KE', 'Kenya', 12),
  ('ET', 'Ethiopia', 12),
  ('TZ', 'Tanzania', 12),
  ('RW', 'Rwanda', 12),
  ('ZA', 'South Africa', 13),
  ('BW', 'Botswana', 13),
  ('NA', 'Namibia', 13),
  ('TR', 'Türkiye', 14),
  ('SA', 'Saudi Arabia', 14),
  ('AE', 'United Arab Emirates', 14),
  ('JO', 'Jordan', 14),
  ('LB', 'Lebanon', 14),
  ('KZ', 'Kazakhstan', 15),
  ('UZ', 'Uzbekistan', 15),
  ('KG', 'Kyrgyzstan', 15),
  ('IN', 'India', 16),
  ('PK', 'Pakistan', 16),
  ('BD', 'Bangladesh', 16),
  ('LK', 'Sri Lanka', 16),
  ('NP', 'Nepal', 16),
  ('CN', 'China', 17),
  ('JP', 'Japan', 17),
  ('KR', 'South Korea', 17),
  ('MN', 'Mongolia', 17),
  ('VN', 'Vietnam', 18),
  ('PH', 'Philippines', 18),
  ('ID', 'Indonesia', 18),
  ('TH', 'Thailand', 18),
  ('MY', 'Malaysia', 18),
  ('SG', 'Singapore', 18),
  ('AU', 'Australia', 19),
  ('NZ', 'New Zealand', 19),
  ('FJ', 'Fiji', 20),
  ('PG', 'Papua New Guinea', 20),
  ('WS', 'Samoa', 20);

-- Every employee works in a country. Databases created before this column existed get the seed
-- employees' countries here; any other employee (created by a test, id 1001 and up) is set to CA.
ALTER TABLE employees ADD COLUMN country_code CHAR(2);
UPDATE employees SET country_code = CASE
  WHEN id IN (31) THEN 'AE'
  WHEN id IN (49) THEN 'AU'
  WHEN id IN (55) THEN 'BR'
  WHEN id IN (20) THEN 'DE'
  WHEN id IN (41) THEN 'EG'
  WHEN id IN (12) THEN 'FR'
  WHEN id IN (32) THEN 'GB'
  WHEN id IN (59) THEN 'GH'
  WHEN id IN (40) THEN 'IE'
  WHEN id IN (45) THEN 'IN'
  WHEN id IN (57) THEN 'JM'
  WHEN id IN (38) THEN 'JP'
  WHEN id IN (48) THEN 'KE'
  WHEN id IN (19) THEN 'KR'
  WHEN id IN (27) THEN 'MX'
  WHEN id IN (21) THEN 'PK'
  WHEN id IN (11, 18, 29, 30, 42, 43, 47, 50, 51) THEN 'US'
  ELSE 'CA'
END;
ALTER TABLE employees ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE employees
  ADD CONSTRAINT employees_country_fk FOREIGN KEY (country_code) REFERENCES countries (code) ON DELETE RESTRICT;
CREATE INDEX employees_country_idx ON employees (country_code);

-- The directory view gets the country and region names (new columns go at the end).
CREATE OR REPLACE VIEW v_employee_directory AS
SELECT e.id,
       e.first_name || ' ' || e.last_name  AS full_name,
       e.email,
       e.status,
       j.title                             AS job_title,
       d.name                              AS department_name,
       m.id                                AS manager_id,
       m.first_name || ' ' || m.last_name  AS manager_name,
       e.salary,
       e.hire_date,
       e.gender,
       e.country_code,
       c.name                              AS country_name,
       r.id                                AS region_id,
       r.name                              AS region_name
  FROM employees e
  JOIN jobs j        ON j.id = e.job_id
  JOIN departments d ON d.id = e.department_id
  JOIN countries c   ON c.code = e.country_code
  JOIN regions r     ON r.id = c.region_id
  LEFT JOIN employees m ON m.id = e.manager_id;

-- One row per region, including regions where nobody works (headcount 0).
CREATE VIEW v_region_stats AS
SELECT r.id                                             AS region_id,
       r.name                                           AS region_name,
       COUNT(DISTINCT c.code)::int                      AS country_count,
       COUNT(e.id)::int                                 AS headcount,
       ROUND(AVG(e.salary))::int                        AS average_salary
  FROM regions r
  LEFT JOIN countries c ON c.region_id = r.id
  LEFT JOIN employees e ON e.country_code = c.code AND e.status = 'ACTIVE'
 GROUP BY r.id, r.name;

-- Reference data is read-only. (003_roles.sql gives new tables write access by default; take it back.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON regions, countries FROM hr_app, qa_writer;
GRANT SELECT ON regions, countries, v_region_stats TO hr_app, qa_reader, qa_writer;
