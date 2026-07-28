import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

// ─────────────────────────────────────────────
// Markdown → HTML renderer (no dependencies)
// ─────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const html = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^### (.+)/.test(line)) {
      closeList();
      html.push(`<h3>${inline(line.replace(/^### /, ""))}</h3>`);
    } else if (/^## (.+)/.test(line)) {
      closeList();
      html.push(`<h2>${inline(line.replace(/^## /, ""))}</h2>`);
    } else if (/^# (.+)/.test(line)) {
      closeList();
      html.push(`<h1>${inline(line.replace(/^# /, ""))}</h1>`);
    } else if (/^\d+\.\s/.test(line)) {
      if (!inOl) { closeList(); html.push("<ol>"); inOl = true; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (/^[-*]\s/.test(line)) {
      if (!inUl) { closeList(); html.push("<ul>"); inUl = true; }
      html.push(`<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }

  closeList();
  return html.join("");
}

// ─────────────────────────────────────────────
// SummaryView
// ─────────────────────────────────────────────
function SummaryView({ summary }) {
  return (
    <div className="prose-block">
      <h2 className="section-title">📄 Summary</h2>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// QuizView — instant per-question feedback
// ─────────────────────────────────────────────
function QuizView({ quiz, format }) {
  // Each question tracks: selected answer + whether it's been revealed
  const [mcqAnswers, setMcqAnswers] = useState({});    // { index: selectedOption }
  const [mcqRevealed, setMcqRevealed] = useState({});  // { index: true } once answered
  const [tfAnswers, setTfAnswers] = useState({});
  const [tfRevealed, setTfRevealed] = useState({});
  const [fibAnswers, setFibAnswers] = useState({});
  const [fibRevealed, setFibRevealed] = useState({});
  const [saAnswers, setSaAnswers] = useState({});
  const [saRevealed, setSaRevealed] = useState({});
  const [quizDone, setQuizDone] = useState(false);
  const [score, setScore] = useState(null);

  if (format === "text" || typeof quiz === "string") {
    return (
      <div className="prose-block">
        <h2 className="section-title">📝 Quiz</h2>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(quiz) }}
        />
      </div>
    );
  }

  const { mcq = [], truefalse = [], shortanswer = [], fillinblank = [] } = quiz;

  // ── MCQ: selecting an option immediately reveals feedback ──
  const handleMcqSelect = (i, opt) => {
    if (mcqRevealed[i]) return; // already answered
    setMcqAnswers(p => ({ ...p, [i]: opt }));
    setMcqRevealed(p => ({ ...p, [i]: true }));
  };

  // ── T/F: clicking immediately reveals feedback ──
  const handleTfSelect = (i, val) => {
    if (tfRevealed[i]) return;
    setTfAnswers(p => ({ ...p, [i]: val }));
    setTfRevealed(p => ({ ...p, [i]: true }));
  };

  // ── FIB: submit button per question ──
  const handleFibSubmit = (i) => {
    if (!fibAnswers[i]?.trim()) return;
    setFibRevealed(p => ({ ...p, [i]: true }));
  };

  const finishQuiz = () => {
    let correct = 0;
    let total = 0;

    mcq.forEach((q, i) => {
      total++;
      if (mcqAnswers[i] === q.answer) correct++;
    });
    truefalse.forEach((q, i) => {
      total++;
      if (tfAnswers[i] !== undefined && tfAnswers[i] === q.answer) correct++;
    });
    fillinblank.forEach((q, i) => {
      total++;
      const userAns = (fibAnswers[i] || "").trim().toLowerCase();
      if (userAns === q.answer.toLowerCase()) correct++;
    });

    setScore({ correct, total });
    setQuizDone(true);
  };

  const resetQuiz = () => {
    setMcqAnswers({});
    setMcqRevealed({});
    setTfAnswers({});
    setTfRevealed({});
    setFibAnswers({});
    setFibRevealed({});
    setSaAnswers({});
    setSaRevealed({});
    setScore(null);
    setQuizDone(false);
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="section-title">📝 Interactive Quiz</h2>
        {score && (
          <div className={`score-badge ${score.correct / score.total >= 0.7 ? "score-good" : "score-low"}`}>
            {score.correct}/{score.total} correct
            {score.correct / score.total >= 0.7 ? " 🎉" : " 📚"}
          </div>
        )}
      </div>

      {/* ── MCQ ── */}
      {mcq.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-label">Multiple Choice</div>
          {mcq.map((q, i) => {
            const isRevealed = mcqRevealed[i];
            const userAnswer = mcqAnswers[i];
            const isCorrect = userAnswer === q.answer;

            return (
              <div key={i} className={`quiz-card ${isRevealed ? (isCorrect ? "card-correct" : "card-wrong") : ""}`}>
                <p className="quiz-q">
                  <span className="q-num">Q{i + 1}</span> {q.question}
                </p>
                <div className="options-grid">
                  {q.options.map((opt, j) => {
                    let cls = "option-btn";
                    if (isRevealed) {
                      if (opt === q.answer) cls += " option-correct";
                      else if (opt === userAnswer && opt !== q.answer) cls += " option-wrong";
                      else cls += " option-dim";
                    } else if (userAnswer === opt) {
                      cls += " option-selected";
                    }
                    return (
                      <button
                        key={j}
                        className={cls}
                        disabled={isRevealed}
                        onClick={() => handleMcqSelect(i, opt)}
                      >
                        <span className="opt-letter">{String.fromCharCode(65 + j)}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {isRevealed && (
                  <div className={`feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}>
                    {isCorrect ? "✅ Correct!" : `❌ Wrong — correct answer: ${q.answer}`}
                    {q.explanation && <p className="feedback-exp">{q.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── True / False ── */}
      {truefalse.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-label">True / False</div>
          {truefalse.map((q, i) => {
            const isRevealed = tfRevealed[i];
            const userAnswer = tfAnswers[i];
            const isCorrect = userAnswer === q.answer;

            return (
              <div key={i} className={`quiz-card ${isRevealed ? (isCorrect ? "card-correct" : "card-wrong") : ""}`}>
                <p className="quiz-q">
                  <span className="q-num">T/F {i + 1}</span> {q.question}
                </p>
                <div className="tf-row">
                  {[true, false].map((val) => {
                    let cls = "tf-btn";
                    if (isRevealed) {
                      if (val === q.answer) cls += " option-correct";
                      else if (val === userAnswer) cls += " option-wrong";
                      else cls += " option-dim";
                    } else if (userAnswer === val) {
                      cls += " option-selected";
                    }
                    return (
                      <button
                        key={String(val)}
                        className={cls}
                        disabled={isRevealed}
                        onClick={() => handleTfSelect(i, val)}
                      >
                        {val ? "✅ True" : "❌ False"}
                      </button>
                    );
                  })}
                </div>
                {isRevealed && (
                  <div className={`feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}>
                    {isCorrect ? "✅ Correct!" : `❌ Wrong — answer is: ${q.answer ? "True" : "False"}`}
                    {q.explanation && <p className="feedback-exp">{q.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fill in the Blank ── */}
      {fillinblank.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-label">Fill in the Blank</div>
          {fillinblank.map((q, i) => {
            const isRevealed = fibRevealed[i];
            const userAnswer = (fibAnswers[i] || "").trim();
            const isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase();

            return (
              <div key={i} className={`quiz-card ${isRevealed ? (isCorrect ? "card-correct" : "card-wrong") : ""}`}>
                <p className="quiz-q">
                  <span className="q-num">FIB {i + 1}</span> {q.question}
                </p>
                <div className="fib-row">
                  <input
                    className={`fib-input ${isRevealed ? (isCorrect ? "fib-correct" : "fib-wrong") : ""}`}
                    type="text"
                    placeholder="Type your answer…"
                    value={fibAnswers[i] || ""}
                    disabled={isRevealed}
                    onChange={(e) => setFibAnswers(p => ({ ...p, [i]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFibSubmit(i); }}
                  />
                  {!isRevealed && (
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => handleFibSubmit(i)}
                      disabled={!fibAnswers[i]?.trim()}
                    >
                      Check
                    </button>
                  )}
                </div>
                {isRevealed && (
                  <div className={`feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}>
                    {isCorrect ? "✅ Correct!" : `❌ Wrong — correct answer: ${q.answer}`}
                    {q.explanation && <p className="feedback-exp">{q.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Short Answer ── */}
      {shortanswer.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-label">Short Answer</div>
          {shortanswer.map((q, i) => {
            const isRevealed = saRevealed[i];
            return (
              <div key={i} className="quiz-card">
                <p className="quiz-q">
                  <span className="q-num">SA {i + 1}</span> {q.question}
                </p>
                <textarea
                  className="sa-input"
                  placeholder="Write your answer here…"
                  value={saAnswers[i] || ""}
                  disabled={isRevealed}
                  onChange={(e) => setSaAnswers(p => ({ ...p, [i]: e.target.value }))}
                  rows={3}
                />
                {!isRevealed ? (
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={() => setSaRevealed(p => ({ ...p, [i]: true }))}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div className="feedback feedback-neutral">
                    <strong>Model Answer:</strong>
                    <p className="feedback-exp">{q.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Submit / Reset ── */}
      <div className="quiz-actions">
        {!quizDone ? (
          <button className="btn btn--primary" onClick={finishQuiz}>
            Submit Quiz &amp; See Results
          </button>
        ) : (
          <>
            <div className="final-score">
              <span>Your Score: </span>
              <strong>{score.correct}/{score.total}</strong>
              <span> ({Math.round((score.correct / score.total) * 100)}%)</span>
            </div>
            <button className="btn btn--outline" onClick={resetQuiz}>
              🔄 Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AnswerView — renders markdown AI answer
// ─────────────────────────────────────────────
function AnswerView({ question, answer }) {
  return (
    <div className="prose-block">
      <h2 className="section-title">💬 AI Answer</h2>
      {question && (
        <div className="answer-question-chip">
          <span className="chip-label">Your question</span>
          <p className="chip-text">{question}</p>
        </div>
      )}
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// FlashcardSection — categorized flashcards
// ─────────────────────────────────────────────
const FC_CATEGORIES = [
  { key: "concept",  label: "💡 Concepts",     color: "#6366f1" },
  { key: "formula",  label: "🔢 Formulas",      color: "#a855f7" },
  { key: "keyword",  label: "🔑 Keywords",      color: "#38bdf8" },
  { key: "exam_tip", label: "📌 Exam Tips",     color: "#f59e0b" },
  { key: "mnemonic", label: "🧠 Mnemonics",     color: "#4ade80" },
];

function FlashcardSection({ flashcards }) {
  const [activeCategory, setActiveCategory] = useState("concept");
  const [activeCard, setActiveCard] = useState(0);
  const [flipped, setFlipped] = useState({});

  const catCards = flashcards.filter(c => c.type === activeCategory);
  const catInfo = FC_CATEGORIES.find(c => c.key === activeCategory);

  const switchCategory = (key) => {
    setActiveCategory(key);
    setActiveCard(0);
    setFlipped({});
  };

  const flipCard = (i) => setFlipped(p => ({ ...p, [i]: !p[i] }));

  if (!catCards.length) {
    return (
      <div className="flashcard-section">
        <h2 className="section-title">🃏 Flashcards</h2>
        <p style={{ color: "var(--text-muted)" }}>No flashcards in this category.</p>
      </div>
    );
  }

  return (
    <div className="flashcard-section">
      <h2 className="section-title">
        🃏 Flashcards
        <span className="count-badge">{activeCard + 1} / {catCards.length}</span>
      </h2>

      {/* Category tabs */}
      <div className="fc-category-tabs">
        {FC_CATEGORIES.map(cat => {
          const count = flashcards.filter(c => c.type === cat.key).length;
          return (
            <button
              key={cat.key}
              className={`fc-cat-btn ${activeCategory === cat.key ? "fc-cat-btn--active" : ""}`}
              style={activeCategory === cat.key ? { "--cat-color": cat.color } : {}}
              onClick={() => switchCategory(cat.key)}
            >
              {cat.label}
              <span className="fc-cat-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Card navigator */}
      <div className="fc-nav">
        <button
          className="fc-arrow"
          onClick={() => { setActiveCard(p => p > 0 ? p - 1 : catCards.length - 1); setFlipped({}); }}
        >
          ‹
        </button>

        <div
          className={`fc-card ${flipped[activeCard] ? "fc-card--flipped" : ""}`}
          onClick={() => flipCard(activeCard)}
        >
          <div className="fc-front" style={{ borderColor: catInfo.color + "66" }}>
            <span className="fc-label">{catInfo.label}</span>
            <p className="fc-text">{catCards[activeCard]?.q}</p>
            <span className="fc-hint">Tap to reveal answer</span>
          </div>
          <div className="fc-back">
            <span className="fc-label">Answer</span>
            <p className="fc-text">{catCards[activeCard]?.a}</p>
            {catCards[activeCard]?.mnemonic && (
              <div className="fc-mnemonic">
                <span className="fc-mnemonic-label">💡 Memory Trick</span>
                <span className="fc-mnemonic-text">{catCards[activeCard].mnemonic}</span>
              </div>
            )}
            <span className="fc-hint">Tap to go back</span>
          </div>
        </div>

        <button
          className="fc-arrow"
          onClick={() => { setActiveCard(p => p < catCards.length - 1 ? p + 1 : 0); setFlipped({}); }}
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="fc-dots">
        {catCards.map((_, i) => (
          <button
            key={i}
            className={`fc-dot ${i === activeCard ? "fc-dot--active" : ""}`}
            onClick={() => { setActiveCard(i); setFlipped({}); }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
function App() {
  const [file, setFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(
    () => localStorage.getItem("uploadedFileName") || ""
  );
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [quizFormat, setQuizFormat] = useState("json");
  const [flashcards, setFlashcards] = useState([]);
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const hasUpload = !!uploadedFileName;

  // ── Upload PDF ──
  const uploadFile = async () => {
    if (!file) { alert("Please select a PDF first."); return; }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setLoadingMsg("Uploading & summarizing your notes…");
      const response = await axios.post("http://127.0.0.1:8000/upload", formData);
      setSummary(response.data.summary);
      setQuiz(null);
      setFlashcards([]);
      setAnswer("");
      setLastQuestion("");
      setQuestion("");
      setUploadedFileName(file.name);
      localStorage.setItem("uploadedFileName", file.name);
      setActiveTab("summary");
    } catch (error) {
      console.error(error);
      alert("Upload failed. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── Generate Quiz ──
  const generateQuiz = async () => {
    if (!hasUpload) { alert("Please upload a PDF first."); return; }
    try {
      setLoading(true);
      setLoadingMsg("Crafting your interactive quiz…");
      const response = await axios.post("http://127.0.0.1:8000/quiz");
      setQuiz(response.data.quiz);
      setQuizFormat(response.data.format || "json");
      setActiveTab("quiz");
    } catch (error) {
      console.error(error);
      alert("Failed to generate quiz. Make sure the backend is running.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── Generate Flashcards ──
  const generateFlashcards = async () => {
    if (!hasUpload) { alert("Please upload a PDF first."); return; }
    try {
      setLoading(true);
      setLoadingMsg("Building flashcards…");
      const response = await axios.post("http://127.0.0.1:8000/flashcards");
      const data = response.data;

      if (data.format === "json" && Array.isArray(data.flashcards)) {
        // New JSON format with categories
        setFlashcards(data.flashcards);
      } else {
        // Fallback: parse old Q:/A: text format
        const raw = typeof data.flashcards === "string" ? data.flashcards : "";
        const cards = [];
        const regex = /Q:\s*(.*?)\s*A:\s*([\s\S]*?)(?=Q:|$)/g;
        let match;
        while ((match = regex.exec(raw)) !== null) {
          cards.push({
            type: "concept",
            q: match[1].trim(),
            // Strip any dollar signs from legacy text
            a: match[2].trim().replace(/\$/g, "")
          });
        }
        setFlashcards(cards.length > 0 ? cards : [{ type: "concept", q: raw, a: "" }]);
      }

      setActiveTab("flashcards");
    } catch (error) {
      console.error(error);
      alert("Failed to generate flashcards. Make sure the backend is running.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── Ask AI ──
  const askQuestion = async () => {
    if (!question.trim()) { alert("Please enter a question."); return; }
    if (!hasUpload) { alert("Please upload a PDF first."); return; }
    try {
      setLoading(true);
      setLoadingMsg("Thinking…");
      const response = await axios.post("http://127.0.0.1:8000/ask", { question });
      setAnswer(response.data.answer);
      setLastQuestion(question);
      setActiveTab("ask");
    } catch (error) {
      console.error(error);
      alert("Failed to get an answer. Make sure the backend is running.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") askQuestion();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") setFile(dropped);
    else alert("Please drop a PDF file.");
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">StudyBuddy</span>
          </div>
          {hasUpload && (
            <div className="pill-badge">
              <span className="pill-dot" />
              {uploadedFileName}
            </div>
          )}
        </div>
      </header>

      {/* ── Hero / Upload ── */}
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">AI-Powered Learning</p>
          <h1 className="hero-title">
            Study smarter,<br />
            <span className="hero-accent">not harder.</span>
          </h1>
          <p className="hero-sub">
            Upload your notes once. Get summaries, quizzes, flashcards, and instant answers.
          </p>

          <div className="upload-card">
            <div
              className={`drop-zone ${file ? "drop-zone--active" : ""} ${dragOver ? "drop-zone--drag" : ""}`}
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <span className="drop-icon">{file ? "📄" : "📎"}</span>
              <span className="drop-label">
                {file ? file.name : "Click to choose a PDF"}
              </span>
              <span className="drop-hint">
                {file ? "Ready to upload" : "or drag and drop your file here"}
              </span>
            </div>

            <button
              className="btn btn--primary"
              onClick={uploadFile}
              disabled={loading || !file}
            >
              {loading && loadingMsg.includes("Upload")
                ? "Uploading…"
                : "Upload & Summarize"}
            </button>
          </div>

          {hasUpload && (
            <div className="action-strip">
              <button
                className="btn btn--outline"
                onClick={generateQuiz}
                disabled={loading}
              >
                📝 Generate Quiz
              </button>
              <button
                className="btn btn--outline"
                onClick={generateFlashcards}
                disabled={loading}
              >
                🃏 Flashcards
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Loading Bar ── */}
      {loading && (
        <div className="loading-bar-wrap">
          <div className="loading-bar" />
          <p className="loading-text">{loadingMsg}</p>
        </div>
      )}

      {/* ── Tabs + Content ── */}
      {(summary || quiz || flashcards.length || answer) && (
        <section className="results">
          <div className="tabs">
            {summary && (
              <button
                className={`tab ${activeTab === "summary" ? "tab--active" : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                📄 Summary
              </button>
            )}
            {quiz && (
              <button
                className={`tab ${activeTab === "quiz" ? "tab--active" : ""}`}
                onClick={() => setActiveTab("quiz")}
              >
                📝 Quiz
              </button>
            )}
            {flashcards.length > 0 && (
              <button
                className={`tab ${activeTab === "flashcards" ? "tab--active" : ""}`}
                onClick={() => setActiveTab("flashcards")}
              >
                🃏 Flashcards
              </button>
            )}
            {answer && (
              <button
                className={`tab ${activeTab === "ask" ? "tab--active" : ""}`}
                onClick={() => setActiveTab("ask")}
              >
                💬 Answer
              </button>
            )}
          </div>

          <div className="tab-content">
            {activeTab === "summary" && summary && (
              <SummaryView summary={summary} />
            )}

            {activeTab === "quiz" && quiz && (
              <QuizView quiz={quiz} format={quizFormat} />
            )}

            {activeTab === "flashcards" && flashcards.length > 0 && (
              <FlashcardSection flashcards={flashcards} />
            )}

            {activeTab === "ask" && answer && (
              <AnswerView question={lastQuestion} answer={answer} />
            )}
          </div>
        </section>
      )}

      {/* ── Ask AI ── */}
      <section className="ask-section">
        <div className="ask-inner">
          <h2 className="ask-title">Ask anything about your notes</h2>
          <p className="ask-sub">
            {hasUpload
              ? `Notes loaded: ${uploadedFileName}`
              : "Upload a PDF above to enable this feature."}
          </p>
          <div className="ask-row">
            <input
              className="ask-input"
              type="text"
              placeholder="e.g. What is the difference between TCP and UDP?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!hasUpload || loading}
            />
            <button
              className="btn btn--primary"
              onClick={askQuestion}
              disabled={!hasUpload || loading || !question.trim()}
            >
              Ask
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <p>Built with ✦ StudyBuddy · Powered by Gemini</p>
      </footer>
    </div>
  );
}

export default App;
