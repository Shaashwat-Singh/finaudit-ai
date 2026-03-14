# FinAudit AI 🚀

FinAudit AI is a premium, open-source AI-powered financial auditing system. It helps organizations monitor their expenditures, detect anomalies, and chat with an AI agent to understand financial risks.

![Dashboard Preview](frontend/src/assets/hero.png)

## ✨ Features

- **AI Anomaly Detection**: Automatically scans transactions for suspicious patterns using Google Gemini.
- **Interactive Dashboard**: Modern analytics with Recharts, featuring spend overview and real-time KPI tracking.
- **Transaction Management**: Full CRUD for transactions with support for **CSV batch uploads** and manual entry.
- **Vendor Risk Profiling**: Glassmorphism cards showing vendor stats, transaction counts, and risk levels.
- **AI Audit Agent**: A dedicated chat interface to query your financial data and run automated scans.
- **Premium Design**: Built with a clean, high-end aesthetic inspired by Stripe and Apple.

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python API framework.
- **SQLite**: Local relational database.
- **Google Gemini SDK**: AI-powered anomaly detection and summarization.
- **Pydantic**: Data validation and settings management.

### Frontend
- **React + Vite**: Fast, modern frontend development.
- **Tailwind CSS v4**: Utility-first styling with custom design tokens.
- **Framer Motion**: Smooth, high-end animations and transitions.
- **Recharts**: Responsive data visualization.
- **Lucide React**: Beautiful, consistent iconography.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the template:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
5. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
