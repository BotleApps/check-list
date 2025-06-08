# Database Schema Details

The app uses a PostgreSQL database managed by Supabase with the following tables:

- **Buckets**: User-specific buckets (`bucket_id`, `user_id`, `bucket_name`, `created_at`).
- **Tags_Master**: Reusable tags (`tag_id`, `name`, `created_at`).
- **Categories_Master**: Template categories (`category_id`, `name`, `user_id`, `created_at`).
- **Checklist_Headers**: Checklist metadata (`checklist_id`, `user_id`, `name`, `target_date`, `bucket_id`, `tags`, `created_at`, `updated_at`).
- **Checklist_Items**: Checklist items (`item_id`, `checklist_id`, `text`, `due_date`, `status`, `due_days`, `notes`, `created_at`, `updated_at`).
- **Checklist_Shares**: Shared checklists (`share_id`, `checklist_id`, `shared_with_user_id`, `share_token`, `permission`, `created_at`).
- **Checklist_Template_Headers**: Template metadata (`template_id`, `user_id`, `name`, `category_id`, `tags`, `created_at`, `updated_at`).
- **Checklist_Template_Items**: Template items (`item_id`, `template_id`, `text`, `status`, `due_days`, `notes`).

## Entities and Tables

### Users (Supabase’s auth.users)
*   **Purpose**: Managed by Supabase for authentication.
*   **Key Columns**:
    *   `id` (UUID, Primary Key): Unique user identifier.
    *   `email` (String): User’s email.
    *   `created_at` (Timestamp): Account creation time.
*   **Notes**: Referenced via `auth.users.id`.

### Buckets Table
*   **Purpose**: Store user-specific buckets for organizing checklists.
*   **Columns**:
    *   `bucket_id` (UUID, Primary Key): Unique identifier.
    *   `user_id` (UUID, Foreign Key, references `auth.users.id`, nullable): Owner (null for global buckets, if desired).
    *   `bucket_name` (String, Unique per user): Name of the bucket (e.g., “Shopping”, “Work”).
    *   `created_at` (Timestamp): Creation timestamp.
*   **Example**:
    ```
    bucket_id | user_id | bucket_name | created_at
    ----------+---------+-------------+--------------------
    uuid1     | user1   | Shopping    | 2025-06-08 11:00:00
    uuid2     | user1   | Work        | 2025-06-08 11:01:00
    ```

### Tags Master Table
*   **Purpose**: Store unique tags.
*   **Columns**:
    *   `tag_id` (UUID, Primary Key): Unique identifier.
    *   `name` (String, Unique): Tag name (e.g., “urgent”).
    *   `created_at` (Timestamp): Creation timestamp.
*   **Example**:
    ```
    tag_id  | name   | created_at
    --------+--------+-------------------
    uuid3   | urgent | 2025-06-08 11:02:00
    ```

### Categories Master Table
*   **Purpose**: Store categories for templates.
*   **Columns**:
    *   `category_id` (UUID, Primary Key): Unique identifier.
    *   `name` (String, Unique): Category name (e.g., “Personal”).
    *   `user_id` (UUID, Foreign Key, references `auth.users.id`, nullable): Owner (null for global).
    *   `created_at` (Timestamp): Creation timestamp.
*   **Example**:
    ```
    category_id | name     | user_id | created_at
    ------------+----------+---------+-------------------
    uuid4       | Personal | null    | 2025-06-08 11:03:00
    ```

### Checklist Headers Table
*   **Purpose**: Store checklist metadata, now with `bucket_id` instead of `bucket`.
*   **Columns**:
    *   `checklist_id` (UUID, Primary Key): Unique identifier.
    *   `user_id` (UUID, Foreign Key, references `auth.users.id`): Owner.
    *   `name` (String): Checklist name (e.g., “Grocery List”).
    *   `target_date` (Date, nullable): Target completion date.
    *   `bucket_id` (UUID, Foreign Key, references `Buckets.bucket_id`, nullable): Bucket for organization.
    *   `tags` (UUID[], nullable): Array of tag IDs from Tags Master.
    *   `created_at` (Timestamp): Creation timestamp.
    *   `updated_at` (Timestamp): Last updated timestamp.
*   **Example**:
    ```
    checklist_id | user_id | name          | target_date | bucket_id | tags          | created_at          | updated_at
    -------------+---------+---------------+-------------+-----------+---------------+--------------------+--------------------
    uuid5        | user1   | Grocery List  | 2025-06-15  | uuid1     | {uuid3}       | 2025-06-08 11:05:00 | 2025-06-08 11:06:00
    ```

### Checklist Items Table
*   **Purpose**: Store checklist items.
*   **Columns**:
    *   `item_id` (UUID, Primary Key): Unique identifier.
    *   `checklist_id` (UUID, Foreign Key, references `Checklist_Headers.checklist_id`): Parent checklist.
    *   `text` (String): Item description.
    *   `due_date` (Date, nullable): Item due date.
    *   `status` (Enum: ‘pending’, ‘completed’, ‘in_progress’, ‘canceled’): Item status.
    *   `due_days` (Integer, nullable): Days before target date.
    *   `notes` (Text, nullable): Additional notes.
    *   `created_at` (Timestamp): Creation timestamp.
    *   `updated_at` (Timestamp): Last updated timestamp.
*   **Example**:
    ```
    item_id | checklist_id | text       | due_date   | status    | due_days | notes             | created_at          | updated_at
    --------+-------------+------------+------------+-----------+----------+-------------------+--------------------+--------------------
    uuid6   | uuid5       | Buy milk   | 2025-06-14 | pending   | 1        | Check for 2% milk | 2025-06-08 11:07:00 | 2025-06-08 11:07:00
    ```

### Checklist Shares Table
*   **Purpose**: Manage shared checklists.
*   **Columns**:
    *   `share_id` (UUID, Primary Key): Unique identifier.
    *   `checklist_id` (UUID, Foreign Key, references `Checklist_Headers.checklist_id`): Shared checklist.
    *   `shared_with_user_id` (UUID, Foreign Key, references `auth.users.id`, nullable): Shared user.
    *   `share_token` (String, Unique): Token for URL access.
    *   `permission` (Enum: ‘view’, ‘edit’): Access level.
    *   `created_at` (Timestamp): Creation timestamp.
*   **Example**:
    ```
    share_id | checklist_id | shared_with_user_id | share_token | permission | created_at
    ---------+-------------+--------------------+-------------+------------+--------------------
    uuid7   | uuid5       | user2              | abc123      | view       | 2025-06-08 11:08:00
    ```

### Checklist Template Headers Table
*   **Purpose**: Store reusable templates with `category_id`.
*   **Columns**:
    *   `template_id` (UUID, Primary Key): Unique identifier.
    *   `user_id` (UUID, Foreign Key, references `auth.users.id`): Creator.
    *   `name` (String): Template name.
    *   `category_id` (UUID, Foreign Key, references `Categories_Master.category_id`, nullable): Category.
    *   `tags` (UUID[], nullable): Array of tag IDs.
    *   `created_at` (Timestamp): Creation timestamp.
    *   `updated_at` (Timestamp): Last updated timestamp.
*   **Example**:
    ```
    template_id | user_id | name            | category_id | tags          | created_at          | updated_at
    ------------+---------+-----------------+-------------+---------------+--------------------+--------------------
    uuid8       | user1   | Weekly Shopping | uuid4       | {uuid3}       | 2025-06-08 11:09:00 | 2025-06-08 11:09:00
    ```

### Checklist Template Items Table
*   **Purpose**: Store template items.
*   **Columns**:
    *   `item_id` (UUID, Primary Key): Unique identifier.
    *   `template_id` (UUID, Foreign Key, references `Checklist_Template_Headers.template_id`): Parent template.
    *   `text` (String): Item description.
    *   `status` (Enum: ‘pending’, ‘completed’, ‘in_progress’, ‘canceled’): Default status.
    *   `due_days` (Integer, nullable): Days before target date.
    *   `notes` (Text, nullable): Additional notes.
*   **Example**:
    ```
    item_id | template_id | text       | status  | due_days | notes
    --------+------------+------------+---------+----------+-------------------
    uuid9   | uuid8      | Buy milk   | pending | 1        | Check for 2% milk
    ```

## Relationships
- Users (`auth.users`) → Buckets: One-to-Many (one user owns many buckets).
- Users → Checklist Headers: One-to-Many (one user owns many checklists).
- Users → Checklist Template Headers: One-to-Many (one user creates many templates).
- Users → Categories Master: One-to-Many (one user creates user-specific categories).
- Buckets → Checklist Headers: One-to-Many (one bucket contains many checklists).
- Checklist Headers → Checklist Items: One-to-Many (one checklist has many items).
- Checklist Template Headers → Checklist Template Items: One-to-Many (one template has many items).
- Checklist Headers → Checklist Shares: One-to-Many (one checklist can be shared multiple times).
- Tags Master → Checklist Headers/Tags: Many-to-Many (via `tags` UUID array).
- Tags Master → Checklist Template Headers/Tags: Many-to-Many (via `tags` UUID array).
- Categories Master → Checklist Template Headers: One-to-Many (one category applies to many templates).
- Users → Checklist Shares: Many-to-Many (users share checklists with others).
