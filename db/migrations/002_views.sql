-- Two views. A view is a saved SELECT: you query it like a table, and it always shows current data.

-- One row per department: how many active employees it has and what they earn.
-- Departments with no active employees still appear, with a headcount of 0 and NULL salary figures.
CREATE VIEW v_department_stats AS
SELECT d.id                                AS department_id,
       d.name                              AS department_name,
       d.code                              AS department_code,
       COUNT(e.id)::int                    AS headcount,
       ROUND(AVG(e.salary))::int           AS average_salary,
       MIN(e.salary)                       AS min_salary,
       MAX(e.salary)                       AS max_salary,
       COALESCE(SUM(e.salary), 0)::bigint  AS total_salary
  FROM departments d
  LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
 GROUP BY d.id, d.name, d.code;

-- Every employee with the names behind their ids: job title, department and manager.
CREATE VIEW v_employee_directory AS
SELECT e.id,
       e.first_name || ' ' || e.last_name  AS full_name,
       e.email,
       e.status,
       j.title                             AS job_title,
       d.name                              AS department_name,
       m.id                                AS manager_id,
       m.first_name || ' ' || m.last_name  AS manager_name,
       e.salary,
       e.hire_date
  FROM employees e
  JOIN jobs j        ON j.id = e.job_id
  JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees m ON m.id = e.manager_id;
