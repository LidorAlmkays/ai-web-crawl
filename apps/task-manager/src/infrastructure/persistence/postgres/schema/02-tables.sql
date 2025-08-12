-- PostgreSQL Tables for Task Manager
-- This file contains all table definitions for the Task Manager service

-- Web Crawl Tasks Table
-- Stores all web crawling task information including status, results, and metadata
CREATE TABLE web_crawl_tasks (
  id UUID PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_query TEXT NOT NULL,
  original_url VARCHAR(2048) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status task_status NOT NULL DEFAULT 'new',
  data TEXT, -- Result data or error message
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_web_crawl_tasks_status ON web_crawl_tasks(status);
CREATE INDEX idx_web_crawl_tasks_user_email ON web_crawl_tasks(user_email);
CREATE INDEX idx_web_crawl_tasks_created_at ON web_crawl_tasks(created_at);
CREATE INDEX idx_web_crawl_tasks_received_at ON web_crawl_tasks(received_at);

-- Create composite indexes for common query patterns
CREATE INDEX idx_web_crawl_tasks_user_email_status ON web_crawl_tasks(user_email, status);

-- Add comments for documentation
COMMENT ON TABLE web_crawl_tasks IS 'Stores all web crawling task information including status, results, and metadata';
COMMENT ON COLUMN web_crawl_tasks.id IS 'Unique identifier for the web crawl task (UUID)';
COMMENT ON COLUMN web_crawl_tasks.user_email IS 'Email of the user who requested the web crawl task';
COMMENT ON COLUMN web_crawl_tasks.user_query IS 'User-provided query or description of the web crawl task';
COMMENT ON COLUMN web_crawl_tasks.original_url IS 'Original URL associated with the web crawl task';
COMMENT ON COLUMN web_crawl_tasks.received_at IS 'Timestamp when the web crawl task was received';
COMMENT ON COLUMN web_crawl_tasks.status IS 'Current status of the web crawl task';
COMMENT ON COLUMN web_crawl_tasks.data IS 'Result data for successful web crawl tasks or error message for failed tasks';
COMMENT ON COLUMN web_crawl_tasks.finished_at IS 'Timestamp when the web crawl task was completed';
COMMENT ON COLUMN web_crawl_tasks.created_at IS 'Timestamp when the web crawl task record was created';
COMMENT ON COLUMN web_crawl_tasks.updated_at IS 'Timestamp when the web crawl task record was last updated';
