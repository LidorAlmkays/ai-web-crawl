-- PostgreSQL Count Functions for Task Manager
-- This file contains all count functions for the Task Manager service

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

-- Count all web crawl tasks function
-- Returns the total number of web crawl tasks in the database
CREATE OR REPLACE FUNCTION count_all_web_crawl_tasks()
RETURNS INTEGER AS $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM web_crawl_tasks;
  
  RETURN task_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION count_web_crawl_tasks_by_status IS 'Returns the number of web crawl tasks with a specific status';
COMMENT ON FUNCTION count_all_web_crawl_tasks IS 'Returns the total number of web crawl tasks in the database';
