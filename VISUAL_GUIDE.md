# Conversation History - Visual Guide

## Sidebar Layout

```
┌─────────────────────────────────┐
│     AILA Admin Dashboard        │
├─────────────────────────────────┤
│  [≡] [+] New Chat               │
│                                 │
│  [✉] Contact Developer          │
│                                 │
│  [🛠] Dev Tools                  │
│                                 │
│  [⏱] History    ← NEW BUTTON     │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Conversation History   │ NEW │ ← Expands when clicked
│  ├─────────────────────────────┤│
│  │ 🔍 Search conversations...  ││
│  ├─────────────────────────────┤│
│  │ • How to learn JavaScript ✏️ 🗑│
│  │ • Python Tutorial          ✏️ 🗑│
│  │ • Web Development Basics   ✏️ 🗑│
│  │ • Database Design          ✏️ 🗑│
│  │                             │ ← Action buttons appear on hover
│  │ No more conversations...    │
│  └─────────────────────────────┘│
│                                 │
│  [Avatar] User Name             │
│           user@email.com        │
└─────────────────────────────────┘
```

## Conversation Item Interaction

### Default State
```
┌─────────────────────────────────┐
│ • How to learn JavaScript       │
└─────────────────────────────────┘
```

### On Hover
```
┌─────────────────────────────────┐
│ • How to learn JavaScript ✏️ 🗑│
└─────────────────────────────────┘
```

### When Active (Loaded)
```
┌─────────────────────────────────┐
│ • How to learn JavaScript ✏️ 🗑│  ← Highlighted
│   (border color: cyan)          │
└─────────────────────────────────┘
```

## Search Functionality

```
┌──────────────────────────────────┐
│ 🔍 Search conversations...       │
│    ▼                             │
│    User types: "javascript"      │
│    ▼                             │
│ Results filtered in real-time:   │
├──────────────────────────────────┤
│ • How to learn JavaScript        │
│ • JavaScript Best Practices      │
│                                  │
│ Other 2 conversations hidden     │
└──────────────────────────────────┘
```

## Rename Action

```
User hovers and clicks ✏️
        ▼
┌─────────────────────────────┐
│ Rename Conversation         │
├─────────────────────────────┤
│ Enter new title:            │
│                             │
│ [Learning JavaScript Guide] │
│                             │
│ [Cancel]  [Rename]          │
└─────────────────────────────┘
```

## Delete Action

```
User hovers and clicks 🗑️
        ▼
┌─────────────────────────────┐
│ Delete Conversation?        │
├─────────────────────────────┤
│ Delete "JavaScript Guide"?  │
│                             │
│ [Cancel]  [Delete]          │
└─────────────────────────────┘
```

## Message Auto-Save Flow

```
User types message in input box
        ▼
User presses Send
        ▼
appendMessage("Who...", "user") called
        ▼
Message added to DOM
        ▼
500ms timeout started
        ▼
saveConversation() executed
        ▼
POST /conversation-history
        ▼
Edge function validates JWT
        ▼
Database INSERT/UPDATE
        ▼
✅ Conversation saved silently
   (No loading spinner!)
```

## Database Structure

```
conversation_history Table
┌──────────────────────────────────┐
│ id (UUID)                        │
│ ├─ a1b2c3d4-e5f6-7890-abcd...  │
│                                  │
│ user_id (UUID) ──→ auth.users   │
│ ├─ user-123                      │
│                                  │
│ title (TEXT)                     │
│ ├─ "How to learn JavaScript"     │
│                                  │
│ messages (JSONB Array)           │
│ ├─ [{role: "user", content: "How to..."}]
│ ├─ [{role: "assistant", content: "Here..."}]
│ └─ [... more messages ...]       │
│                                  │
│ created_at (TIMESTAMP)           │
│ ├─ 2026-01-08 10:30:00          │
│                                  │
│ updated_at (TIMESTAMP)           │
│ └─ 2026-01-08 10:45:30          │
└──────────────────────────────────┘
```

## Component Architecture

```
                    ┌─────────────┐
                    │  AILA User  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
        ┌──────────→│  Sidebar    │
        │           │  Navigation │
        │           └──────┬──────┘
        │                  │
        │                  ▼
        │           ┌─────────────────┐
        │           │ History Button  │
        │           │  (Click Toggle) │
        │           └────────┬────────┘
        │                    │
        │                    ▼
        │           ┌──────────────────┐
        │           │ History Section  │
        │           │ (Show/Hide Panel)│
        │           └─────────┬────────┘
        │                     │
        │    ┌────────────────┼────────────────┐
        │    │                │                │
        │    ▼                ▼                ▼
        │  Search      Load         Delete/
        │  Function   Function       Rename
        │    │          │               │
        │    │          │               │
        └────┼──────────┼───────────────┘
             │          │
             ▼          ▼
         ┌──────────────────────┐
         │  Edge Function       │
         │  conversation-       │
         │  history/index.ts    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Supabase Database   │
         │  conversation_       │
         │  history table       │
         └──────────────────────┘
```

## State Management

```
Global Variables
├── currentConversationId  (UUID | null)
│   └─ Tracks active conversation
│
└── conversationMessages   (Array)
    └─ Holds all messages for current conversation
```

## Security Boundaries

```
                ┌─────────────────────────┐
                │  User Makes Request     │
                └────────────┬────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ JWT Token Included?  │
                  │ (Authorization)      │
                  └──────┬───┬──────┬────┘
                     YES │   │ NO   │
                         ▼   ▼     ▼
                      Process Reject
                         │
                         ▼
              ┌──────────────────────────┐
              │ RLS Policy Check         │
              │ (user_id = auth.uid())  │
              └──────┬───┬───────────┬───┘
                 YES │   │ NO        │
                     ▼   ▼          ▼
                  Allow Deny
                     │
                     ▼
            ┌─────────────────────┐
            │ Database Response   │
            │ (Encrypted)         │
            └─────────────────────┘
```

## Performance Optimization

```
Auto-Save Timeline
│
├─ 0ms    User sends message
├─ 100ms  appendMessage() executed
├─ 200ms  DOM updated
├─ 500ms  Timeout fires
│         ▼
│    saveConversation() called
│         ▼
│    POST /conversation-history
│         ▼
│ 600ms   Edge function processes
│         ▼
│ 700ms   Database INSERT/UPDATE
│         ▼
│ 800ms   Response received
│         ▼
│ 900ms   ✅ Complete!
│         (No UI blocking!)
│
└─ All subsequent messages same timeline

User sees:
- Instant message in chat ✓
- No loading spinner ✓
- Smooth experience ✓
- Background save ✓
```

## Feature Matrix

| Feature | Implementation | Status |
|---------|---|---|
| Auto-Save | Debounced 500ms | ✅ |
| Search | Real-time filtering | ✅ |
| Load | Click to restore | ✅ |
| Rename | Prompt dialog | ✅ |
| Delete | Confirmation required | ✅ |
| Titles | Auto-generated | ✅ |
| Security | RLS + JWT | ✅ |
| Mobile | Responsive | ✅ |
| Performance | Optimized | ✅ |

## CSS Class Hierarchy

```
.history-section
├── .history-header
│   ├── h3
│   └── .history-search
│
├── .history-list
│   └── .history-item (repeating)
│       ├── .history-item-title
│       └── .history-item-actions
│           ├── .history-action-btn (rename)
│           └── .history-action-btn.delete
│
└── Scrollbar (webkit)
    ├── ::-webkit-scrollbar
    ├── ::-webkit-scrollbar-track
    ├── ::-webkit-scrollbar-thumb
    └── ::-webkit-scrollbar-thumb:hover
```

---

This visual guide helps understand the complete system architecture and user interactions!
