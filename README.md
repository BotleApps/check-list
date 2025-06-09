# CheckList App ✅

A modern, intuitive checklist application built with **React Native/Expo** and **Supabase**. Create, manage, and organize your tasks with a beautiful iOS Notes-inspired interface.

## ✨ Features

### 🎯 **Modern User Experience**
- **iOS Notes-style interface** with clean, intuitive design
- **Interactive checklist creation** with real-time multiline display
- **Smart input handling** - Enter key creates new items
- **Responsive design** optimized for web and mobile

### 🔐 **Complete Authentication System**
- **Email authentication** powered by Supabase
- **User registration** with email verification
- **Password reset** functionality
- **Secure session management**

### 📱 **Checklist Management**
- **Create and edit** checklists with ease
- **Organize with buckets** for better categorization
- **Template system** for reusable checklists
- **Progress tracking** with visual indicators

### 🚀 **Deployment Ready**
- **Netlify deployment** configured
- **React 19 compatibility** with legacy peer deps
- **Environment configuration** for multiple environments
- **Optimized build process**

## 🛠 Tech Stack

- **Frontend**: React Native/Expo, TypeScript
- **State Management**: Redux Toolkit with persistence
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: React Native StyleSheet
- **Icons**: Lucide React Native
- **Deployment**: Netlify
- **Development**: Expo CLI, Metro bundler

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or later)
- **npm** or yarn
- **Git**

### Development Setup

1. **Clone and install**:
   ```bash
   git clone https://github.com/your-username/check-list.git
   cd check-list
   npm install --legacy-peer-deps
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   - Web: http://localhost:8081
   - Mobile: Scan QR code with Expo Go app

### 🌐 Production Deployment

1. **Set up Supabase**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your Supabase credentials to .env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Deploy to Netlify**:
   ```bash
   # Build for production
   npm run build:web
   
   # Deploy (or connect GitHub repo to Netlify)
   ./deploy.sh
   ```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed deployment instructions.
3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Supabase Setup
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Enable the `uuid-ossp` extension in the Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Run the SQL schema to create tables (see [schema.sql](schema.sql)):
   ```sql
   -- Copy and paste the schema from schema.sql
   ```
4. Enable Row-Level Security (RLS) policies for secure access:
   ```sql
   ALTER TABLE Buckets ENABLE ROW LEVEL SECURITY;
   CREATE POLICY user_owns_bucket ON Buckets FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);
   -- Add similar policies for other tables
   ```
5. Configure Supabase Auth for user management (e.g., email or OAuth).

## Usage
1. **Create a Checklist**:
   - Sign in with Supabase Auth.
   - Enter a checklist name, select a bucket, and add tags.
   - Add items with text, due dates, status, and notes.
2. **Track Progress**:
   - Toggle item status (pending, in progress, completed, canceled).
   - View progress in the UI (e.g., completion percentage).
3. **Share Checklists**:
   - Generate a shareable link with view or edit permissions.
   - Share with other users or via public links.
4. **Use Templates**:
   - Create reusable templates in a category (e.g., “Personal”).
   - Instantiate checklists from templates, setting target dates.
5. **Organize**:
   - Assign checklists to buckets (e.g., “Shopping”).
   - Filter checklists by tags or buckets.

## Data Model
The app uses a PostgreSQL database managed by Supabase with the following tables:
- **Buckets**: User-specific buckets (`bucket_id`, `user_id`, `bucket_name`, `created_at`).
- **Tags_Master**: Reusable tags (`tag_id`, `name`, `created_at`).
- **Categories_Master**: Template categories (`category_id`, `name`, `user_id`, `created_at`).
- **Checklist_Headers**: Checklist metadata (`checklist_id`, `user_id`, `name`, `target_date`, `bucket_id`, `tags`, `created_at`, `updated_at`).
- **Checklist_Items**: Checklist items (`item_id`, `checklist_id`, `text`, `due_date`, `status`, `due_days`, `notes`, `created_at`, `updated_at`).
- **Checklist_Shares**: Shared checklists (`share_id`, `checklist_id`, `shared_with_user_id`, `share_token`, `permission`, `created_at`).
- **Checklist_Template_Headers**: Template metadata (`template_id`, `user_id`, `name`, `category_id`, `tags`, `created_at`, `updated_at`).
- **Checklist_Template_Items**: Template items (`item_id`, `template_id`, `text`, `status`, `due_days`, `notes`).


Entities and Tables
Users: Supabase’s auth.users (no custom table).
Buckets: Store user-specific buckets for organizing checklists.
Tags Master: Store reusable tags.
Categories Master: Store categories for templates.
Checklist Headers: Store checklists, now referencing Buckets for bucket_id.
Checklist Items: Store checklist items (unchanged).
Checklist Shares: Manage sharing (unchanged).
Checklist Template Headers: Store templates with category_id (unchanged).
Checklist Template Items: Store template items (unchanged).
Table Definitions
Users (Supabase’s auth.users)
Purpose: Managed by Supabase for authentication.
Key Columns:
id (UUID, Primary Key): Unique user identifier.
email (String): User’s email.
created_at (Timestamp): Account creation time.
Notes: Referenced via auth.users.id.
Buckets Table (New)
Purpose: Store user-specific buckets for organizing checklists.
Columns:
bucket_id (UUID, Primary Key): Unique identifier.
user_id (UUID, Foreign Key, references auth.users.id, nullable): Owner (null for global buckets, if desired).
bucket_name (String, Unique per user): Name of the bucket (e.g., “Shopping”, “Work”).
created_at (Timestamp): Creation timestamp.
Example:
text

Collapse

Wrap

Copy
bucket_id | user_id | bucket_name | created_at
----------+---------+-------------+--------------------
uuid1     | user1   | Shopping    | 2025-06-08 11:00:00
uuid2     | user1   | Work        | 2025-06-08 11:01:00
Tags Master Table (Unchanged)
Purpose: Store unique tags.
Columns:
tag_id (UUID, Primary Key): Unique identifier.
name (String, Unique): Tag name (e.g., “urgent”).
created_at (Timestamp): Creation timestamp.
Example:
text

Collapse

Wrap

Copy
tag_id  | name   | created_at
--------+--------+-------------------
uuid3   | urgent | 2025-06-08 11:02:00
Categories Master Table (Unchanged)
Purpose: Store categories for templates.
Columns:
category_id (UUID, Primary Key): Unique identifier.
name (String, Unique): Category name (e.g., “Personal”).
user_id (UUID, Foreign Key, references auth.users.id, nullable): Owner (null for global).
created_at (Timestamp): Creation timestamp.
Example:
text

Collapse

Wrap

Copy
category_id | name     | user_id | created_at
------------+----------+---------+-------------------
uuid4       | Personal | null    | 2025-06-08 11:03:00
Checklist Headers Table (Modified)
Purpose: Store checklist metadata, now with bucket_id instead of bucket.
Columns:
checklist_id (UUID, Primary Key): Unique identifier.
user_id (UUID, Foreign Key, references auth.users.id): Owner.
name (String): Checklist name (e.g., “Grocery List”).
target_date (Date, nullable): Target completion date.
bucket_id (UUID, Foreign Key, references Buckets.bucket_id, nullable): Bucket for organization.
tags (UUID[], nullable): Array of tag IDs from Tags Master.
created_at (Timestamp): Creation timestamp.
updated_at (Timestamp): Last updated timestamp.
Example:
text

Collapse

Wrap

Copy
checklist_id | user_id | name          | target_date | bucket_id | tags          | created_at          | updated_at
-------------+---------+---------------+-------------+-----------+---------------+--------------------+--------------------
uuid5        | user1   | Grocery List  | 2025-06-15  | uuid1     | {uuid3}       | 2025-06-08 11:05:00 | 2025-06-08 11:06:00
Checklist Items Table (Unchanged)
Purpose: Store checklist items.
Columns:
item_id (UUID, Primary Key): Unique identifier.
checklist_id (UUID, Foreign Key, references Checklist_Headers.checklist_id): Parent checklist.
text (String): Item description.
due_date (Date, nullable): Item due date.
status (Enum: ‘pending’, ‘completed’, ‘in_progress’, ‘canceled’): Item status.
due_days (Integer, nullable): Days before target date.
notes (Text, nullable): Additional notes.
created_at (Timestamp): Creation timestamp.
updated_at (Timestamp): Last updated timestamp.
Example:
text

Collapse

Wrap

Copy
item_id | checklist_id | text       | due_date   | status    | due_days | notes             | created_at          | updated_at
--------+-------------+------------+------------+-----------+----------+-------------------+--------------------+--------------------
uuid6   | uuid5       | Buy milk   | 2025-06-14 | pending   | 1        | Check for 2% milk | 2025-06-08 11:07:00 | 2025-06-08 11:07:00
Checklist Shares Table (Unchanged)
Purpose: Manage shared checklists.
Columns:
share_id (UUID, Primary Key): Unique identifier.
checklist_id (UUID, Foreign Key, references Checklist_Headers.checklist_id): Shared checklist.
shared_with_user_id (UUID, Foreign Key, references auth.users.id, nullable): Shared user.
share_token (String, Unique): Token for URL access.
permission (Enum: ‘view’, ‘edit’): Access level.
created_at (Timestamp): Creation timestamp.
Example:
text

Collapse

Wrap

Copy
share_id | checklist_id | shared_with_user_id | share_token | permission | created_at
---------+-------------+--------------------+-------------+------------+--------------------
uuid7   | uuid5       | user2              | abc123      | view       | 2025-06-08 11:08:00
Checklist Template Headers Table (Unchanged)
Purpose: Store reusable templates with category_id.
Columns:
template_id (UUID, Primary Key): Unique identifier.
user_id (UUID, Foreign Key, references auth.users.id): Creator.
name (String): Template name.
category_id (UUID, Foreign Key, references Categories_Master.category_id, nullable): Category.
tags (UUID[], nullable): Array of tag IDs.
created_at (Timestamp): Creation timestamp.
updated_at (Timestamp): Last updated timestamp.
Example:
text

Collapse

Wrap

Copy
template_id | user_id | name            | category_id | tags          | created_at          | updated_at
------------+---------+-----------------+-------------+---------------+--------------------+--------------------
uuid8       | user1   | Weekly Shopping | uuid4       | {uuid3}       | 2025-06-08 11:09:00 | 2025-06-08 11:09:00
Checklist Template Items Table (Unchanged)
Purpose: Store template items.
Columns:
item_id (UUID, Primary Key): Unique identifier.
template_id (UUID, Foreign Key, references Checklist_Template_Headers.template_id): Parent template.
text (String): Item description.
status (Enum: ‘pending’, ‘completed’, ‘in_progress’, ‘canceled’): Default status.
due_days (Integer, nullable): Days before target date.
notes (Text, nullable): Additional notes.
Example:
text

Collapse

Wrap

Copy
item_id | template_id | text       | status  | due_days | notes             |
--------+------------+------------+---------+----------+-------------------+
uuid9   | uuid8      | Buy milk   | pending | 1        | Check for 2% milk |
Relationships
Users (auth.users) → Buckets: One-to-Many (one user owns many buckets).
Users → Checklist Headers: One-to-Many (one user owns many checklists).
Users → Checklist Template Headers: One-to-Many (one user creates many templates).
Users → Categories Master: One-to-Many (one user creates user-specific categories).
Buckets → Checklist Headers: One-to-Many (one bucket contains many checklists).
Checklist Headers → Checklist Items: One-to-Many (one checklist has many items).
Checklist Template Headers → Checklist Template Items: One-to-Many (one template has many items).
Checklist Headers → Checklist Shares: One-to-Many (one checklist can be shared multiple times).
Tags Master → Checklist Headers/Tags: Many-to-Many (via tags UUID array).
Tags Master → Checklist Template Headers/Tags: Many-to-Many (via tags UUID array).
Categories Master → Checklist Template Headers: One-to-Many (one category applies to many templates).
Users → Checklist Shares: Many-to-Many (users share checklists with others).

See [schema.sql](schema.sql) for the full schema.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) and ensure tests pass (`npm test`).

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.