-- Migration: Add UUID auto-generation for web_crawl_tasks.id
-- Ensures pgcrypto is available and sets DEFAULT gen_random_uuid() for id

-- Step 1: Ensure extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Ensure table exists, then set default on id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'web_crawl_tasks'
  ) THEN
    -- Ensure column type is UUID
    ALTER TABLE public.web_crawl_tasks
      ALTER COLUMN id TYPE UUID USING id::UUID;

    -- Set default to gen_random_uuid()
    ALTER TABLE public.web_crawl_tasks
      ALTER COLUMN id SET DEFAULT gen_random_uuid();

    -- Add index on id (no-op if PK already handles it)
    CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_id ON public.web_crawl_tasks(id);
  END IF;
END $$;

-- Step 3: Sanity check function call
SELECT gen_random_uuid();


