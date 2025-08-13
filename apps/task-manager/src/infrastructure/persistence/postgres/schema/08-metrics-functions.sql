-- Generic function to get task count by status and hours
CREATE OR REPLACE FUNCTION get_tasks_count_by_status(
  status_value task_status,
  hours INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE status = status_value
    AND created_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get new tasks count for given hours
CREATE OR REPLACE FUNCTION get_new_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('new', hours);
END;
$$ LANGUAGE plpgsql;

-- Function to get completed tasks count for given hours
CREATE OR REPLACE FUNCTION get_completed_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('completed', hours);
END;
$$ LANGUAGE plpgsql;

-- Function to get error tasks count for given hours
CREATE OR REPLACE FUNCTION get_error_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('error', hours);
END;
$$ LANGUAGE plpgsql;

-- Function to get total tasks count created within given hours
CREATE OR REPLACE FUNCTION get_total_tasks_count_by_creation_time(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE created_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get all web crawl metrics for given hours
CREATE OR REPLACE FUNCTION get_web_crawl_metrics(hours INTEGER)
RETURNS TABLE(
  new_tasks_count INTEGER,
  completed_tasks_count INTEGER,
  error_tasks_count INTEGER,
  total_tasks_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    get_new_tasks_count(hours),
    get_completed_tasks_count(hours),
    get_error_tasks_count(hours),
    get_total_tasks_count_by_creation_time(hours);
END;
$$ LANGUAGE plpgsql;
