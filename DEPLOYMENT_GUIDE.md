# Conversation History - Deployment Instructions

## 📋 Pre-Deployment Checklist

- [ ] You have Supabase project set up
- [ ] You have Supabase CLI installed
- [ ] You're authenticated with Supabase CLI
- [ ] You have access to Supabase SQL editor
- [ ] You have 5 minutes available

---

## 🚀 Deployment Steps

### Step 1: Create Database Table (2 minutes)

#### Method A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** on the left sidebar
3. Click **New Query** (top right)
4. Copy this SQL (from `supabase/CONVERSATION_HISTORY_SETUP.md`):

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

5. Click **Run** button
6. Verify success message appears
7. You should see new table in **Tables** section

#### Method B: Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Create a migration file
supabase migration new create_conversation_history

# Edit the created file and paste the SQL above

# Apply migration
supabase db push
```

---

### Step 2: Deploy Edge Function (1 minute)

#### Check Prerequisites

```bash
# Verify Supabase CLI is installed
supabase --version

# Should output: Supabase CLI version X.X.X

# Verify you're in the right directory
# Should have supabase/ folder
ls supabase/
```

#### Deploy Function

```bash
# Deploy the function
supabase functions deploy conversation-history

# Wait for deployment to complete
# You should see:
# "Function deployed successfully"
```

#### Verify Deployment

1. Go to Supabase Dashboard
2. Click **Functions** on left sidebar
3. You should see `conversation-history` in the list
4. Click on it to see details
5. Click **Deployment** tab to verify latest deployment

---

### Step 3: Verify Setup (1 minute)

#### Option A: Quick Test (Browser)

1. Open AILA app in your browser
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Log in with a test account
4. Click **History** button in sidebar
5. Should show **"No conversations yet"** message
6. Start typing a message
7. After sending, click **History** button again
8. Your conversation should appear in the list
9. ✅ Success!

#### Option B: Database Check

1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. New Query, paste:
   ```sql
   SELECT COUNT(*) as conversation_count 
   FROM conversation_history;
   ```
4. Click Run
5. Should return: `conversation_count: 0` (initially)
6. After chatting, should return: `conversation_count: 1`

---

## ⚙️ Configuration

### Optional: Adjust Auto-Save Timing

In `script.js`, find this line (around line 640):

```javascript
// Auto-save conversation after each message
setTimeout(() => {
  saveConversation();
}, 500);  // ← 500ms is default
```

Change `500` to different value:
- `300` - Save very frequently (more database writes)
- `500` - Balanced (recommended) ✅
- `1000` - Save less frequently (faster UI)
- `2000` - Save rarely (may lose recent messages)

**Recommendation: Keep at 500ms**

### Optional: Adjust History Limit

In `supabase/functions/conversation-history/index.ts`, find:

```typescript
.limit(50)  // ← Load 50 conversations max
```

Change `50` to different value:
- `25` - Load fewer (faster)
- `50` - Balanced (recommended) ✅
- `100` - Load more (slower)

**Recommendation: Keep at 50**

---

## 🔍 Troubleshooting

### Problem: "History" button not showing

**Solution:**
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check browser console for errors: `F12` → Console tab
4. Verify `index.html` has history button HTML

### Problem: "No conversations yet" forever

**Solution:**
1. Check if table exists:
   - Supabase Dashboard → Tables
   - Should see `conversation_history`
2. Verify RLS policies:
   - Click on `conversation_history` table
   - Click **RLS** button
   - Should see 4 policies enabled
3. Test with SQL:
   ```sql
   SELECT * FROM conversation_history LIMIT 1;
   ```

### Problem: "Error loading conversation history"

**Solution:**
1. Check edge function deployed:
   - Supabase Dashboard → Functions
   - Should see `conversation-history`
2. Check function logs:
   - Click on function
   - Click **Logs** tab
   - Look for errors
3. Verify CORS:
   - Function should return proper CORS headers
4. Check browser console:
   - Open DevTools (F12)
   - Check Network tab for failures

### Problem: Can't save conversations

**Solution:**
1. Check JWT token in browser:
   - Open DevTools (F12)
   - Application tab → Local Storage
   - Look for `sb-` keys
   - Should have `access_token`
2. Verify function deployment:
   ```bash
   supabase functions list
   # Should show conversation-history as ACTIVE
   ```
3. Check function logs for auth errors

### Problem: Conversations not searchable

**Solution:**
1. Make sure conversations have titles
2. Check search box input:
   - `#historySearch` element exists in HTML
3. Verify search function called:
   - Open DevTools Console
   - Type: `searchConversations("test")`
   - Should return results
4. Check table data:
   ```sql
   SELECT id, title FROM conversation_history LIMIT 5;
   ```

---

## 🧪 Test Cases

After deployment, test these scenarios:

### Test 1: Basic Save & Load
1. [ ] Start new chat
2. [ ] Send message: "Hello"
3. [ ] Receive response
4. [ ] Click History
5. [ ] See "Hello" as conversation title
6. [ ] Click conversation
7. [ ] Messages appear
8. [ ] ✅ Pass

### Test 2: Custom Title
1. [ ] Start new chat
2. [ ] Send: "How to learn Python?"
3. [ ] See title is "How to learn Python?"
4. [ ] Click rename (✏️)
5. [ ] Change to "Python Guide"
6. [ ] Verify updated in history
7. [ ] ✅ Pass

### Test 3: Search
1. [ ] Have 3+ conversations
2. [ ] Click History
3. [ ] Type "JavaScript" in search
4. [ ] Should filter to matching conversations
5. [ ] Clear search
6. [ ] Should show all again
7. [ ] ✅ Pass

### Test 4: Delete
1. [ ] Have a conversation
2. [ ] Hover and click delete (🗑️)
3. [ ] Confirm deletion
4. [ ] Should disappear from list
5. [ ] Load a different conversation
6. [ ] Deleted one should not appear
7. [ ] ✅ Pass

### Test 5: Multiple Users
1. [ ] User A logs in, creates conversation
2. [ ] User A logs out
3. [ ] User B logs in
4. [ ] User B's History should be empty
5. [ ] User A logs back in
6. [ ] User A sees their conversation
7. [ ] ✅ Pass (Security working!)

---

## 📊 Monitoring

### Check Database Growth

```sql
-- Check conversation count by user
SELECT user_id, COUNT(*) as conversation_count
FROM conversation_history
GROUP BY user_id
ORDER BY conversation_count DESC;

-- Check average messages per conversation
SELECT 
  COUNT(DISTINCT id) as conversation_count,
  AVG(jsonb_array_length(messages)) as avg_messages
FROM conversation_history;

-- Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('conversation_history')) as size;
```

### Performance Metrics

Monitor these in browser DevTools:

- **Network tab**: POST /conversation-history should be <1s
- **Console**: No error messages
- **Storage**: conversation_history data increasing

---

## ✅ Post-Deployment Checklist

- [ ] Table created successfully
- [ ] Edge function deployed and active
- [ ] History button appears in sidebar
- [ ] Can save conversations
- [ ] Can load conversations
- [ ] Can search conversations
- [ ] Can rename conversations
- [ ] Can delete conversations
- [ ] Multiple users isolated (no security breach)
- [ ] Performance acceptable

---

## 🎉 You're Done!

All users can now:
- ✅ Save conversations automatically
- ✅ View conversation history
- ✅ Search conversations
- ✅ Load old conversations
- ✅ Rename conversations
- ✅ Delete conversations
- ✅ Have conversations persist across devices

**Enjoy your new conversation history feature!**

---

## 📞 Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Check browser console for error messages
3. Check Supabase function logs
4. Check database for data integrity
5. Verify all RLS policies are enabled

---

**Last Updated**: January 8, 2026
**Version**: 1.0 Production
**Status**: Ready to Deploy
