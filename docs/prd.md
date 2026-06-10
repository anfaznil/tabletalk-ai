# Product Requirements Document (PRD)

## Product Name

TableTalk AI

AI Phone Assistant for Restaurants

---

# Vision

Restaurants lose revenue every day because staff cannot answer every phone call during busy periods.

TableTalk AI answers incoming calls 24/7, responds to common customer questions, captures catering and large-order leads, and escalates urgent requests to restaurant staff.

The goal is not to replace staff.

The goal is to eliminate missed opportunities and reduce interruptions during service.

---

# Problem Statement

Restaurant employees are frequently occupied with:

* Taking orders
* Preparing food
* Serving customers
* Managing deliveries

As a result:

* Calls go unanswered
* Catering inquiries are missed
* Customers hang up
* Staff repeatedly answer the same questions

Restaurant owners need a low-cost solution that can answer calls professionally and consistently.

---

# Target Customers

### Primary

* Fast casual restaurants
* Halal restaurants
* Family-owned restaurants
* Independent restaurants

### Secondary

* Cafes
* Food trucks
* Small restaurant chains

---

# MVP Goal

Create an AI assistant capable of:

1. Answering common customer questions
2. Providing restaurant information
3. Capturing catering inquiries
4. Capturing large-order requests
5. Escalating requests to staff
6. Generating call summaries

The MVP does NOT need to:

* Take payments
* Place food orders
* Integrate with POS systems
* Handle reservations

---

# User Roles

## Restaurant Owner

Can:

* Configure restaurant information
* Configure menu information
* View call summaries
* View captured leads

---

## Customer

Can:

* Ask questions
* Learn about menu items
* Ask about catering
* Request large orders
* Request a human callback

---

# Core Features

## Restaurant Profile

Restaurant owner can configure:

* Restaurant Name
* Phone Number
* Address
* Website
* Hours
* Delivery Availability
* Catering Availability

---

## Menu Management

Restaurant owner can add:

* Menu Item Name
* Description
* Price
* Category

Examples:

* Chicken Over Rice
* Gyro Over Rice
* Falafel Over Rice
* Mango Lassi

---

## FAQ Management

Restaurant owner can define answers for:

* Are you halal?
* Do you offer catering?
* Do you have vegetarian options?
* What are your hours?
* Do you deliver?
* Where are you located?

---

## AI Customer Assistant

The assistant should:

### Answer Questions

Examples:

Customer:
"Are you halal?"

AI:
"Yes, all of our meat is halal."

---

Customer:
"What time do you close?"

AI:
"We close at 9 PM tonight."

---

### Catering Lead Capture

If customer expresses catering intent:

Examples:

* "Do you cater?"
* "I need food for 50 people."
* "Can you provide lunch for an office?"

AI should collect:

* Name
* Phone Number
* Event Date
* Estimated Guest Count
* Catering Notes

Store as lead.

---

### Large Order Capture

Examples:

* "I need 20 platters."
* "Can I order for a team lunch?"

Collect:

* Name
* Phone Number
* Date Needed
* Estimated Quantity
* Notes

Store as lead.

---

### Human Callback Requests

Examples:

* Complaint
* Refund request
* Delivery issue
* Special request

Collect:

* Name
* Phone Number
* Message

Store as callback request.

---

# Lead Management Dashboard

Restaurant owner can see:

## Catering Leads

Fields:

* Date
* Customer Name
* Phone
* Event Date
* Guest Count
* Notes

---

## Callback Requests

Fields:

* Customer Name
* Phone
* Reason
* Timestamp

---

## Call Summaries

For every interaction:

Store:

* Caller
* Timestamp
* Summary
* Outcome

Example:

"Customer requested catering for 75 people on July 15. Contact information collected."

---

# AI Behavior Rules

The AI should:

* Only answer using restaurant data
* Never invent menu items
* Never invent pricing
* Never promise unavailable services
* Ask clarifying questions when information is missing

If uncertain:

Respond:

"I'd be happy to have someone from the restaurant follow up with you. May I get your name and phone number?"

---

# Technical Requirements

## Frontend

* Next.js
* TypeScript
* TailwindCSS

---

## Backend

* Next.js API Routes

---

## Database

Supabase

Tables:

### restaurants

* id
* name
* address
* phone
* hours
* catering_available

### menu_items

* id
* restaurant_id
* name
* description
* price
* category

### faqs

* id
* restaurant_id
* question
* answer

### leads

* id
* restaurant_id
* lead_type
* customer_name
* phone
* details
* created_at

### conversations

* id
* restaurant_id
* summary
* created_at

---

# Phase 2

After MVP validation:

* Twilio Voice Integration
* SMS Follow-Ups
* Call Recording
* Google Business Profile Sync
* Multi-Restaurant Support
* White Label Solution
* POS Integrations
* Reservation Support

---

# Success Metrics

Within first 30 days:

* 5 restaurants onboarded
* 100+ calls handled
* 20+ captured leads
* 90% FAQ answer accuracy

Primary KPI:

Captured revenue opportunities per restaurant per month.

---

# Design Principles

* Extremely simple setup
* Mobile-friendly dashboard
* Fast onboarding
* No technical knowledge required
* Focus on lead capture over automation

The product should feel like hiring a reliable employee who never misses the phone.
