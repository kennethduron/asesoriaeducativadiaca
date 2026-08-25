-- Client codes are allocated only through the SECURITY DEFINER generator.
-- API roles must not be able to advance the underlying sequence directly.
revoke all on sequence public.client_code_seq from public, anon, authenticated, service_role;
