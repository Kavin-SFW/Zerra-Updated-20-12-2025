# Zerra Database Schema Documentation

## Overview

This document describes the database schema for the Zerra analytics platform.

**Project ID:** `axnpahnmktvtmnkrgtba`  
**Supabase URL:** `https://axnpahnmktvtmnkrgtba.supabase.co`

---

## Public Schema Tables

### 1. `uploaded_files`

Stores metadata about uploaded CSV/Excel files.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `file_name` | text | NO | - | Original file name |
| `file_size` | bigint | NO | - | File size in bytes |
| `file_type` | text | NO | - | MIME type |
| `row_count` | integer | YES | - | Number of rows |
| `schema_info` | jsonb | YES | - | Column schema information |
| `user_id` | uuid | NO | - | Owner user ID |

**RLS:** Enabled - Users can only access their own files.

---

### 2. `data_records`

Stores the actual row data from uploaded files as JSONB.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `file_id` | uuid | NO | - | FK to uploaded_files |
| `row_data` | jsonb | NO | - | Row data as JSON |

**RLS:** Enabled - Users can only access records from their files.

**Current Row Count:** 256,275

---

### 3. `visualizations`

Stores chart configurations and insights.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `file_id` | uuid | NO | - | FK to uploaded_files |
| `chart_type` | text | NO | - | Type of chart |
| `chart_config` | jsonb | NO | - | Chart configuration |
| `insight` | text | YES | - | AI-generated insight |

**RLS:** Enabled - Users can only access their visualizations.

---

### 4. `data_sources`

Stores data source metadata (files, databases, APIs).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Data source name |
| `type` | text | NO | `'file'` | Type: file, database, api |
| `status` | text | NO | `'active'` | Status: active, syncing, error, inactive |
| `row_count` | integer | YES | `0` | Number of rows |
| `last_synced_at` | timestamptz | YES | - | Last sync timestamp |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `created_by` | uuid | NO | - | Owner user ID |
| `schema_info` | jsonb | YES | - | Schema information |
| `metadata` | jsonb | YES | - | Additional metadata |

**RLS:** Enabled - Users can only access their own data sources.

**Current Row Count:** 7

---

### 5. `industries`

Lookup table for industry types.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Industry name (unique) |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |

**RLS:** Enabled - Public read access.

**Current Row Count:** 10

**Values:**
- All Industries
- Retail
- Manufacturing
- Financial Services
- Healthcare
- Technology
- E-commerce
- Logistics
- Education
- Real Estate

---

### 6. `user_profiles`

Extended user profile information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | PK, FK to auth.users |
| `full_name` | text | YES | - | User's full name |
| `email` | text | YES | - | User's email |
| `avatar_url` | text | YES | - | Profile picture URL |
| `tenant_id` | uuid | YES | - | Multi-tenant support |
| `metadata` | jsonb | YES | `'{}'` | Additional metadata |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**RLS:** Enabled - Users can only access their own profile.

---

## Foreign Key Relationships

```
uploaded_files
    └── data_records (file_id → id)
    └── visualizations (file_id → id)

auth.users
    └── user_profiles (id → id)
```

---

## Migrations

| Version | Name |
|---------|------|
| 20260121064353 | create_required_tables |
| 20260121082925 | create_missing_tables_fixed |
