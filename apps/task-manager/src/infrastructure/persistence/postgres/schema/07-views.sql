-- PostgreSQL Views for Task Manager
-- This file contains all view definitions for the Task Manager service

-- Create view for completed web crawl tasks (both success and error)
-- Provides a convenient way to query completed tasks with additional computed fields
CREATE VIEW completed_web_crawl_tasks AS
SELECT 
  id,
  user_email,
  user_query,
  original_url,
  received_at,
  status,
  data,
  finished_at,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'completed' THEN true
    ELSE false
  END as is_successful,
  EXTRACT(EPOCH FROM (finished_at - received_at)) as duration_seconds
FROM web_crawl_tasks 
WHERE status IN ('completed', 'error');

-- Create view for pending web crawl tasks
-- Provides a convenient way to query pending tasks with age information
CREATE VIEW pending_web_crawl_tasks AS
SELECT 
  id,
  user_email,
  user_query,
  original_url,
  received_at,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - received_at)) as age_seconds
FROM web_crawl_tasks 
WHERE status = 'new';

-- Create view for web crawl task statistics
-- Provides aggregated statistics for web crawl tasks
CREATE VIEW web_crawl_task_statistics AS
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_tasks,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_tasks,
  ROUND(
    COUNT(CASE WHEN status IN ('completed', 'error') THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as completion_rate
FROM web_crawl_tasks;

-- Add comments for documentation
COMMENT ON VIEW completed_web_crawl_tasks IS 'View of all completed web crawl tasks with success indicator and duration';
COMMENT ON VIEW pending_web_crawl_tasks IS 'View of all pending web crawl tasks with age information';
COMMENT ON VIEW web_crawl_task_statistics IS 'View providing web crawl task count statistics and completion rates';
