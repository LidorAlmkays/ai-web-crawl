-- PostgreSQL Functions for Task Manager
-- This file contains all database functions for the Task Manager service

-- =============================================================================
-- QUERY FUNCTIONS
-- =============================================================================

-- Find web crawl task by ID function
-- Retrieves a single web crawl task by its UUID
CREATE OR REPLACE FUNCTION find_web_crawl_task_by_id(p_id UUID)
RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  user_query TEXT,
  original_url VARCHAR(2048),
  received_at TIMESTAMP WITH TIME ZONE,
  status task_status,
  data TEXT,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wct.id,
    wct.user_email,
    wct.user_query,
    wct.original_url,
    wct.received_at,
    wct.status,
    wct.data,
    wct.finished_at,
    wct.created_at,
    wct.updated_at
  FROM web_crawl_tasks wct
  WHERE wct.id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Find web crawl tasks by status function
-- Retrieves all web crawl tasks with a specific status
CREATE OR REPLACE FUNCTION find_web_crawl_tasks_by_status(p_status task_status)
RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  user_query TEXT,
  original_url VARCHAR(2048),
  received_at TIMESTAMP WITH TIME ZONE,
  status task_status,
  data TEXT,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wct.id,
    wct.user_email,
    wct.user_query,
    wct.original_url,
    wct.received_at,
    wct.status,
    wct.data,
    wct.finished_at,
    wct.created_at,
    wct.updated_at
  FROM web_crawl_tasks wct
  WHERE wct.status = p_status
  ORDER BY wct.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COUNT FUNCTIONS
-- =============================================================================

-- Count web crawl tasks by status function
-- Returns the number of web crawl tasks with a specific status
CREATE OR REPLACE FUNCTION count_web_crawl_tasks_by_status(p_status task_status)
RETURNS INTEGER AS $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM web_crawl_tasks 
  WHERE status = p_status;
  
  RETURN task_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION COMMENTS
-- =============================================================================

COMMENT ON FUNCTION find_web_crawl_task_by_id IS 'Retrieves a single web crawl task by its UUID';
COMMENT ON FUNCTION find_web_crawl_tasks_by_status IS 'Retrieves all web crawl tasks with a specific status';
COMMENT ON FUNCTION count_web_crawl_tasks_by_status IS 'Returns the number of web crawl tasks with a specific status';
