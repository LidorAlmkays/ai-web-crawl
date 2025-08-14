-- Rollback Migration: Revert result column back to data in web_crawl_tasks table
-- This migration reverts the column name and all dependent functions

-- Rename the column back
ALTER TABLE web_crawl_tasks RENAME COLUMN result TO data;

-- Update the column comment
COMMENT ON COLUMN web_crawl_tasks.data IS 'Task data (crawl results, error messages, etc.)';

-- Update the update_web_crawl_task function
CREATE OR REPLACE FUNCTION update_web_crawl_task(
    p_id UUID,
    p_status task_status,
    p_data TEXT,
    p_finished_at TIMESTAMP,
    p_updated_at TIMESTAMP
) RETURNS VOID AS $$
BEGIN
    UPDATE web_crawl_tasks 
    SET 
        status = p_status,
        data = p_data,
        finished_at = p_finished_at,
        updated_at = p_updated_at
    WHERE id = p_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task with id % not found', p_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the find_web_crawl_task_by_id function
CREATE OR REPLACE FUNCTION find_web_crawl_task_by_id(p_id UUID)
RETURNS TABLE (
    id UUID,
    user_email VARCHAR,
    user_query TEXT,
    original_url VARCHAR,
    status task_status,
    data TEXT,
    finished_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wct.id,
        wct.user_email,
        wct.user_query,
        wct.original_url,
        wct.status,
        wct.data,
        wct.finished_at,
        wct.created_at,
        wct.updated_at
    FROM web_crawl_tasks wct
    WHERE wct.id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Update the completed_web_crawl_tasks view
CREATE OR REPLACE VIEW completed_web_crawl_tasks AS
SELECT 
    id,
    user_email,
    user_query,
    original_url,
    status,
    data,
    finished_at,
    created_at,
    updated_at
FROM web_crawl_tasks
WHERE status IN ('completed_success', 'completed_error');













