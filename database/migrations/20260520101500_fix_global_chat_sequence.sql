-- Description: Fixes the sequence generator for global_chat_messages to match the maximum ID in the table.
-- check: { "table": "global_chat_messages", "column": "id" }
SELECT setval('global_chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM global_chat_messages), 0) + 1, false);
