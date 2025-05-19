# Rule Manager App

## Description

This application allows managing routing rules with priorities, sources, and destinations. It supports drag-and-drop reordering. All changes are kept in memory and saved to the database only when clicking the **Save** button.

## Technologies

- **Frontend**: React, Tailwind CSS, DnD Kit
- **Backend**: Node.js, Express, MongoDB (Replica Set)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. install
```bash
cd backend
npm install

cd ../frontend
npm install 
```
### 3. Mongodb
```bash
mkdir -p backend/data/db
mongod --dbpath backend/data/db --replSet rs0

in separate terminal
mongo
> rs.initiate()
You should see { "ok" : 1 } if the replica set was successfully initialized.
```
### 4. start backend
```bash
cd backend

cp .env.example .env
Edit .env to include your real environment values, if different
Make sure your .env contains the correct DATABASE_URL for MongoDB (or your actual database).

npx prisma generate
npx prisma migrate dev --name init

Run npx prisma generate after every schema change.

Run migrations with npx prisma migrate dev to update the database schema.

npm start

it will run on http://localhost:4000

```
### 5. start front end
```bash
cd frontend
npm run dev

will run on http://localhost:3000

```
### 6. TODOs

Add manual editing for displayPriority when adding or editing a rule

Prevent gaps in priorities when inserting at arbitrary positions

Keep all changes in memory and persist only on "Save"

If time permit:
Migrate the frontend codebase to TypeScript for better type safety and maintainability

Add form validation and error handling

Add unit and integration tests

### 7. Notes
Backend uses MongoDB transactions, so a replica set is required even for local development.
