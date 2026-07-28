# AI Study Buddy

AI Study Buddy is an AI-powered web application that transforms PDF notes into an interactive learning experience. Students can upload their study material, generate concise summaries, create quizzes, and ask AI questions based on the uploaded content. The application combines a React frontend with a FastAPI backend and Google's Gemini AI to make studying faster and more effective.

---

## Features

- Upload PDF notes
- Automatic text extraction
- OCR support for scanned PDFs
- AI-generated summaries
- AI-generated multiple-choice quizzes
- Ask AI questions about uploaded notes
- Responsive user interface
- Fast and lightweight backend
- RESTful API

---

## Tech Stack

### Frontend
- React
- JavaScript
- HTML5
- CSS3
- Axios

### Backend
- Python
- FastAPI
- Uvicorn

### AI
- Google Gemini API

### OCR & PDF Processing
- pdfplumber
- pdf2image
- pytesseract
- Pillow

### Other Libraries
- python-dotenv
- python-multipart
- CORS Middleware

---

## Folder Structure

```
AI-Study-Buddy/
│
├── backend/
│   ├── uploads/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── extracted_text.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

---









## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | API status |
| POST | `/upload` | Upload PDF and extract text |
| POST | `/quiz` | Generate quiz questions |
| POST | `/ask` | Ask questions based on uploaded notes |

---

## Application Workflow

1. Upload a PDF.
2. The backend extracts text from the document.
3. If the PDF is scanned, OCR extracts the text.
4. The extracted content is processed using Google Gemini AI.
5. Users can:
   - Generate a summary
   - Create quiz questions
   - Ask AI questions related to the uploaded notes

---


## Requirements

- Python 3.10 or later
- Node.js 18 or later
- npm
- Google Gemini API Key
- Tesseract OCR
- Poppler

---

## Built With

- React
- FastAPI
- Google Gemini
- JavaScript
- Python
- HTML5
- CSS3

---

## Author

**Minahil Naveed**

Software Engineering Student

FAST – National University of Computer and Emerging Sciences (FAST-NUCES)
