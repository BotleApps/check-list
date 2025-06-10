# CheckList App ✅

A modern, feature-rich checklist application built with **React Native/Expo** and **Supabase**. Create, manage, and organize your tasks with a beautiful, intuitive interface featuring advanced sorting, grouping, validation, and sharing capabilities.

## ✨ Key Features

### 🎯 **Modern User Experience**
- **Clean, intuitive design** with iOS Notes-inspired interface
- **Dynamic grouping and sorting** - Group by folder, date, or custom criteria
- **Smart home screen** with floating action button and app branding
- **Real-time validation** with character counts and error feedback
- **Responsive design** optimized for web and mobile

### 🔐 **Complete Authentication System**
- **Email authentication** powered by Supabase
- **User registration** with email verification
- **Password reset** functionality
- **Secure session management**

### 📱 **Advanced Checklist Management**
- **Create and edit** checklists with comprehensive validation
- **Organize with folders** for better categorization
- **Advanced tagging system** with limits and validation
- **Due date tracking** with smart date grouping
- **Progress tracking** with visual indicators
- **Item limits and validation** to prevent data bloat

### 🗂️ **Smart Organization & Sorting**
- **Dynamic grouping** by folder, created date, due date, or modified date
- **Intelligent sorting** with ascending/descending options
- **Date-based grouping** (Today, Yesterday, specific dates)
- **Lazy loading** for performance with large datasets
- **"No folder/date" groups** automatically placed at the end

### 🤝 **Sharing & Templates**
- **Share checklists as templates** with category selection
- **Template system** for reusable checklists
- **Category management** for template organization
- **Duplicate functionality** for quick checklist copying

### 🛡️ **Comprehensive Validation System**
- **Input validation** with real-time feedback
- **Character limits** and counters for all text fields
- **Item limits** per checklist (max 100 items)
- **Folder limits** per user (max 50 folders)
- **Tag limits** per checklist (max 10) and per user (max 100)
- **Visual error indicators** with helpful error messages

### 🎨 **User Interface Enhancements**
- **Header edit mode** with explicit save/cancel actions
- **Modal-based selection** for folders, tags, and categories
- **Character count displays** with color-coded warnings
- **Validation error feedback** with clear messaging  
- **Floating action buttons** for quick access
- **Icon-based actions** for share, delete, and duplicate functions

## 🛠 Tech Stack

- **Frontend**: React Native/Expo, TypeScript
- **State Management**: Redux Toolkit with persistence
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: React Native StyleSheet
- **Icons**: Lucide React Native
- **Deployment**: Netlify (Web), Expo (Mobile)
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

2. **Set up environment**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your Supabase credentials to .env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   - Web: http://localhost:8081
   - Mobile: Scan QR code with Expo Go app

### 🌐 Production Deployment

1. **Build for production**:
   ```bash
   npm run build:web
   ```

2. **Deploy to Netlify**:
   ```bash
   ./deploy.sh
   ```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed deployment instructions.

## 📊 Database Schema

The CheckList App uses a robust PostgreSQL database with the following structure:

### Core Tables
- **`auth.users`** - User authentication (managed by Supabase)
- **`buckets`** - User folders for organizing checklists  
- **`tags_master`** - Global tag system for labeling
- **`categories_master`** - Categories for organizing templates
- **`checklist_headers`** - Checklist metadata and settings
- **`checklist_items`** - Individual checklist tasks
- **`checklist_shares`** - Sharing system for collaboration
- **`checklist_template_headers`** - Reusable template definitions
- **`checklist_template_items`** - Template task specifications

### Key Features
- **Row Level Security (RLS)** for data isolation
- **UUID-based primary keys** for all entities
- **Comprehensive validation** at database and application levels
- **Optimized indexes** for query performance
- **Foreign key constraints** for data integrity

For complete database setup instructions, schema definitions, and relationship diagrams, see [`DATABASE-SETUP.md`](./DATABASE-SETUP.md).

## 📚 Usage Guide

### Getting Started
1. **Sign up** with your email address
2. **Verify your email** through the confirmation link
3. **Create your first checklist** using the floating action button

### Organizing Your Checklists
- **Create folders** to group related checklists
- **Add tags** to label and categorize tasks
- **Set due dates** for time-sensitive items
- **Use templates** for recurring checklists

### Advanced Features
- **Group and sort** checklists by folder, date, or status
- **Share checklists** with others for collaboration
- **Create templates** from existing checklists
- **Track progress** with visual completion indicators

## 🧪 Development

### Project Structure
```
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens  
│   ├── checklist/         # Checklist detail screens
│   └── checklist-edit/    # Checklist creation/editing
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and validations
├── services/              # API service layer
├── store/                 # Redux store and slices
├── types/                 # TypeScript type definitions
└── supabase/             # Database migrations and config
```

### Key Architecture Decisions
- **Expo Router** for file-based navigation
- **Redux Toolkit** for predictable state management
- **Service layer** for API abstraction
- **Real-time validation** for better UX
- **Optimistic updates** for responsive interactions

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** with appropriate tests
4. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```
5. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

## 🔗 Links

- [Live Demo](https://your-demo-url.netlify.app)
- [Database Schema](./DATABASE-SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Testing Guide](./TESTING-GUIDE.md)
- [API Utilities](./API_UTILITIES_README.md)

---

**Built with ❤️ using React Native, Expo, and Supabase**
