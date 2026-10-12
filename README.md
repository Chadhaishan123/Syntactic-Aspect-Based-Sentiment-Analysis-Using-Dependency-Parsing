# SyntaxSense — Syntactic Aspect-Based Sentiment Analysis Using Dependency Parsing

[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![spaCy](https://img.shields.io/badge/spaCy-3.8-09A3D5?style=flat-square&logo=spacy&logoColor=white)](https://spacy.io)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

A full-stack, real-time web platform for **Aspect-Based Sentiment Analysis (ABSA)** powered by **Universal Dependency Parsing (UD 2.0)** and interactive, explainable graph visualizers.

---

## 🌟 Academic & Algorithmic Novelty

Standard sequential neural models (N-grams, flat word-distance windows, and dense transformer attention) struggle with **long-range syntactic dependencies**, **inverted negations**, and **conflicting polarities in compound sentences** (*"The battery life is really awful, but the vibrant display is stunning"*).

**SyntaxSense** introduces four foundational innovations:

```
               ┌─────────────────────────────────────────────────────────────┐
               │            Universal Dependency Graph G = (V, E)            │
               └──────────────────────────────┬──────────────────────────────┘
                                              │
            ┌─────────────────────────────────┼─────────────────────────────────┐
            ▼                                 ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
│ Shortest Dependency   │         │ Subtree Recursive     │         │ Compound & Modifier   │
│ Path (SDP) Matching   │         │ Negation Bounding     │         │ Consolidation         │
│ • Bounded BFS on UD   │         │ • Valence flip stays  │         │ • Merges compound &   │
│   edges (nsubj, amod) │         │   inside subtrees     │         │   nummod entities     │
│ • Zero word-distance  │         │ • Prevents leakage    │         │ • Preserves full      │
│   proximity errors    │         │   across "but" / "yet"│         │   technical phrases   │
└───────────────────────┘         └───────────────────────┘         └───────────────────────┘
```

1. **Shortest Dependency Path (SDP) Aspect-Opinion Pairing**:
   * Inverts directed dependency trees into an undirected graph $G = (V, E)$.
   * Computes the shortest grammatical graph route between candidate aspect nouns and opinion modifiers, regardless of intervening token distance.
2. **Subtree Recursive Negation & Valence Bounding**:
   * Scopes grammatical negation markers (`dep_ == "neg"`, e.g., *"not"*, *"never"*, *"barely"*) strictly to the opinion's syntactic subtree.
   * Prevents negation pollution across adversative conjunctions (`conj`, `cc`).
3. **Compound Entity & Numerical Expansion**:
   * Aggregates multi-word noun entities along `compound`, `nmod`, `nummod`, and descriptive modifiers (*"battery life"*, *"Windows 8 Set-Up"*, *"customer support service"*).
4. **Explainable AI (XAI) via Interactive SVG Dependency Trees**:
   * Generates dynamic Bézier dependency arcs with highlighted shortest paths and part-of-speech (POS) tags directly in the browser.
5. **Zero-Shot Domain Transfer (Zero Training Required)**:
   * Because Universal Grammar rules are domain-invariant, the parser requires **zero training data** to operate across consumer electronics, dining, healthcare, and finance.

---

## 📊 Empirical Evaluation (SemEval-2014 Task 4 Gold Benchmark)

Evaluated against the official **SemEval-2014 Task 4** gold-standard test sets:

| Dataset / Benchmark | Sample ($N$) | Exact Match F1 | Relaxed Match F1 | Sentiment Accuracy (ASC) | Throughput |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Restaurants Test (`semeval14_restaurants`)** | 100 sents | **55.6%** (P: 78.5%, R: 43.1%) | **61.6%** (P: 86.9%, R: 47.7%) | **95.2%** (80/84) | **175.4 sents/s** |
| **Restaurants Test (`semeval14_restaurants`)** | 400 sents | **51.0%** (P: 76.8%, R: 38.2%) | **58.0%** (P: 87.3%, R: 43.4%) | **94.7%** (270/285) | **186.0 sents/s** |
| **Laptops Test (`semeval14_laptops`)** | 100 sents | **32.9%** (P: 48.7%, R: 24.8%) | **44.4%** (P: 65.8%, R: 33.6%) | **89.2%** (33/37) | **192.3 sents/s** |
| **Laptops Test (`semeval14_laptops`)** | 400 sents | **26.8%** (P: 49.8%, R: 18.3%) | **35.3%** (P: 65.6%, R: 24.1%) | **90.3%** (102/113) | **188.7 sents/s** |

*Inference latency: $< 6\text{ ms}$ per sentence on pure CPU.*

---

## ⚡ Real-Time Capabilities

* **Live Streaming Pipeline**: Continuously ingests live public feedback from **Hacker News** (Algolia search API) and **Mastodon** (`mastodon.social`) without API keys.
* **WebSocket Broadcast (`/ws/live`)**: Pushes newly analyzed items and telemetry updates to all connected browser sessions in real time.
* **Non-Persisting Live-Typing Preview (`/api/parse`)**: Generates real-time SVG trees as you type with debounced updates.
* **Dynamic Network Telemetry**: Measures backend parsing execution time vs. WebSocket round-trip transmission latency.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite 8, React Router v6, Framer Motion, Recharts, Lucide Icons, Custom Vanilla CSS Design System.
* **Backend**: FastAPI (Python 3.12), Uvicorn ASGI, Pydantic v2.
* **NLP & Parsing**: spaCy (`en_core_web_sm`), Universal Dependencies (UD 2.0).
* **Storage**: In-Memory buffer with optional MongoDB persistence.

---

## 📁 Repository Structure

```
.
├── data/
│   ├── laptops_test.jsonl       # SemEval-2014 Laptops gold test set (800 sents, 1033 aspects)
│   └── restaurants_test.jsonl   # SemEval-2014 Restaurants gold test set (800 sents, 1328 aspects)
├── src/
│   ├── components/              # Header, Sidebar, DependencyTreeViewer (SVG engine)
│   ├── context/                 # RealtimeContext (WebSocket state manager)
│   ├── pages/                   # Overview, Studio, LiveStream, BatchInspector, Insights, Methodology, History
│   ├── apiConfig.js             # Dynamic cloud & local URL resolver
│   ├── main.jsx                 # Application entry point & router
│   └── styles.css               # Glassmorphic dark design tokens
├── Dockerfile                   # Universal cloud container configuration
├── Procfile                     # Web process definition for Railway / Render
├── render.yaml                  # 1-click Render blueprint specification
├── vercel.json                  # Vercel SPA rewrite configuration
├── DEPLOYMENT.md                # Cloud deployment walkthrough guide
├── evaluation.py                # SemEval-2014 evaluation engine
├── live_sources.py              # Keyless Hacker News & Mastodon live ingestion
├── main.py                      # FastAPI application, dependency parser & WebSockets
├── package.json                 # Frontend dependencies & Vite scripts
├── requirements.txt             # Backend Python dependencies + spaCy model wheel
└── vite.config.js               # Vite proxy configuration
```

---

## 🚀 Quickstart (Local Development)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Chadhaishan123/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing.git
cd Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows (or source .venv/bin/activate on macOS/Linux)

# Install dependencies (includes spaCy model)
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
*API docs live at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Setup

```bash
# In another terminal:
npm install

# Start Vite dev server
npm run dev
```
*Web application live at `http://127.0.0.1:5173`.*

---

## 🌐 Cloud Deployment (Vercel + Render)

Refer to the complete [DEPLOYMENT.md](DEPLOYMENT.md) guide:
* **Frontend**: Deploy to **Vercel** with `npm run build` and `dist` output.
* **Backend**: Deploy to **Render** or **Railway** using the included `Procfile` / `render.yaml`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
