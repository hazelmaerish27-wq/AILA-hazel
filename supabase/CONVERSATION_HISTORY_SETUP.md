# Conversation History Setup

To set up conversation history, run the following SQL in your Supabase SQL editor:

```sql
-- Create conversation_history table
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_conversation_user_id ON conversation_history(user_id);
CREATE INDEX idx_conversation_updated_at ON conversation_history(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own conversations
CREATE POLICY "Users can view their own conversations"
  ON conversation_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own conversations
CREATE POLICY "Users can insert their own conversations"
  ON conversation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can update their own conversations
CREATE POLICY "Users can update their own conversations"
  ON conversation_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations"
  ON conversation_history
  FOR DELETE
  USING (auth.uid() = user_id);
```

After running this SQL, the conversation history feature will be fully functional!
