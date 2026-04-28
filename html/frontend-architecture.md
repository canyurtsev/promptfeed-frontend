# PromptFeed Frontend Architecture

## Overview

PromptFeed frontend is designed as a modern developer platform interface.

The goal of the landing page is to introduce the platform and redirect users to the main application areas:

* Community
* Prompt Playground
* Authentication (Sign In / Sign Up)

Frontend stack:

* HTML
* TailwindCSS
* Vanilla JavaScript
* Modular page structure

---

# Page Structure

The frontend consists of multiple pages.

Main pages:

/index.html
/signin.html
/signup.html
/community.html
/playground.html

Landing page is the main entry point.

---

# Navigation Flow

Landing Page → Authentication → Platform

User flow:

Visitor → Landing Page
Visitor → Sign Up
User → Sign In
Authenticated User → Community Feed

---

# Navigation Bar

Navbar appears on all pages.

Left:

PromptFeed Logo

Center:

Community
Playground
Docs

Right:

Sign In
Sign Up

Buttons should redirect to:

Sign In → /signin.html
Sign Up → /signup.html

---

# Landing Page Sections

## 1 Hero Section

Purpose:

Introduce the platform.

Contains:

Logo
Main slogan
Description
CTA buttons

Buttons:

Explore Community → /community.html
Try Prompt Playground → /playground.html

---

## 2 Prompt Example Section

Displays a sample prompt snippet.

Purpose:

Show what prompts look like.

Example:

System: Efficient Python Developer

Generate a FastAPI project with JWT authentication and PostgreSQL.

---

## 3 Features Section

Explains core platform capabilities.

Features:

Prompt Optimization
Prompt Versioning
Security Scanning
Global Prompt Library

Each feature appears as a card.

---

## 4 Community Section

Shows platform metrics.

Examples:

Active Users
Prompts Shared
Weekly Runs

These values will later come from backend APIs.

---

## 5 Call To Action Section

Encourages visitors to create an account.

Contains:

Email input
Early access button

Later connected to backend.

---

# Authentication Pages

## Sign In Page

Path:

/signin.html

Fields:

Email
Password

Buttons:

Login
Create Account

Login request will call backend API:

POST /auth/login

---

## Sign Up Page

Path:

/signup.html

Fields:

Username
Email
Password

Button:

Create Account

API request:

POST /auth/register

---

# Page Linking

Navbar buttons must link to:

Explore Community → community.html

Try Prompt Playground → playground.html

Sign In → signin.html

Sign Up → signup.html

---

# Folder Structure

Recommended frontend structure:

frontend
│
├── index.html
├── signin.html
├── signup.html
├── community.html
├── playground.html
│
├── css
│   └── styles.css
│
├── js
│   └── auth.js
│
└── assets
└── logo.svg

---

# Authentication Flow

User enters credentials.

Frontend sends request:

POST /auth/login

Backend returns:

JWT token

Token stored in:

localStorage

Example:

localStorage.setItem("token", token)

Token used for authenticated API requests.

---

# Future Improvements

As PromptFeed grows the frontend can migrate to:

Next.js

or

React

But initial version should remain simple and fast.

---

# Design Philosophy

PromptFeed design should feel like developer platforms such as:

GitHub
StackOverflow
Vercel

Key principles:

Minimal
Fast
Readable
Functional

# PromptFeed Frontend Architecture

## Overview

PromptFeed frontend is designed as a modern developer platform interface.

The goal of the landing page is to introduce the platform and redirect users to the main application areas:

* Community
* Prompt Playground
* Authentication (Sign In / Sign Up)

Frontend stack:

* HTML
* TailwindCSS
* Vanilla JavaScript
* Modular page structure

---

# Page Structure

The frontend consists of multiple pages.

Main pages:

/index.html
/signin.html
/signup.html
/community.html
/playground.html

Landing page is the main entry point.

---

# Navigation Flow

Landing Page → Authentication → Platform

User flow:

Visitor → Landing Page
Visitor → Sign Up
User → Sign In
Authenticated User → Community Feed

---

# Navigation Bar

Navbar appears on all pages.

Left:

PromptFeed Logo

Center:

Community
Playground
Docs

Right:

Sign In
Sign Up

Buttons should redirect to:

Sign In → /signin.html
Sign Up → /signup.html

---

# Landing Page Sections

## 1 Hero Section

Purpose:

Introduce the platform.

Contains:

Logo
Main slogan
Description
CTA buttons

Buttons:

Explore Community → /community.html
Try Prompt Playground → /playground.html

---

## 2 Prompt Example Section

Displays a sample prompt snippet.

Purpose:

Show what prompts look like.

Example:

System: Efficient Python Developer

Generate a FastAPI project with JWT authentication and PostgreSQL.

---

## 3 Features Section

Explains core platform capabilities.

Features:

Prompt Optimization
Prompt Versioning
Security Scanning
Global Prompt Library

Each feature appears as a card.

---

## 4 Community Section

Shows platform metrics.

Examples:

Active Users
Prompts Shared
Weekly Runs

These values will later come from backend APIs.

---

## 5 Call To Action Section

Encourages visitors to create an account.

Contains:

Email input
Early access button

Later connected to backend.

---

# Authentication Pages

## Sign In Page

Path:

/signin.html

Fields:

Email
Password

Buttons:

Login
Create Account

Login request will call backend API:

POST /auth/login

---

## Sign Up Page

Path:

/signup.html

Fields:

Username
Email
Password

Button:

Create Account

API request:

POST /auth/register

---

# Page Linking

Navbar buttons must link to:

Explore Community → community.html

Try Prompt Playground → playground.html

Sign In → signin.html

Sign Up → signup.html

---

# Folder Structure

Recommended frontend structure:

frontend
│
├── index.html
├── signin.html
├── signup.html
├── community.html
├── playground.html
│
├── css
│   └── styles.css
│
├── js
│   └── auth.js
│
└── assets
└── logo.svg

---

# Authentication Flow

User enters credentials.

Frontend sends request:

POST /auth/login

Backend returns:

JWT token

Token stored in:

localStorage

Example:

localStorage.setItem("token", token)

Token used for authenticated API requests.

---

# Future Improvements

As PromptFeed grows the frontend can migrate to:

Next.js

or

React

But initial version should remain simple and fast.

---

# Design Philosophy

PromptFeed design should feel like developer platforms such as:

GitHub
StackOverflow
Vercel

Key principles:

Minimal
Fast
Readable
Functional

I am building a feature called "Prompt Score System" for my platform PromptFeed.

The goal is:

Evaluate the quality of a prompt and give it a score so users can understand how effective their prompt is.

---

# Core Idea

User submits a prompt.

System analyzes it and returns:

* A total score (0–100)
* Sub-scores
* Improvement suggestions

---

# API Design

Create a new endpoint:

POST /prompts/score

Request body:

* prompt (string)
* model (optional)

---

# Response Format

Return structured data:

{
"score": 82,
"breakdown": {
"clarity": 80,
"specificity": 75,
"structure": 85,
"token_efficiency": 78,
"output_reliability": 82
},
"feedback": [
"Add more constraints to improve precision",
"Reduce unnecessary wording to save tokens",
"Specify output format clearly"
]
}

---

# Scoring Logic

Implement a scoring engine.

Evaluation criteria:

1. Clarity
   Is the prompt easy to understand?

2. Specificity
   Does it contain clear instructions and constraints?

3. Structure
   Does it follow a structured format (role, task, constraints)?

4. Token Efficiency
   Is it concise without losing meaning?

5. Output Reliability
   Will the prompt consistently produce good outputs?

---

# Implementation Approach

Create:

promptScore.controller.js
promptScore.service.js

---

## Service Logic

Two approaches:

Option A (AI-based scoring):

Send prompt to an AI model and ask it to evaluate the prompt using structured criteria.

Option B (Hybrid scoring):

* Basic rule-based checks
* Combined with AI evaluation

---

# AI Scoring Prompt (IMPORTANT)

Use a structured evaluation prompt like this:

"Analyze the following AI prompt and score it from 0 to 100 based on clarity, specificity, structure, token efficiency, and output reliability. Return the result as JSON."

---

# Frontend Requirements

Create a Prompt Score panel.

Display:

* Total Score (large number)
* Sub-scores (progress bars)
* Feedback list

---

# UI Behavior

User clicks "Analyze Prompt"

System calls:

POST /prompts/score

Display result instantly.

---

# Advanced Feature (Optional)

Add:

"Improve Prompt" button

This sends:

POST /prompts/optimize

Returns improved version of the prompt.

---

# Gamification

* Show score badges (Beginner, Advanced, Expert)
* Allow users to compare prompts
* Rank prompts based on score

---

# Goal

Make users write better prompts.

Turn PromptFeed into a platform where:

Prompts are not just shared
They are evaluated and improved

---

Design principles:

Accurate
Fast
Developer-friendly
Scalable
