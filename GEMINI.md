# Project Overview

This is a Next.js web application for a patient portal called TatvaCare. It seems to be a platform for managing patients, their medical records, and insurance claims. The application has different roles for users, such as admin, analyst, insurer, and doctor, each with different levels of access and functionality.

## Main Technologies

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **UI Components:** Radix UI, Recharts, Framer Motion
- **Linting:** ESLint

## Architecture

The application follows a standard Next.js project structure. The `app` directory contains the main pages and layouts. The `components` directory contains the reusable UI components. The `lib` directory contains the data generation logic. The `public` directory contains the static assets, such as images and fonts.

The application uses a role-based access control system to manage user permissions. The user's role is stored in the local storage and is used to determine which pages and components are accessible to the user.

# Building and Running

To build and run the project, you need to have Node.js and npm (or yarn/pnpm) installed on your machine.

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

3.  **Open the application:**

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Conventions

- **Coding Style:** The project uses TypeScript and follows the standard Next.js coding conventions.
- **Testing:** There are no explicit testing practices or frameworks configured in the project.
- **Contribution:** There are no contribution guidelines specified in the project.

## Demo Credentials

- **Admin:** `admin@demo.com` / `admin123`
- **Analyst:** `analyst@demo.com` / `analyst123`
- **Insurer:** `insurer@demo.com` / `insurer123`
