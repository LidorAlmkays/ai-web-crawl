-- PostgreSQL Enums for Task Manager
-- This file contains all custom enum types used by the Task Manager service

-- Task Status Enum
-- Represents the possible states of a task in the system
CREATE TYPE task_status AS ENUM (
  'new',
  'completed',
  'error'
);

-- Add comments for documentation
COMMENT ON TYPE task_status IS 'Represents the possible states of a task in the system';
