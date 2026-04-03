alter table notifications
add column if not exists read_at timestamptz;

create index if not exists notifications_unread_idx
on notifications (user_id, read_at);
