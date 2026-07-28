import json
import os
import re
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import pdfplumber
from PIL import Image
from pydantic import BaseModel, Field

# =========================
# Setup & Configuration
# =========================

POPPLER_PATH = r"C:\Users\Mimi\Downloads\Release-26.02.0-0\Library\bin"
# If pytesseract is used elsewhere in your project, ensure path is valid:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

client = genai.Client(api_key=api_key)

app = FastAPI(title="AI Study Buddy API")

# Setup CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
NOTES_FILE = os.path.join(UPLOAD_FOLDER, "notes.txt")

# =========================
# Pydantic Schemas
# =========================

class QuestionRequest(BaseModel):
    question: str


# Quiz Structured Output Models
class MCQItem(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str


class TrueFalseItem(BaseModel):
    question: str
    answer: bool
    explanation: str


class ShortAnswerItem(BaseModel):
    question: str
    answer: str


class FillInBlankItem(BaseModel):
    question: str
    answer: str
    explanation: str


class QuizResponseSchema(BaseModel):
    mcq: List[MCQItem]
    truefalse: List[TrueFalseItem]
    shortanswer: List[ShortAnswerItem]
    fillinblank: List[FillInBlankItem]


# Flashcards Structured Output Models
class FlashcardItem(BaseModel):
    type: str = Field(description="One of: concept, formula, keyword, exam_tip, mnemonic")
    q: str = Field(description="Question or front of the card")
    a: str = Field(description="Answer or back of the card")
    mnemonic: Optional[str] = Field(default=None, description="Memory trick if relevant")


# =========================
# Endpoints
# =========================

@app.get("/")
def home():
    return {"message": "Welcome to AI Study Buddy!"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    # 1. Save uploaded file to disk
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # 2. Extract text with pdfplumber
    extracted_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from PDF. It might be scanned or image-only."
        )

    print("=" * 60)
    print("Extracted characters:", len(extracted_text))
    print(extracted_text[:500])
    print("=" * 60)

    # 3. Save extracted text permanently
    with open(NOTES_FILE, "w", encoding="utf-8") as f:
        f.write(extracted_text)

    # 4. Generate Summary via Gemini API
    prompt = f"""
You are an expert teacher summarizing study notes.

Summarize the following notes clearly and concisely using this exact structure:

## Overview
Write 2-3 sentences giving a high-level overview of what these notes are about.

## Key Concepts
List the most important concepts, each as:
### Concept Name
Brief explanation of the concept.

## Important Points
- Bullet point 1
- Bullet point 2
- Bullet point 3
(list 5-8 important points)

## Quick Recap
A 2-3 sentence summary of the most critical takeaways.

Notes:
{extracted_text[:5000]}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return {
        "filename": file.filename,
        "summary": response.text
    }


@app.post("/quiz")
async def generate_quiz():
    if not os.path.exists(NOTES_FILE):
        return {"quiz": "Please upload a PDF first."}

    with open(NOTES_FILE, "r", encoding="utf-8") as f:
        notes = f.read()

    prompt = f"""
You are an expert teacher creating a quiz based on the provided study material.

Create a quiz containing:
- 5 Multiple Choice Questions (mcq)
- 3 True/False Questions (truefalse)
- 3 Short Answer Questions (shortanswer)
- 3 Fill in the Blank Questions (fillinblank)

Rules:
- All questions must be based ONLY on the study material.
- Do NOT use dollar signs or LaTeX notation in any text.

Study Material:
{notes[:5000]}
"""

    # Enforce JSON output schema using standard Gemini SDK configuration
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=QuizResponseSchema
        )
    )

    try:
        quiz_data = json.loads(response.text)
        return {"quiz": quiz_data, "format": "json"}
    except json.JSONDecodeError:
        return {"quiz": response.text, "format": "text"}


@app.post("/flashcards")
async def generate_flashcards():
    if not os.path.exists(NOTES_FILE):
        return {"flashcards": "Please upload a PDF first."}

    with open(NOTES_FILE, "r", encoding="utf-8") as f:
        notes = f.read()

    prompt = f"""
You are an expert teacher creating study flashcards.

Generate a JSON array of 25 flashcards based on the material:
- 5 with type "concept"
- 5 with type "formula" (or key facts/relationships if no formulas exist)
- 5 with type "keyword"
- 5 with type "exam_tip"
- 5 with type "mnemonic"

Rules:
- Write all formulas in plain text (e.g. write "E = mc squared", not "E = mc²" with LaTeX).
- Do NOT use dollar signs anywhere.

Study Material:
{notes[:5000]}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=List[FlashcardItem]
        )
    )

    try:
        cards = json.loads(response.text)
        return {"flashcards": cards, "format": "json"}
    except json.JSONDecodeError:
        return {"flashcards": response.text, "format": "text"}


@app.post("/ask")
async def ask_question(data: QuestionRequest):
    if not os.path.exists(NOTES_FILE):
        return {"answer": "Please upload a PDF first."}

    with open(NOTES_FILE, "r", encoding="utf-8") as f:
        notes = f.read()

    prompt = f"""
You are an AI Study Buddy helping a student understand their study material.

Use the uploaded notes as your primary source.

If the answer exists in the notes:
- Answer clearly and in detail using the notes.
- Structure your answer with clear paragraphs.
- Use examples from the notes where relevant.

If the answer does NOT exist in the notes:
- Clearly state: "This topic is not covered in your uploaded notes."
- Then provide a helpful explanation from your general knowledge.
- Label it clearly as "General Knowledge:"

Notes:
{notes[:5000]}

Student's Question:
{data.question}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return {"answer": response.text}