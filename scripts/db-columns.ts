// Auto-generated from scripts/db-columns.json
// Exported as a JS/TS module for use in scripts and tests.
export const dbColumns = [
  {
    "table_name": "app_admins",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "app_admins",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "certifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "certifications",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "certifications",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "certifications",
    "column_name": "authority",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "certifications",
    "column_name": "issued_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "certifications",
    "column_name": "expiry_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "certifications",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "certifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "education",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "education",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "education",
    "column_name": "school",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "education",
    "column_name": "degree",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "education",
    "column_name": "field_of_study",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "education",
    "column_name": "start_year",
    "data_type": "integer",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "education",
    "column_name": "end_year",
    "data_type": "integer",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "education",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "education",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 9
  },
  {
    "table_name": "education",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 10
  },
  {
    "table_name": "experiences",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "experiences",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "experiences",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "experiences",
    "column_name": "company",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "experiences",
    "column_name": "location",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "experiences",
    "column_name": "start_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "experiences",
    "column_name": "end_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "experiences",
    "column_name": "is_current",
    "data_type": "boolean",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "experiences",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 9
  },
  {
    "table_name": "experiences",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 10
  },
  {
    "table_name": "experiences",
    "column_name": "order_index",
    "data_type": "integer",
    "is_nullable": "YES",
    "ordinal_position": 11
  },
  {
    "table_name": "experiences",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 12
  },
  {
    "table_name": "languages",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "languages",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "languages",
    "column_name": "language",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "languages",
    "column_name": "proficiency",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "languages",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "languages",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "organizations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "organizations",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "organizations",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "organizations",
    "column_name": "authority",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "organizations",
    "column_name": "issued_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "organizations",
    "column_name": "expiry_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "organizations",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "organizations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "parsed_documents",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "parsed_documents",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "parsed_documents",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "parsed_documents",
    "column_name": "file_name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "parsed_documents",
    "column_name": "storage_path",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "parsed_documents",
    "column_name": "content_type",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "parsed_documents",
    "column_name": "size_bytes",
    "data_type": "integer",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "parsed_documents",
    "column_name": "text_extracted",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "parsed_documents",
    "column_name": "parsed_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 9
  },
  {
    "table_name": "parsed_documents",
    "column_name": "parser_version",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 10
  },
  {
    "table_name": "parsed_documents",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 11
  },
  {
    "table_name": "parsed_documents",
    "column_name": "error_text",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 12
  },
  {
    "table_name": "parsed_documents",
    "column_name": "parsed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 13
  },
  {
    "table_name": "parsed_documents",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 14
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "parsed_document_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "attempts",
    "data_type": "integer",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "worker",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "started_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "finished_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "parsing_jobs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "profiles",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "profiles",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "profiles",
    "column_name": "preferred_name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "profiles",
    "column_name": "headline",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "profiles",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "profiles",
    "column_name": "location",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "profiles",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 9
  },
  {
    "table_name": "profiles",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 10
  },
  {
    "table_name": "profiles",
    "column_name": "about",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 11
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 12
  },
  {
    "table_name": "profiles",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
 "is_nullable": "YES",
    "ordinal_position": 13
  },
  {
    "table_name": "projects",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "projects",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "projects",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "projects",
    "column_name": "authority",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "projects",
    "column_name": "issued_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "projects",
    "column_name": "expiry_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "projects",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "projects",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 8
  },
  {
    "table_name": "skills",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "skills",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "skills",
    "column_name": "skill",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "skills",
    "column_name": "confidence",
    "data_type": "numeric",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "skills",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "skills",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "users",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "users",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "users",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "users",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "volunteering",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "ordinal_position": 1
  },
  {
    "table_name": "volunteering",
    "column_name": "profile_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "ordinal_position": 2
  },
  {
    "table_name": "volunteering",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 3
  },
  {
    "table_name": "volunteering",
    "column_name": "authority",
    "data_type": "text",
    "is_nullable": "YES",
    "ordinal_position": 4
  },
  {
    "table_name": "volunteering",
    "column_name": "issued_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 5
  },
  {
    "table_name": "volunteering",
    "column_name": "expiry_date",
    "data_type": "date",
    "is_nullable": "YES",
    "ordinal_position": 6
  },
  {
    "table_name": "volunteering",
    "column_name": "raw_json",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "ordinal_position": 7
  },
  {
    "table_name": "volunteering",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "ordinal_position": 8
  }
]

export default dbColumns;
