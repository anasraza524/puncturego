# PunctureGo – Project Report (Frontend phase)

**Course / Section:** ______  **Group members:** ______ (3–4)  **Date:** ______

## 1. Problem statement
Drivers stranded with a puncture, dead battery or engine fault cannot quickly tell which verified mechanic is nearest, whether it is open, what it charges, or where their help is. Shops get duplicate calls, technicians are double-booked and concession (reduced-rate) help is misused. PunctureGo lets drivers find mechanics by GPS, raise tracked requests, and lets shops dispatch technicians under verified rules.

## 2. Objectives
Find the nearest mechanic (map, GPS, filters); run a request workflow (request → approve → assign → dispatch → arrive → complete → confirm/dispute); never promise a unit/technician twice or exceed shop capacity; control concession misuse; trace every job; role-appropriate screens (view vs change); responsive, accessible UI.

## 3. Background / theory
* **Haversine formula** gives great-circle distance between two lat/lng points: `d = 2R·asin(√(sin²(Δφ/2)+cosφ₁·cosφ₂·sin²(Δλ/2)))`, R = 6371 km; used for “km away” and sorting.
* **Geolocation API** (`navigator.geolocation`, high accuracy) works only on HTTPS/localhost; the draggable pin is the fallback.
* **REST + Fetch**: the UI reads JSON through `fetch()`; the mock API mirrors the planned REST resources so only the data layer changes in phase 2.
* **Role-based access control**: every screen is scoped by role and every action by role + status.
* **State machine**: request status changes follow guarded transitions with an audit trail.
* **Responsive design**: Bootstrap 5 grid/flexbox, media queries, mobile-first technician screen.

## 4. System design
Roles, use case diagram, life-cycle diagram, permission matrix and API contract are in `README.md`. Data model (mock tables): `users(id, role, areaId|shopId, concession…)`, `areas`, `shops(areaId, lat, lng, capacity, hours, vehicles, services, status)`, `units(shopId, vehicle, status)`, `requests(customerId, shopId, unitId, techId, vehicle, service, type, lat, lng, status, history[])`, `applications`, `rates(service, vehicle, standard, concession)`. Architecture: static pages → `js/<page>.js` → `js/app.js` (API, rules, helpers) → `data/*.json` + `localStorage`.

## 5. Implementation summary
| Area | What was built |
|---|---|
| Public | Finder with Leaflet map, GPS, distance/vehicle/issue/open-now filters, search, sort, Call / WhatsApp / Request help; customer sign-up; shop registration with map pin |
| Customer | Overview with live stepper, request form with GPS pin and live price/capacity preview, history with search/filter/sort/pagination and CSV export, bills and payment, profile, concession application and monthly-limit alerts |
| Verifier | Concession request approvals, shop verification, concession applications, disputes, read-only area jobs |
| Operator | Capacity gauge, dispatch queue, assignment with conflict-free unit/technician lists, dispatch, units/technicians, shop profile, availability toggles |
| Technician | Own jobs only, large buttons, navigate link, arrived / completed / cannot-complete with reason |
| Admin | City reports (aggregates), all requests with CSV export, CRUD for areas, shops, units, users, rates with delete guards |

## 6. Testing
| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Submit empty request form | Errors on vehicle, number, problem, shop, landmark, pin | Pass (scripted) |
| 2 | Valid request | Created, status Approved (standard) | Pass (scripted) |
| 3 | Third open request | Blocked with limit message | Pass (scripted) |
| 4 | Shop list for Car + Puncture | Only shops handling both | Pass (scripted) |
| 5 | Assign without unit/technician | Validation errors | Pass (scripted) |
| 6 | Assign → dispatch → arrived | Statuses Assigned → Dispatched → Arrived | Pass (scripted) |
| 7 | Technician “cannot complete” without reason | Blocked | Pass (scripted) |
| 8 | Verifier approves concession request / verifies shop | Approved / Active | Pass (scripted) |
| 9 | All 12 pages render for seeded roles | No console errors | Pass (scripted) |
| 10 | Layout at 360 px and laptop width | Usable, tables become cards | ☐ verify in browser |
| 11 | GPS detection on phone | Pin moves, list re-sorts | ☐ verify in browser |
| 12 | Concession over monthly limit | Blocked | ☐ verify in browser |
| 13 | Unit unavailable returns assigned jobs | Jobs back in queue | ☐ verify in browser |

## 7. Output screenshots (insert)
Finder (desktop + mobile), request form with pin, customer tracker, verifier tabs, operator queue and assign modal, technician screen on phone, admin reports.

## 8. Discussion and reflection
Hardest parts: keeping rules identical across roles (solved by shared `Rules` and `moveReq`), live distance sorting with a draggable pin, and avoiding double-assignment. Limitations: data in browser storage, no real authentication, WhatsApp cannot start live-share from a link. Phase 2: real API and database, transactions for assignment, SQL search/sort/pagination, hashed passwords, token auth, Swagger/Postman, ER diagram, tests.

## 9. Group variation & contribution
Variation implemented: ______ (see README). Contribution statement: Member A – ___; Member B – ___; Member C – ___.

## 10. References
Bootstrap 5.3 documentation · Leaflet 1.9 documentation · OpenStreetMap · MDN Fetch API and Geolocation API.
