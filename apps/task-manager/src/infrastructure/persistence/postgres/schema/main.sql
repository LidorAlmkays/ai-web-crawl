-- PostgreSQL Main Schema for Task Manager
-- This file imports all schema components in the correct order
--
-- This schema defines the database structure for managing asynchronous tasks
-- including task creation, status tracking, and result storage.

-- Import schema components in order
\i enums.sql
\i tables.sql
\i triggers.sql
\i stored-procedures.sql
\i functions.sql
\i metrics-functions.sql
