# Wud' - E-commerce Application

Wud' is a full-stack e-commerce platform for a high-end, handcrafted solid wood furniture store. This project provides a complete solution for both customers and administrators, including product browsing, cart/wishlist management, order processing, blog, newsletter, and a robust admin dashboard.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT authentication
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript (with Vite for build)
- **Database:** MongoDB

---

## 📁 Project Structure

- `backend/` — RESTful API (Node.js, Express, Mongoose)
- `frontend/` — Static frontend (HTML, Tailwind CSS, JS, Vite)
- `controllers/`, `models/`, `routes/`, `middleware/`, `utils/` — Backend logic
- `backend/sample-data/` — Example data for MongoDB seeding

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AymenMB/wud.git
cd wud
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables

- Copy `.env.example` to `.env` in `backend/` and edit as needed:
  - `MONGODB_URI` (e.g. `mongodb://localhost:27017/wud_db`)
  - `PORT` (default: 3000)
  - `JWT_SECRET` (set a strong secret)
  - `CORS_ORIGIN` (e.g. `http://localhost:5173`)

### 4. Seed the Database (Optional)

You can import sample data using `mongoimport`:

```bash
mongoimport --db wud_db --collection users --file backend/sample-data/sample.users.json --jsonArray
mongoimport --db wud_db --collection categories --file backend/sample-data/sample.categories.json --jsonArray
mongoimport --db wud_db --collection products --file backend/sample-data/sample.products.json --jsonArray
```

Or run the provided script to initialize the database with default admin and categories:

```bash
node init-db.js
```

### 5. Start the Application

#### Automatic (Windows)

```powershell
# Double-click start.bat or run:
.\start.bat
```

#### Automatic (Linux/Mac)

```bash
chmod +x start.sh
./start.sh
```

#### Manual Start

- **Backend:**
  ```bash
  cd backend
  npm run dev
  # or: npm start
  ```
- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```

Open your browser at [http://localhost:5173](http://localhost:5173) (frontend) and ensure the backend is running (default: [http://localhost:3000](http://localhost:3000)).

---

## 🔑 Default Admin Credentials

- **Email:** `admin@wud.com`
- **Password:** `admin123`

---

## 🏗️ Features

- **Backend:**
  - RESTful API for products, categories, users, orders, cart, wishlist, custom requests, blog, newsletter
  - JWT authentication (user/admin)
  - Mongoose schemas and validation
  - Admin dashboard endpoints
- **Frontend:**
  - Product catalog, detail, cart, wishlist, checkout
  - User registration, login, profile
  - Blog, newsletter, custom project requests
  - Admin dashboard (manage products, users, orders, blog, etc.)

---

## 🧩 Code & Frameworks

- **Node.js/Express:** API server, routing, middleware, authentication
- **Mongoose:** MongoDB ODM, schema validation, population
- **JWT:** Secure authentication for users/admins
- **Tailwind CSS:** Modern, responsive UI
- **Vite:** Fast frontend build tool

---

## 🗂️ Example Usage

- **Seeding DB:** `node init-db.js` or use `mongoimport` as above
- **Start backend:** `npm run dev` (in `backend/`)
- **Start frontend:** `npm run dev` (in `frontend/`)
- **Admin login:** Use default credentials above

---

## 📝 Notes

- Adjust `frontend/src/js/api.js` `BASE_URL` if backend runs on a different port.
- For production, build frontend with `npm run build` in `frontend/`.
- MongoDB must be running locally or remotely.

---

## 🤝 Contributing

Pull requests are welcome! Please open issues for bugs or feature requests.

---

## 📄 License

MIT
