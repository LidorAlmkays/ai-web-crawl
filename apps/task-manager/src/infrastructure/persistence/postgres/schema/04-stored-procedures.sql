-- PostgreSQL Stored Procedures for Task Manager
-- This file contains all stored procedures for the Task Manager service

-- Create web crawl task procedure
-- Inserts a new web crawl task into the database
CREATE OR REPLACE FUNCTION create_web_crawl_task(
  p_user_email VARCHAR(255),
  p_user_query TEXT,
  p_original_url VARCHAR(2048),
  p_received_at TIMESTAMP WITH TIME ZONE,
  p_status task_status,
  p_created_at TIMESTAMP WITH TIME ZONE,
  p_updated_at TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO web_crawl_tasks (
    id,
    user_email,
    user_query,
    original_url,
    received_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_id,
    p_user_email,
    p_user_query,
    p_original_url,
    p_received_at,
    p_status,
    p_created_at,
    p_updated_at
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Update web crawl task procedure
-- Updates an existing web crawl task with new status and result data
CREATE OR REPLACE FUNCTION update_web_crawl_task(
  p_id UUID,
  p_status task_status,
  p_data TEXT,
  p_finished_at TIMESTAMP WITH TIME ZONE,
  p_updated_at TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
  UPDATE web_crawl_tasks 
  SET 
    status = p_status,
    data = p_data,
    finished_at = p_finished_at,
    updated_at = p_updated_at
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION create_web_crawl_task IS 'Creates a new web crawl task in the database';
COMMENT ON FUNCTION update_web_crawl_task IS 'Updates an existing web crawl task with new status and result data';
