-- PostgreSQL Permissions for LangGraph Monitoring
-- Grants necessary permissions for LangGraph to monitor long-running queries
-- This should be run as a superuser (e.g., postgres user) after database user is created
-- If run as non-superuser, it will fail gracefully and log warnings

-- Grant pg_monitor role (PostgreSQL 10+)
-- This role provides read access to monitoring views
DO $$
BEGIN
    -- Try to grant pg_monitor role
    BEGIN
        GRANT pg_monitor TO langgraph;
        RAISE NOTICE 'Granted pg_monitor role to langgraph user';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE WARNING 'Cannot grant pg_monitor: insufficient privileges. Run as superuser (postgres) or use fix-postgres-permissions.sh script';
        WHEN undefined_object THEN
            RAISE NOTICE 'pg_monitor role not available (older PostgreSQL version), granting direct permissions';
        WHEN OTHERS THEN
            RAISE WARNING 'Error granting pg_monitor: %', SQLERRM;
    END;
END $$;

-- Grant direct SELECT permissions on system views (for older PostgreSQL versions or if pg_monitor fails)
-- These permissions allow LangGraph to monitor database performance
DO $$
BEGIN
    BEGIN
        GRANT SELECT ON pg_stat_activity TO langgraph;
        GRANT SELECT ON pg_stat_database TO langgraph;
        GRANT SELECT ON pg_stat_database_conflicts TO langgraph;
        GRANT SELECT ON pg_stat_user_tables TO langgraph;
        GRANT SELECT ON pg_stat_user_indexes TO langgraph;
        RAISE NOTICE 'Granted SELECT permissions on system views to langgraph user';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE WARNING 'Cannot grant SELECT permissions: insufficient privileges. Run as superuser (postgres) or use fix-postgres-permissions.sh script';
        WHEN OTHERS THEN
            RAISE WARNING 'Error granting SELECT permissions: %', SQLERRM;
    END;
END $$;

-- Note: These permissions are read-only and safe to grant
-- They only allow monitoring, not modification of database structure or data
-- If this script fails due to insufficient privileges, run fix-postgres-permissions.sh instead
