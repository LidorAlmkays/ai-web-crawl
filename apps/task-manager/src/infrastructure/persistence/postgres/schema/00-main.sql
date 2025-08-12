-- PostgreSQL Main Schema for Task Manager
-- This file imports all schema components in the correct order
--
-- This schema defines the database structure for managing asynchronous tasks
-- including task creation, status tracking, and result storage.

-- Import schema components in order
\i 01-enums.sql
\i 02-tables.sql
\i 03-triggers.sql
\i 04-stored-procedures.sql
\i 05-query-functions.sql
\i 06-count-functions.sql
\i 07-views.sql
\i 08-metrics-functions.sql
