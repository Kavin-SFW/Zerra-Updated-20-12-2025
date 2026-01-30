# SFW ZERRA - Frontend

This is the frontend application for **SFW ZERRA**, an AI-powered data analytics platform. It provides a modern, interactive dashboard for connecting to data sources, visualizing analytics, and generating insights.

## 🚀 How to Run This Project

Follow these steps to get the project running on your local machine.

### **Prerequisites**
*   **Node.js**: You must have Node.js installed (LTS version recommended).
    *   Check if installed: `node -v`
    *   [Download Node.js](https://nodejs.org/)

### **Step 1: Install Dependencies**
Open your terminal/command prompt in the project root directory (`C:\projects\zerra-frontend`) and run:

```bash
npm install
```
*This downloads all the necessary libraries required for the project.*

### **Step 2: Start the Development Server**
Run the following command to start the app:

```bash
npm run dev
```

### **Step 3: Open in Browser**
Once the server starts, you will see a local URL in the terminal (usually `http://localhost:8080` or `http://localhost:5173`).

Open your web browser and go to:
**[http://localhost:8080](http://localhost:8080)**

---

## 🧪 How to Use the Demo Features (Mock Data)

Since this frontend connects to a simulated backend for demonstration purposes, you can use the **Quick Connect** feature to generate instant dashboards.

1.  **Navigate to Data Sources:**
    *   Click on **Data Sources** in the left sidebar.

2.  **Connect a Database:**
    *   Click on **PostgreSQL** or **MySQL** under "Quick Connect".
    *   A popup will appear.

3.  **Enter Credentials:**
    *   You can use **any** dummy credentials for this demo.
    *   **Host:** `localhost`
    *   **Username:** `admin`
    *   **Password:** `1234`

4.  **Test & Connect:**
    *   Click **Test Connection** to verify.
    *   Click **Connect** to proceed.

5.  **Import Data:**
    *   Select a table (e.g., `public.orders`) from the list.
    *   Click **Import Selected Data**.

6.  **View Analytics:**
    *   The app will automatically redirect you to the **Analytics** page.
    *   A dashboard with charts, KPIs, and trends will be generated instantly!

---

## 🛠️ Build for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 📂 Project Structure

*   **`src/pages`**: Main application pages (Dashboard, Analytics, DataSources).
*   **`src/components`**: Reusable UI components (Charts, Modals, Sidebar).
*   **`src/services`**: Logic for Mock Data handling (`MockDataService.ts`).
*   **`src/lib`**: Utility functions for chart generation.

---

## 📝 License
This project is proprietary software of SFW ZERRA.
