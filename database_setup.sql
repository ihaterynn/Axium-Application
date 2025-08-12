-- Smart Recipe Analyzer - Database Setup Script
-- Company: EasyRecipe
-- Database: Supabase PostgreSQL

-- Create recipe_chats table
CREATE TABLE IF NOT EXISTS recipe_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) DEFAULT 'Recipe Analysis',
    ingredients TEXT NOT NULL,
    recipes_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipe_chats_session_id ON recipe_chats(session_id);
CREATE INDEX IF NOT EXISTS idx_recipe_chats_created_at ON recipe_chats(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_recipe_chats_updated_at ON recipe_chats;
CREATE TRIGGER update_recipe_chats_updated_at
    BEFORE UPDATE ON recipe_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE recipe_chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (no authentication required)
-- Allow all operations for everyone since no auth is required
CREATE POLICY "Allow all operations for recipe_chats" ON recipe_chats
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to anon and authenticated users
GRANT ALL ON recipe_chats TO anon;
GRANT ALL ON recipe_chats TO authenticated;

-- Grant usage on sequence for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'recipe_chats'
ORDER BY ordinal_position;

-- Sample data insertion (optional - for testing)
-- INSERT INTO recipe_chats (session_id, ingredients, recipes_json) VALUES 
-- ('test-session-1', 'tomatoes, pasta, garlic', '{"recipes": [{"name": "Garlic Tomato Pasta", "ingredients": ["pasta", "tomatoes", "garlic"], "instructions": ["Boil pasta", "Sauté garlic", "Add tomatoes"], "cookingTime": "20 minutes", "difficulty": "Easy", "nutrition": {"calories": 350, "protein": "12g", "carbs": "65g"}}]}');