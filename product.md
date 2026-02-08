Sex-Ed Platform: Product Requirements (Self-Guided Version)

1. Product Vision

A private, judgment-free wellness platform providing sexual education, AI-driven guidance, a community forum, and a curated shop. The app serves as a digital "older sister/mentor" for intimacy and health education, intentionally moving away from a clinical medical look toward a lifestyle and relationship-focused aesthetic.

2. Visual Identity & UI (The "Hinge" Aesthetic)

2.1 Color Palette

Primary (Hinge Mauve): #8257E5 / #6139B3 (Used for primary actions and branding).

Background (Creme): #F9F7F2 (The main canvas color, avoiding stark clinical whites).

Secondary (Charcoal): #111111 (For high-contrast text and primary headers).

Accent (Soft Red/Peach): #FF5A5F (Used sparingly for highlights).

2.2 Typography

Headings: Bold, high-contrast Serif font (e.g., Recoleta or Post Grotesk) to feel sophisticated and editorial.

Body Text: Clean, modern Sans-Serif (e.g., Proxima Nova or Inter) for high readability.

Tone of Voice: Direct, empathetic, and slightly witty—moving away from medical jargon.

2.3 UI Components

Cards: Soft rounded corners (20px+) with subtle shadows or thin borders (#EAE8E4).

Buttons: Bold, pill-shaped (fully rounded) buttons with high-contrast labels.

Input Fields: Clean underlines or soft-filled boxes that feel like a high-end lifestyle app.

3. Core Functional Modules

3.1 Onboarding & Personalization

3.1.1 Single-page Questionnaire:

Age: Number input (Strict 18+ validation).

Gender: Male, Female, Non-binary, Prefer not to say.

Relationship Status: Single, Dating, Married, Complicated.

Main Interests: Multi-select chips (Relationship Advice, Intimacy Techniques, Product Knowledge, General Education).

3.1.2 Personalization Loader:

3-5 second animation: "Curating your personal guide..." using a signature pulse animation in Mauve.

3.2 Homepage Structure

Welcome Area: "Hi [User]," in bold serif + Daily Tip Card in a soft accent color.

Main Grid (4 Primary Cards):

AI Guide: 24/7 chat access for questions.

Community Hub: Trending discussions and forums.

Wellness Shop: Featured products and intimacy tools.

Learning Center: Articles and video content.

Bottom Navigation: Home | AI Chat | Community | Shop | Profile.

3.3 AI Agent (The Guide)

Capabilities: Answers questions based on an educational database, recommends shop products, and summarizes community trends.

Safety Guardrails: Detects medical/emergency keywords.

Response: Provides empathetic educational info + a standard disclaimer: "I am an AI, not a doctor. Please consult a healthcare professional for medical diagnosis."

3.4 Wellness Shop

Browse: Categorized listing of products (Lubricants, Wellness Books, Intimacy Kits).

Product Detail: High-quality imagery, "Why we love it," and educational context.

4. Revised User Flows

4.1 AI Chat to Shop Flow

User asks AI: "How can I improve intimacy with my partner?"

AI provides 3 tips + recommends a specific product (e.g., a massage oil).

User clicks "View Product" → Directly enters the Shop module.

4.2 Emergency/Medical Detection

User types: "I have a weird rash."

AI detects medical keyword.

AI responds: "That sounds uncomfortable. While I can't diagnose you, here is an article on skin health and a list of local clinic types you might look for. Please see a professional."

5. Technical Requirements

Privacy: All chat logs are encrypted. Users can choose to remain "Anonymous" in the community.

Search: Global search for Articles, Products, and Community posts.