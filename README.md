# Daily Life Tracker

A lightweight web-based tracker for daily sleep and mood.  
No goals, no pressure — just a simple visual record of how each day went.

---

## 🧠 Why this project exists

Most productivity tools focus on **planning**:
to-do lists, goals, schedules.

This project focuses on the opposite:
**recording outcomes**.

- How did I sleep?
- How did the day feel?

Each day is treated less like a plan, and more like a **scorecard**.

---

## 🎯 Core Concept

- Track **sleep time** and **daily mood**
- One small action per day is enough
- Progress is shown through **visual completion**, not numbers or notifications

Think of it as:
> “GitHub contribution graph, but for your daily condition.”

---

## 👤 Target Users

- People who failed at diaries or planners
- Burned-out workers or students who want to check in with themselves
- Anyone who wants a **low-friction daily habit**

---

## ✨ Key Features (MVP)

### Daily Board
- Calendar-style board showing each day
- Three states:
  - Empty (no record)
  - Partially completed (sleep or mood)
  - Fully completed (sleep + mood)

### Sleep Tracking
- Record **bedtime** and **wake-up time**
- Sleep duration is calculated only when both exist
- Sleep is always attributed to the **wake-up date**
- Partial states are allowed and visible

### Mood Tracking
- Record one mood per day
- Up to 5 moods, user-defined
- Mood can be recorded independently of sleep

### Gentle Streak Logic
- A streak continues if **either sleep or mood** is recorded
- Missing days do **not** reset streaks
- No pressure, no scolding

### Visual-Only Reward
- No scores, no stats, no notifications
- Progress is shown only through **colors and patterns**

---

## 🕒 Input Philosophy

- Default input = current time
- Simple buttons first (Wake / Sleep)
- Fine-tuning via +30 / -30 minutes
- Manual time input is possible when needed
- All inputs are validated to real-world time

---

## 🚫 What this project intentionally does NOT include

- No analytics or insights
- No goals, to-dos, or plans
- No reminders or push notifications
- No retroactive editing of past days
- No social features
- No gamified points or levels
- No AI coaching (for now)

This is a **quiet tool** by design.

---

## 🛠 Tech Direction

- Web-first implementation
- Minimal infrastructure and low operating cost
- Designed to evolve into:
  - Flutter-based native app
  - Home screen widgets

---

## 📄 Documentation

- Full product decisions and scope are documented in `PRD.md`
- UX risks and future improvements are tracked separately

---

## 📌 Status

This project is currently in **MVP development**.

