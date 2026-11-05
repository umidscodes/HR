-- Adds employees.gender: MALE or FEMALE, required.
-- Databases created before this column existed get the seed employees' genders filled in here;
-- any employee created by a test (id 1001 and up) that is still there is set to MALE.
ALTER TABLE employees ADD COLUMN gender VARCHAR(6);

UPDATE employees SET gender = CASE
  WHEN id IN (1, 3, 5, 7, 9, 11, 14, 16, 18, 20, 22, 24, 26, 28, 29, 31, 33, 35, 37, 39, 41, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60)
    THEN 'FEMALE'
  ELSE 'MALE'
END;

ALTER TABLE employees ALTER COLUMN gender SET NOT NULL;
ALTER TABLE employees ADD CONSTRAINT employees_gender_valid CHECK (gender IN ('MALE', 'FEMALE'));

-- The directory view shows it too. (CREATE OR REPLACE VIEW may only add columns at the end.)
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
       e.gender
  FROM employees e
  JOIN jobs j        ON j.id = e.job_id
  JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees m ON m.id = e.manager_id;
