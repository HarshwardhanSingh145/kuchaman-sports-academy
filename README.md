# Kuchaman Sports Academy (KSA) 🏏🏊‍♂️

Official Web Platform & Slot Booking System for **Kuchaman Sports Academy (KSA)**, Kuchaman City, Rajasthan.

---

## 🌟 Project Highlights

1. **Agency-Grade Landing Page (`index.html`)**:
   - Modern, high-performance web experience with **Lenis v1.3.26** buttery smooth scrolling.
   - **GSAP & ScrollTrigger** masked text reveals and staggered animations.
   - Showcase sections for **Regular Cricket Nets (3 Nets)**, **Big Box Cricket (11 vs 11)**, and **Semi-Olympic Swimming Pool**.
   - Fully responsive, accessible, and optimized for low latency.

2. **Full-Stack Slot Booking & Academy Portal (`kuchaman-sports-academy/`)**:
   - Powered by **Next.js 15, React 19, TypeScript, and Tailwind CSS**.
   - **Live Slot Reservations**: Real-time cricket nets and swimming slot selection with instant price computation.
   - **Payment & Verification**: Dynamic UPI QR payment display and transaction screenshot upload.
   - **Google Cloud Firestore Integration**: Secure cloud persistence for bookings, slots, students, attendance, certificates, and audit logs.
   - **Admissions & Mentor Portal**: Dedicated portals for academy admissions, player rosters, and digital certificates.
   - **Owner / Admin Dashboard**: Protected administrative controls.

---

## 📁 Repository Structure

```
kuchaman-sports-academy/
├── index.html                   # Main Landing Page (Lenis + GSAP + Tailwind)
├── assets/                      # Stylesheets, JavaScript plugins & image assets
│   ├── css/                     # lenis.css, main.css, typography-animations.css
│   └── js/                      # lenis.min.js, main.js, gsap, etc.
├── gallery/                     # High-definition facility videos and imagery
└── kuchaman-sports-academy/     # Full-Stack Next.js Booking Applet
    ├── app/                     # Next.js App Router & API Route Handlers
    ├── components/              # React UI components (BookingSection, AdminModal, etc.)
    ├── lib/                     # Firebase, Firestore service, Storage & types
    ├── firestore.rules          # Security rules for Google Cloud Firestore
    └── package.json             # Next.js dependencies and scripts
```

---

## 🚀 Running Locally

### 1. Run the Main Landing Page
You can serve the landing page with any static web server:
```bash
# Using Python
python3 -m http.server 8080
```
Open [http://localhost:8080/index.html](http://localhost:8080/index.html) in your browser.

### 2. Run the Full-Stack Booking App
```bash
cd kuchaman-sports-academy
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment

- **Landing Page**: Can be deployed on **GitHub Pages**, Vercel, Netlify, or Cloudflare Pages.
- **Booking App**: Deploy seamlessly on **Vercel** with 1 click directly from this GitHub repository.
