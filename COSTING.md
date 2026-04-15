# CG-Matrix Gen System — Cost Estimation

## Gemini 2.5 Flash Pricing (April 2025)

| Type | Input | Output |
|------|-------|--------|
| Text | $0.15 / 1M tokens | $0.60 / 1M tokens |
| Image generation | $0.039 / image | — |

---

## Per-Run Cost (15 Questions)

### Full Pipeline (with gates)

| Phase | Input Tokens | Output Tokens | Images | Cost |
|-------|-------------|---------------|--------|------|
| Intake + Construct + Subskill | 12,000 | 3,000 | 0 | $0.004 |
| Content Scoping (×5 subskills) | 16,000 | 8,000 | 0 | $0.007 |
| Hess Matrix | 4,500 | 2,000 | 0 | $0.002 |
| Misconception (search + parse) | 5,600 | 2,000 | 0 | $0.002 |
| Exemplar Search | 2,500 | 3,000 | 0 | $0.002 |
| Content Selector (×7 cells) | 14,000 | 4,000 | 0 | $0.005 |
| Generation (×15 questions) | 82,500 | 30,000 | 0 | $0.030 |
| AI SME QA | 6,000 | 4,000 | 0 | $0.003 |
| **Text Subtotal** | **143,100** | **56,000** | **0** | **$0.055** |
| Image Intent Analysis (×5) | 4,000 | 1,000 | 0 | $0.001 |
| AI Image Generation (×5 stems) | — | — | 5 | $0.195 |
| Option Images (×2 MCQ × 4 opts) | — | — | 8 | $0.312 |
| SVG/Canvas Render (×2) | 2,400 | 3,000 | 0 | $0.002 |
| **Image Subtotal** | **6,400** | **4,000** | **13** | **$0.510** |
| **TOTAL** | **149,500** | **60,000** | **13** | **$0.565** |

### Quick Generate (no gates)

| Phase | Input Tokens | Output Tokens | Images | Cost |
|-------|-------------|---------------|--------|------|
| Hess Matrix | 4,500 | 2,000 | 0 | $0.002 |
| Exemplar Search | 2,500 | 3,000 | 0 | $0.002 |
| Generation (×15) | 75,000 | 25,000 | 0 | $0.026 |
| Images (×5 on-demand) | 2,000 | 500 | 5 | $0.196 |
| **TOTAL** | **84,000** | **30,500** | **5** | **$0.226** |

### Per-Action Cost (On-Demand)

| Action | Tokens (in+out) | Images | Cost |
|--------|----------------|--------|------|
| Switch question type | ~4,500 | 0 | $0.001 |
| Regenerate 1 question | ~6,500 | 0 | $0.002 |
| Refine All (15 questions) | ~52,500 | 0 | $0.015 |
| Generate 1 stem image | ~500 | 1 | $0.039 |
| Generate 4 option images | ~2,000 | 4 | $0.156 |

---

## Monthly Cost: 15,000–20,000 Questions

### Text Only (No Images)

| Volume | Input Tokens | Output Tokens | Monthly Cost |
|--------|-------------|---------------|-------------|
| 15,000 | 14.9M | 6.0M | **$5.83** |
| 17,500 | 17.4M | 7.0M | **$6.81** |
| 20,000 | 19.9M | 8.0M | **$7.78** |

### With Images

**Average: ~2 images per image-question** (mix of stem-only and stem+options)

| Volume | Image % | Image Qs | Images | Text Cost | Image Cost | **Total** |
|--------|---------|----------|--------|-----------|------------|-----------|
| 15,000 | 20% | 3,000 | 6,000 | $5.83 | $234 | **$240** |
| 15,000 | 30% | 4,500 | 9,000 | $5.83 | $351 | **$357** |
| 15,000 | 50% | 7,500 | 15,000 | $5.83 | $585 | **$591** |
| | | | | | | |
| 17,500 | 20% | 3,500 | 7,000 | $6.81 | $273 | **$280** |
| 17,500 | 30% | 5,250 | 10,500 | $6.81 | $410 | **$416** |
| 17,500 | 50% | 8,750 | 17,500 | $6.81 | $683 | **$689** |
| | | | | | | |
| 20,000 | 20% | 4,000 | 8,000 | $7.78 | $312 | **$320** |
| 20,000 | 30% | 6,000 | 12,000 | $7.78 | $468 | **$476** |
| 20,000 | 50% | 10,000 | 20,000 | $7.78 | $780 | **$788** |

### Quick Summary

| | No Images | 20% Images | 30% Images | 50% Images |
|---|-----------|------------|------------|------------|
| **15K/mo** | $6 | $240 | $357 | $591 |
| **17.5K/mo** | $7 | $280 | $416 | $689 |
| **20K/mo** | $8 | $320 | $476 | $788 |

---

## Cost Breakdown

- Text generation: **~2%** of total cost (with images)
- Image generation: **~98%** of total cost (with images)
- Text-only is essentially free at scale

---

## Cost Reduction Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| SVG/Canvas for charts, math, tables (already built) | ~30% of images become free | Only works for structured visuals |
| Stem-only images (skip option images) | 60% fewer images | Less visual for picture MCQs |
| Cache images for similar questions | ~20-40% reduction | Needs dedup logic |
| Lower resolution (400px vs 800px) | May reduce if priced by size | Lower quality |
| Selective image generation (on-demand only) | 100% control | SME must click per question |

### Recommended Setup

| Scenario | Strategy | Cost @ 20K/mo |
|----------|----------|---------------|
| Budget | Text only, no images | **$8** |
| Value | 20% images, stem only | **$160** |
| Standard | 30% images, mixed | **$476** |
| Premium | 50% images with options | **$788** |

---

## Infrastructure Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel (hosting + Edge Functions) | Free / Hobby | $0 |
| Vercel Pro (if needed for 60s timeouts) | Pro | $20/mo |
| Domain (optional) | — | $10-15/yr |
| **Total infra** | | **$0–20/mo** |

---

## Models Used

| Model | Purpose | Calls per 15Q run |
|-------|---------|-------------------|
| gemini-2.5-flash | All text agents | ~35-40 calls |
| gemini-2.5-flash-preview-image-generation | AI images | 0-13 calls (on-demand) |

---

*Last updated: April 2025*
*Prices based on Google AI Studio published rates*
