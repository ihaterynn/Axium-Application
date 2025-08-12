-- Migration script to add title column to existing recipe_chats table
-- Run this if the table already exists without the title column

-- Add title column to recipe_chats table
ALTER TABLE recipe_chats 
ADD COLUMN IF NOT EXISTS title VARCHAR(500) DEFAULT 'Recipe Analysis';

-- Update existing records to have a default title
UPDATE recipe_chats 
SET title = 'Recipe Analysis' 
WHERE title IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'recipe_chats' 
AND column_name = 'title';