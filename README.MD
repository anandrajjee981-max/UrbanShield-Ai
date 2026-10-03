# 🛡️ UrbanShield AI

> **From citizen reports to intelligent civic resolution.**

UrbanShield AI is an **AI-powered civic issue management platform** that connects citizens, administrators, and authorities through one structured workflow.

Citizens can report real-world civic problems with **description, images, and location**. Administrators verify the reports, AI analyzes verified issues, and the system helps assign tasks to suitable authorities based on their **skills, workload, availability, and estimated effort**.

---

## 🚨 Problem

Civic problems such as:

* Water leakage
* Water shortage
* Flooding
* Drainage problems
* Extreme heat
* Other local infrastructure issues

are often reported without a proper system for:

* Verification
* Evidence collection
* Location tracking
* Task estimation
* Workforce management
* Assignment
* Progress tracking
* Resolution tracking

UrbanShield AI creates a structured workflow from the moment a citizen reports an issue until the issue is resolved.

---

# 💡 Our Solution

UrbanShield AI follows:

```text
REPORT
   ↓
VERIFY
   ↓
UNDERSTAND
   ↓
ESTIMATE
   ↓
ASSIGN
   ↓
WORK
   ↓
RESOLVE
```

The platform combines **human verification, AI analysis, and workload-aware task assignment**.

---

# 👥 User Roles

UrbanShield AI has three primary roles:

### 👤 Citizen

Reports civic problems and tracks their reports.

### 🛡️ Administrator

Reviews citizen reports, verifies genuine issues, and manages the civic workflow.

### 🏛️ Authority

Receives assigned tasks, works on them, updates progress, and completes the work.

---

# 👤 Citizen Features

## Authentication

Citizens can create an account and securely access their dashboard.

After authentication, the citizen gets access only to citizen-specific features.

---

## 📢 Report an Issue

A citizen can report a real-world civic problem.

The report contains:

### Issue Type

```text
Water Leakage
Water Shortage
Extreme Heat
Flooding
Drainage
Other
```

### Problem Description

The citizen explains:

* What happened
* Where the problem is
* How long it has been happening
* Any useful additional information

The original description is preserved.

---

## 📸 Evidence

Citizens can provide photographic evidence.

Two ways are supported:

```text
Upload from Device
        OR
Take Photo
```

Images are securely stored using ImageKit.

---

## 📍 Location

Citizens have two options:

```text
Track My Location
        OR
Enter Location Manually
```

### GPS

The device provides:

```text
Latitude
Longitude
```

### Manual

The citizen provides an address/location description.

This allows reporting even when GPS access is unavailable or the citizen prefers manual entry.

---

# 📋 My Reports

Citizens can view the issues they have submitted.

Each report can show:

* Issue type
* Description
* Evidence
* Location
* Current status
* Submission time
* Latest update

---

# 🛡️ Administrator Workflow

Administrators are responsible for reviewing reports before they enter the AI-powered task workflow.

## 1. View Reports

The administrator can see citizen-submitted reports.

A report contains:

```text
Issue Type
Description
Image
Location
Submission Time
Current Status
```

---

## 2. Review Evidence

The administrator reads the citizen's description and checks the submitted evidence and location.

The administrator can then:

```text
VERIFY
   OR
REJECT
```

---

## 3. Verify

A genuine report moves from:

```text
REPORTED
    ↓
VERIFIED
```

Only verified issues enter the intelligent task-analysis workflow.

---

## 4. Reject

If a report is invalid or does not contain sufficient evidence:

```text
REPORTED
    ↓
REJECTED
```

An optional rejection reason can be stored.

---

# 🤖 AI Issue Analysis

Once an issue is verified, AI analyzes the available information.

The AI does not replace the administrator's verification decision.

Instead, it converts an unstructured citizen description into useful task information.

For example:

```text
Citizen Description:

"Water has been leaking continuously near the
main road for two days and the road is becoming
difficult to use."
```

AI can derive structured information such as:

```text
Issue:
Water Leakage

Complexity:
Medium

Estimated Effort:
2 Days

Required Skill:
Water Maintenance

Priority:
High
```

The exact analysis depends on the issue and available information.

---

# 🧠 AI-Assisted Estimation

One of the main goals of UrbanShield AI is to estimate **how much effort a verified civic issue may require**.

For example:

```text
Simple repair       → ~1 day
Moderate repair     → ~2–3 days
Complex operation   → Longer estimated effort
```

The estimated effort becomes an input for task planning.

AI provides an estimate; it does not directly control the final assignment.

---

# 🏛️ Authority Management

Authorities represent the people or teams responsible for resolving civic issues.

Each authority can have information such as:

```text
Authority
├── Skills
├── Department
├── Current Tasks
├── Task Deadlines
├── Estimated Remaining Work
└── Availability
```

This information helps the platform understand the current workforce capacity.

---

# ⚖️ Intelligent Task Assignment

UrbanShield AI does not simply assign every new task to the first available authority.

Instead, assignment considers multiple factors.

```text
New Verified Issue
        ↓
Required Skill
        +
Estimated Effort
        +
Authority Skill
        +
Current Workload
        +
Remaining Task Duration
        +
Future Availability
        ↓
Assignment Recommendation
```

---

# 📊 Workforce-Aware Assignment

Consider three authorities:

```text
Authority A
Current task ends today
Available tomorrow
Required skill matches


Authority B
Current task ends after 3 days
Required skill matches


Authority C
Available today
But required skill does not match
```

For a new two-day task, the system should consider more than just who is technically free.

It evaluates:

* Who has the required skill?
* Who becomes available soon?
* How much work are they already handling?
* How long will their existing tasks continue?
* Can the new task realistically fit into their workload?

This creates a **capacity-aware assignment recommendation**.

---

# 🔄 Task Queue

Authorities can have multiple tasks in their work queue.

Example:

```text
Authority A

Current Task
Drainage Repair
Remaining: 1 Day

        ↓

Next Task
Water Leakage
Estimated: 2 Days

        ↓

Next Task
Water Shortage
Estimated: 1 Day
```

This allows the system to understand future availability instead of looking only at the current moment.

---

# 👨‍💼 Human-in-the-Loop Assignment

AI should support the administrator rather than silently making critical decisions.

The workflow is:

```text
Verified Issue
      ↓
AI Analysis
      ↓
Task Estimation
      ↓
Authority Capacity Analysis
      ↓
Assignment Recommendation
      ↓
Administrator Review
      ↓
Final Assignment
```

The administrator remains responsible for the final assignment decision.

---

# 🏗️ Authority Task Workflow

After assignment:

```text
ASSIGNED
   ↓
IN_PROGRESS
   ↓
RESOLVED
```

The authority can:

* View task details
* Understand the issue
* See location
* Start the task
* Update progress
* Complete the work

---

# ✅ Resolution

Once the authority completes the assigned work:

```text
IN_PROGRESS
      ↓
RESOLVED
```

The issue lifecycle can then be tracked from its original citizen report to final resolution.

---

# 🔄 Complete End-to-End Workflow

```text
                         CITIZEN
                            │
                            ▼
                    Register / Login
                            │
                            ▼
                    Citizen Dashboard
                            │
                            ▼
                     Report an Issue
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Description     Image        Location
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                         GPS Location        Manual Location
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                                  Submit Report
                                         │
                                         ▼
                                      REPORTED
                                         │
                                         ▼
                                    ADMINISTRATOR
                                         │
                                         ▼
                                  Review Report
                                         │
                            ┌────────────┴────────────┐
                            ▼                         ▼
                         VERIFY                    REJECT
                            │                         │
                            ▼                         ▼
                        VERIFIED                  REJECTED
                            │
                            ▼
                       AI ANALYSIS
                            │
                 ┌──────────┼───────────┐
                 ▼          ▼           ▼
              Skill     Complexity   Effort
            Required                 Estimate
                 │          │           │
                 └──────────┼───────────┘
                            ▼
                    WORKFORCE ANALYSIS
                            │
                 ┌──────────┼───────────┐
                 ▼          ▼           ▼
              Skills    Workload    Availability
                            │
                            ▼
                  ASSIGNMENT RECOMMENDATION
                            │
                            ▼
                       ADMIN REVIEW
                            │
                            ▼
                         ASSIGNED
                            │
                            ▼
                        AUTHORITY
                            │
                            ▼
                       IN_PROGRESS
                            │
                            ▼
                         RESOLVED
```

---

# 🔐 Role-Based Access

Every user receives access according to their role.

```text
                  USER
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       CITIZEN  AUTHORITY  ADMIN
          │        │        │
          ▼        ▼        ▼
       Citizen   Authority  Admin
       Dashboard Dashboard Dashboard
```

### Citizen

Can:

* Report issues
* View own reports
* Track report status

### Authority

Can:

* View assigned tasks
* Work on assigned issues
* Update task progress
* Complete tasks

### Administrator

Can:

* Review reports
* Verify reports
* Reject reports
* Manage the issue workflow
* Review AI recommendations
* Approve task assignments

Users cannot access another role's protected dashboard or actions.

---

# 🧩 System Architecture

```text
                    ┌───────────────┐
                    │    Citizen    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │   Frontend    │
                    │    React      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Backend    │
                    │ Node + Express│
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         PostgreSQL      ImageKit          AI
           Neon                         Analysis
             │
             ▼
       Issue + User Data
```

---

# 🛠️ Technology Stack

## Frontend

* React.js
* JavaScript
* Responsive Web UI

## Backend

* Node.js
* Express.js
* TypeScript
* REST architecture

## Database

* PostgreSQL
* Neon

## Authentication

* Keycloak
* Role-Based Access Control

## Image Storage

* ImageKit

## AI

* AI-powered issue analysis
* Effort estimation
* Skill identification
* Assignment recommendation

## Deployment

* Vercel for frontend
* Cloud-based backend deployment
* Neon for managed PostgreSQL
* ImageKit for image storage

---

# 🔒 Security

UrbanShield AI is designed around role-based access and protected user data.

Important principles include:

* Role-based authorization
* Server-side permission checks
* Secure authentication
* Protected administrative actions
* Validated issue data
* Secure image handling
* No sensitive credentials exposed to clients
* Citizen identity is taken from the authenticated session
* Users cannot arbitrarily change issue status

---

# 📈 Issue Lifecycle

The complete issue lifecycle is:

```text
REPORTED
   │
   ├──────────────► REJECTED
   │
   ▼
VERIFIED
   │
   ▼
ASSIGNED
   │
   ▼
IN_PROGRESS
   │
   ▼
RESOLVED
```

Each stage represents a different part of the civic resolution process.

---

# 🎯 What Makes UrbanShield AI Different

UrbanShield AI is not just a complaint submission platform.

It connects the complete workflow:

```text
Citizen Reporting
       +
Evidence
       +
Location
       +
Human Verification
       +
AI Understanding
       +
Effort Estimation
       +
Workforce Capacity
       +
Smart Assignment
       +
Task Tracking
       +
Resolution
```

The goal is to move from:

> **"A citizen reported a problem."**

to:

> **"The problem was verified, understood, assigned to an appropriate authority, and tracked until resolution."**

---

# 🌆 Vision

UrbanShield AI aims to create a more structured and intelligent way to manage civic problems.

Instead of treating every complaint as an isolated report, the platform builds a complete operational workflow around it.

```text
See the Problem
       ↓
Understand the Problem
       ↓
Find the Right Resource
       ↓
Manage the Work
       ↓
Resolve the Problem
```

---

# 🚀 Future Scope

UrbanShield AI can be extended with:

* AI image-based issue detection
* Duplicate report detection
* Civic issue heatmaps
* Real-time notifications
* SLA and deadline monitoring
* Automatic escalation
* Authority performance analytics
* Public transparency dashboard
* Historical civic data analysis
* Predictive urban insights
* Multilingual reporting
* Mobile application
* Citizen feedback after resolution

---

# 👨‍💻 Team

## Rishikesh Pal

**Frontend Developer**

GitHub:
https://github.com/rishikesh-Dev01

## Anand Raj

**Backend • AI • DevOps**

GitHub:
https://github.com/anandrajjee981-max

---

# ❤️ Built for Smarter Cities

**UrbanShield AI**

*Report. Verify. Understand. Assign. Resolve.*
