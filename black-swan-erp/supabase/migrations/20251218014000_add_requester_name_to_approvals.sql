-- Add requester_name column expected by frontend/services
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS requester_name text;
