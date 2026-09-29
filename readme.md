# FinX

FinX is a personal finance management web application built around a simple idea: keeping track of money should not feel like maintaining a spreadsheet. The project was started from my own experience of recording income and expenses in Notes and Microsoft Excel. While those tools were enough for basic record keeping, they became repetitive and difficult to maintain as the amount of financial data increased. FinX is my attempt to turn that process into a structured software system where recording financial activity is simple, while the collected data can later be used to understand spending habits, cash flow, budgets, and other parts of personal finance.

The project is designed as a practical full-stack application rather than a small CRUD demonstration. The goal is to combine authentication, financial record management, database design, API development, validation, server-state management, analytics, and a user-focused interface into one product. I am also intentionally keeping the architecture understandable and maintainable instead of introducing abstractions or libraries only for the sake of complexity.

Live Website: [here](https://finx-fawn.vercel.app)  
Client source code: [here](https://github.com/efaaz/finx-v2)  
server source code: [here](https://github.com/efaaz/finance-management-server)

## Overview

FinX allows users to keep a structured record of their day-to-day financial activity, including income and expenses. Transactions can be organized using categories, making it possible to move from simple record keeping to useful financial analysis. The dashboard is intended to act as the starting point after login, giving users a quick view of the current financial period through income, spending, net cash flow, savings-related information, and category-level spending. Additional areas of the application are designed around budgeting, financial records, and support, with the long-term goal of making FinX useful as an everyday personal finance tool rather than simply a place to store transaction data.

The application follows a separate frontend and backend architecture. The frontend is responsible for the user interface and client-side interactions, while the backend exposes REST APIs and handles authentication, business logic, database operations, and file-related services. This separation allows both parts of the application to evolve independently and also reflects the architecture I am interested in using for larger software projects.

## Problem

FinX started from a very ordinary problem. I have always been careful about tracking my money, and for a long time I used Notes and Microsoft Excel to record income and expenses. The approach worked, but it required too much manual effort. Every new transaction meant another entry, categories had to be managed manually, and understanding the overall picture required additional spreadsheet work. I also explored existing finance management tools, but many of them felt either too complicated for everyday use or did not match the way I personally wanted to track financial information. Instead of continuing to adapt my process around those tools, I decided to build a system around the process itself.

The main problem, therefore, was not simply "how to store an expense." It was how to make financial record keeping consistent enough that the resulting data becomes useful. A good finance application should make the first step effortless while still creating enough structure for meaningful analysis later. That became one of the main principles behind FinX.

## Goals

The primary goal of FinX is to make personal financial record keeping simple, structured, and useful. I want users to be able to record financial activity without unnecessary friction, organize transactions in a consistent way, and then return to the application to understand what their financial data says about their habits.

Another goal is to use the project as a real-world engineering exercise. Instead of building isolated features, I am using FinX to practice the full software development process: deciding requirements, designing the data model, creating APIs, implementing authentication, handling loading and error states, managing asynchronous client data, thinking about future scalability, and gradually improving the product based on the problems I discover during development.

## Core Features

### Authentication

FinX provides user authentication so that financial information remains associated with an individual account. The backend uses token-based authentication with HTTP-only cookies rather than exposing authentication tokens to JavaScript-accessible browser storage. Protected resources are validated through backend middleware before user-specific operations are allowed.

### Transaction Management

Users can record income and expenses and keep a history of their financial activity. Transactions contain structured information such as amount, category, date, and other relevant details so that the same records can later be used for summaries and analytics instead of being treated as unstructured notes.

### Category Management

Financial transactions can be organized through categories. This creates a consistent relationship between individual transactions and broader spending groups, making it possible to answer questions such as how much was spent on food, transport, shopping, bills, or other areas during a selected period.

### Dashboard

The dashboard is designed as the main overview page after authentication. It focuses on information that can be understood quickly, such as total income, total spending, net cash flow, savings-related metrics, and spending by category. The intention is to keep the dashboard useful without turning the home page into a collection of unrelated charts.

### Spending Analytics

FinX uses transaction data to calculate summaries and category-level spending. The analytics layer is intended to evolve over time, with additional views for spending trends, income versus expense patterns, and other financial insights being added as the underlying data model matures.

### Budget Management

The budget section is designed to help users define planned spending limits and compare those limits with actual transaction data. This connects budgeting to real recorded behavior instead of treating a budget as a completely separate feature.

### Profile and Media Support

User profile information can include an avatar, and image handling is integrated with Cloudinary so that uploaded profile images do not have to be stored directly on the application server.

## Architecture

FinX uses a decoupled architecture with a Next.js frontend and an Express.js backend. The frontend is built with Next.js and TypeScript and communicates with the backend through HTTP APIs. The backend is built with Node.js and Express.js and is responsible for authentication, request handling, business logic, validation, database access, and other application services. MongoDB is used as the primary database.

The current repository contains the backend application. The frontend is maintained separately, which allows the client and API layers to be deployed independently. This structure also makes it possible to treat the backend as an API service that could support other clients in the future without coupling the business logic directly to the Next.js application.

A simplified view of the system looks like this:

```text
                         FinX
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Next.js Frontend             Express API
        TypeScript                  Node.js / Express
             │                           │
             │                    ┌──────┴──────┐
             │                    │             │
             │               Authentication   Services
             │                    │             │
             │                    └──────┬──────┘
             │                           │
             │                        MongoDB
             │
             └──────────── HTTP API ────────────┘
```

## Backend Structure

The backend follows a modular structure where controllers, routes, models, middleware, database configuration, utility functions, and external services are kept in separate areas. The aim is not to create unnecessary layers, but to keep responsibilities clear as the application grows.

```text
src/
├── controllers/
├── db/
├── middlewares/
├── model/
├── routes/
├── utils/
├── constant.js
├── dev.js
├── ExpressApp.js
└── index.js
```

For development `EpressApp.js` is responsible for configuring the Express application and middleware, while `dev.js` acts as the server entry point. but in production deployment `index.js` is the entry point of the application. Route modules expose the API endpoints, controllers contain request-level business logic, models define the database representation, and utility and middleware modules provide reusable application-level functionality.

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- HTTP-only cookies
- Cloudinary
- Multer
- CORS
- Nodemon
- Prettier

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Axios
- Lucide React

The frontend and backend are maintained as separate repositories, allowing each application to have its own deployment and development lifecycle.

## Authentication and Security

Authentication is handled by the backend using access and refresh token concepts. Tokens are stored through HTTP-only cookies so that application JavaScript does not need direct access to the token values. This approach is intended to reduce the exposure of authentication credentials compared with storing tokens in localStorage.

Protected API routes use authentication middleware to identify the current user before processing user-specific operations. Authentication decisions are therefore made by the backend instead of relying only on frontend route protection.

Security in FinX is an ongoing part of development rather than something treated as a finished checklist. As the project grows, additional work includes improving validation, handling authorization consistently, securing cookies and CORS configuration for production, and reviewing how sensitive financial data is processed and exposed.

## Data Modeling

One of the more important parts of FinX is the data model. Financial data looks simple at first, but decisions about how transactions and categories relate to one another have consequences for future analytics. I therefore keep transaction information structured and use identifiers to connect transactions with category records rather than duplicating category information throughout every document.

This approach makes it possible to change category metadata later without having to rewrite every historical transaction. It also keeps the transaction document focused on transaction-specific information while the category collection remains responsible for category-specific data.

The application is still evolving, so some parts of the data model may change as new requirements appear. I am intentionally trying to make those changes incremental rather than designing the entire system around assumptions about features that do not exist yet.

## API

The backend exposes REST-style endpoints for application resources such as authentication, users, transactions, categories, daily records, and spending records. Each resource is separated into routes and controllers so that the API remains easier to navigate as the number of operations increases.

A typical request flow looks like this:

```text
Client
  │
  ▼
Route
  │
  ▼
Authentication / Validation Middleware
  │
  ▼
Controller
  │
  ▼
Service / Model Operations
  │
  ▼
MongoDB
  │
  ▼
API Response
```

The API response structure also uses reusable response and error utilities so that successful and failed requests can follow a consistent format.

## State Management

The frontend uses TanStack Query for server state rather than trying to store API results entirely inside local React state. This allows asynchronous data to have a clear lifecycle with loading, error, caching, mutation, and refetch behavior.

For forms, React Hook Form and Zod are used together so that user input can be validated at the client boundary before requests are sent to the backend. Backend validation remains necessary because client-side validation is not a security boundary, but handling obvious validation errors in the frontend provides a better user experience.

## Development

Clone the repository:

```bash
git clone <your-server-side-repository-url>
cd server-side
```

Install dependencies:

```bash
npm install
```

Create your environment file and add the configuration required by your local environment. The exact environment variable names depend on the current application configuration, but typically include database connection information, authentication secrets, Cloudinary credentials, and frontend or CORS-related settings.

Run the development server:

```bash
npm run dev
```

The project uses Nodemon during development, so changes to the backend source files can restart the server automatically.

For production-style local execution:

```bash
npm start
```

## Environment Variables

FinX requires environment-specific configuration and secrets that should not be committed to the repository. Keep local development values in a `.env` file and configure production values through the hosting provider's environment variable settings.

A typical configuration may look like:

```env
PORT=5000
MONGODB_URI=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CORS_ORIGIN=
```

The names above should match the variables used by the current codebase. Never commit real secrets, database credentials, token secrets, or Cloudinary credentials to Git.

## Deployment

The backend is designed to run as a Node.js/Express application. For a traditional production deployment, the server can be started with:

```bash
npm start
```

The production server should use the hosting provider's assigned `PORT` environment variable instead of depending on a fixed local development port.

For example:

```js
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

The frontend and backend can be deployed independently because they are maintained as separate applications. Production CORS settings, cookie configuration, database credentials, and external service credentials should be configured through the deployment platform rather than committed to source control.

## Error Handling

The backend uses reusable error and response utilities to avoid repeating the same response logic throughout every controller. Errors are passed through the application's middleware pipeline where they can be transformed into predictable API responses.

This becomes particularly important in a finance application because failures should not silently produce incorrect financial records. The API needs to distinguish validation problems, authentication failures, missing resources, database failures, and unexpected server errors so the frontend can respond appropriately.

## Project Challenges

One of the hardest parts of developing FinX has been realizing that a finance application is less about creating forms and more about making careful decisions around data. A transaction model that feels convenient today can make analytics or future features difficult later, so I have had to think about relationships between users, categories, transactions, and spending records before simply implementing the UI.

Authentication and frontend state management have also required several iterations. I experimented with different approaches before settling on HTTP-only cookie-based authentication and TanStack Query for server state. Another challenge has been keeping the project simple enough to understand while still making it structured enough to grow. In several parts of development I had to remove unnecessary complexity instead of continuously adding abstractions.

## Lessons Learned

FinX has been one of my main projects for learning how the pieces of a real application fit together. It has helped me understand that backend development is not just about creating endpoints; the difficult part is deciding what the API should guarantee, how data should be represented, how authentication should work, and how the system should behave when things go wrong.

The project has also reinforced an approach I try to follow in software development: understand the problem and the data flow first, then choose the technology or abstraction that actually helps solve it. It is very easy to add another library or architectural pattern because it looks useful, but every additional abstraction also creates something else that needs to be understood and maintained.

Most importantly, building FinX has made me more interested in the connection between software engineering and the underlying problem being solved. A finance application is not successful merely because it can store an expense. The real value comes from turning a collection of records into information that helps a person understand their behavior and make better decisions about their money.

## Current Status

FinX is an ongoing project and is being developed incrementally. The core foundation includes authentication, user-specific data, categories, financial records, dashboard summaries, and the backend API required to support the frontend. Some parts of the interface and product experience are still being refined, and additional analytics, budgeting capabilities, and usability improvements are planned as development continues.

Because this is also a learning project, the repository may contain areas that are actively being refactored as I learn better ways to structure the application. The goal is not to pretend that the first implementation is perfect, but to continuously improve the system while keeping the changes understandable.

## Roadmap

The project is intended to continue beyond basic transaction management. Planned improvements include richer income and spending trends, more detailed budget analysis, improved monthly comparisons, recent transaction summaries, stronger financial insights, better filtering and date-range support, and additional usability improvements across the dashboard.

Another long-term goal is to make the analytics more useful without overwhelming the user with charts. The direction is to surface information that answers practical questions such as where money is being spent, how spending changes over time, whether a budget is being exceeded, and how much income is being retained.

## Repository

This repository contains the FinX backend/Api.

The frontend is maintained separately repository as a Next.js application.

```text
FinX
├── finance-managemnet-server    → Express.js + MongoDB backend
└── finx-v2                      → Next.js + TypeScript frontend
```

## License

This project is primarily a personal and learning project. If a formal open-source license is added later, the licensing terms in that file will take precedence.
