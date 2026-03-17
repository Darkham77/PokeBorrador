---
name: geo-fundamentals
description: Generative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).
allowed-tools: Read, Glob, Grep
---

# GEO Fundamentals

> Optimization for AI-powered search engines.

---

## 1. What is GEO?

**GEO** = Generative Engine Optimization

| Goal | Platform |
| :--- | :--- |
| Be cited in AI responses | ChatGPT, Claude, Perplexity, Gemini |

### SEO vs GEO

| Aspect | SEO | GEO |
| :--- | :--- | :--- |
| Goal | #1 ranking | AI citations |
| Platform | Google | AI engines |
| Metrics | Rankings, CTR | Citation rate |
| Focus | Keywords | Entities, data |

---

## 2. AI Engine Landscape

| Engine | Citation Style | Opportunity |
| :--- | :--- | :--- |
| **Perplexity** | Numbered links | Highest citation rate |
| **ChatGPT** | Inline/footnotes | Custom GPTs |
| **Claude** | Contextual | Long-form content |
| **Gemini** | Sources section | SEO crossover |

---

## 3. RAG Retrieval Factors

How AI engines select content to cite:

| Factor | Weight |
| :--- | :--- |
| Semantic relevance | ~40% |
| Keyword match | ~20% |
| Authority signals | ~15% |
| Freshness | ~10% |
| Source diversity | ~15% |

---

## 4. Content That Gets Cited

| Element | Why It Works |
| :--- | :--- |
| **Original statistics** | Unique, citable data |
| **Expert quotes** | Authority transfer |
| **Clear definitions** | Easy to extract |
| **Step-by-step guides** | Actionable value |
| **Comparison tables** | Structured info |
| **FAQ sections** | Direct answers |

---

## 5. GEO Content Checklist

### Content Elements

- [ ] **Formulate question-based titles.**
- [ ] **Provide a summary/TL;DR at the top.**
- [ ] **Present original data with clear sources.**
- [ ] **Include expert quotes (with name and title).**
- [ ] **Create an FAQ section (3-5 targeted Q&A).**
- [ ] **Write clear and concise definitions.**
- [ ] **Add a "Last updated" timestamp.**
- [ ] **Include author credentials.**

### Technical Elements

- [ ] **Implement Article schema with dates.**
- [ ] **Inject Person schema for authors.**
- [ ] **Add FAQPage schema.**
- [ ] **Ensure fast loading (< 2.5s).**
- [ ] **Maintain clean HTML structure.**

---

## 6. Entity Building

| Action | Purpose |
| :--- | :--- |
| Google Knowledge Panel | Entity recognition |
| Wikipedia (if notable) | Authority source |
| Consistent info across web | Entity consolidation |
| Industry mentions | Authority signals |

---

## 7. AI Crawler Access

### Key AI User-Agents

| Crawler | Engine |
| :--- | :--- |
| GPTBot | ChatGPT/OpenAI |
| Claude-Web | Claude |
| PerplexityBot | Perplexity |
| Googlebot | Gemini (shared) |

### Access Decision

| Strategy | When |
| :--- | :--- |
| Allow all | Want AI citations |
| Block GPTBot | Don't want OpenAI training |
| Selective | Allow some, block others |

---

## 8. Measurement

| Metric | How to Track |
| :--- | :--- |
| AI citations | Manual monitoring |
| "According to [Brand]" mentions | Search in AI |
| Competitor citations | Compare share |
| AI-referred traffic | UTM parameters |

---

## 9. Anti-Patterns

| ❌ Don't | ✅ Do |
| :--- | :--- |
| Publish without dates | Add timestamps |
| Vague attributions | Name sources |
| Skip author info | Show credentials |
| Thin content | Comprehensive coverage |

---

> **Remember:** AI cites content that's clear, authoritative, and easy to extract. Aim to be the best answer.

---

## Script

| Script | Purpose | Command |
| :--- | :--- | :--- |
| `scripts/geo_checker.py` | GEO audit (AI citation readiness) | `python scripts/geo_checker.py <project_path>` |
