-- PostgreSQL Query Functions for Task Manager
-- This file contains all query functions for the Task Manager service

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

-- Find web crawl tasks by user email function
-- Retrieves all web crawl tasks for a specific user
CREATE OR REPLACE FUNCTION find_web_crawl_tasks_by_user_email(p_user_email VARCHAR(255))
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
  WHERE wct.user_email = p_user_email
  ORDER BY wct.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Find all web crawl tasks with pagination function
-- Retrieves all web crawl tasks with optional pagination
CREATE OR REPLACE FUNCTION find_all_web_crawl_tasks(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
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
  ORDER BY wct.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION find_web_crawl_task_by_id IS 'Retrieves a single web crawl task by its UUID';
COMMENT ON FUNCTION find_web_crawl_tasks_by_status IS 'Retrieves all web crawl tasks with a specific status';
COMMENT ON FUNCTION find_web_crawl_tasks_by_user_email IS 'Retrieves all web crawl tasks for a specific user';
COMMENT ON FUNCTION find_all_web_crawl_tasks IS 'Retrieves all web crawl tasks with optional pagination';
