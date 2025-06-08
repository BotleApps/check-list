# Checklist App (using Bolt Expo Starter)

This project, the Checklist App, is built using the 'bolt-expo-starter' React Native template. A simple, collaborative checklist application built with React Native, Expo, and Supabase. Create, track, and share checklists for personal or team use, with support for reusable templates, buckets, categories, and tags.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Supabase Setup](#supabase-setup)
- [Usage](#usage)
- [Data Model](#data-model)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Create Checklists**: Build named checklists with items, due dates, statuses, and notes.
- **Organize**: Group checklists in user-defined buckets; tag checklists for easy filtering.
- **Track Progress**: Mark items as pending, in progress, completed, or canceled.
- **Share Checklists**: Share checklists via unique links (view or edit permissions).
- **Templates**: Create reusable checklist templates organized by categories.
- **Offline Support**: LocalStorage for offline checklist management (MVP).
- **Cloud Sync**: Supabase for user authentication, cloud storage, and real-time sharing.
- **Responsive Design**: Mobile-friendly UI.

## Tech Stack
- **Frontend**: React Native, Expo
- **Backend**: Supabase (PostgreSQL for data, Auth for user management)
- **Storage**: LocalStorage (MVP), Supabase PostgreSQL (cloud)
- **Deployment**: Expo Application Services (EAS) for mobile (iOS App Store, Google Play Store), Vercel/Netlify (for web version), Supabase (backend)

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Supabase account and project
- Git

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/checklist-app.git
   cd checklist-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   Note: For Expo projects, environment variables should be prefixed with `EXPO_PUBLIC_` to be accessible in the app. Ensure your Supabase client is configured to read these variables.
4. Start the development server:
   ```bash
   npx expo start
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
The app uses a PostgreSQL database managed by Supabase with the following main tables:
- **Users**: Managed by Supabase Auth (e.g., `auth.users`).
- **Buckets**: Stores user-specific buckets for organizing checklists.
- **Tags_Master**: Stores reusable tags that can be applied to checklists and templates.
- **Categories_Master**: Stores categories for organizing checklist templates.
- **Checklist_Headers**: Stores the main information for each checklist.
- **Checklist_Items**: Stores individual items within each checklist.
- **Checklist_Shares**: Manages sharing of checklists between users or via public links.
- **Checklist_Template_Headers**: Stores the main information for checklist templates.
- **Checklist_Template_Items**: Stores individual items within each checklist template.

### Relationships
Tables are linked via foreign keys, such as `user_id` to `auth.users`, `bucket_id` in `Checklist_Headers` to `Buckets`, etc., establishing one-to-many or many-to-many relationships as appropriate.

A detailed schema definition, including all columns, types, and constraints, should be maintained in a `schema.sql` file (once created and added to the repository) which serves as the definitive source for the database structure.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) (if available).
Currently, there is no test script configured in `package.json`. If you wish to add tests, please set up a testing framework (e.g., Jest or React Native Testing Library), write relevant tests, and add a test script to `package.json`.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.