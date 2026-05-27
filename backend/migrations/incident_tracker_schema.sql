CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Complete Incident Tracker schema for the merged BSL backend.
-- Authentication and user ownership use admin_users.
-- Run this script from the backend/migrations directory if using mysql SOURCE.

SOURCE ./create_incident_tracker_tables.sql;
