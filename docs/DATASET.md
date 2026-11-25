# BLUE Dataset Documentation

## Purpose
150 fictional campus lost-and-found reports for development, analytics, and the hackathon demo. No real names, phone numbers, student IDs, or personal contact details are included.

## Source
`server/seed/reports.json`

## Report fields
Each record follows the shared API contract:
- `itemName`, `category`, `color`, `brand`, `location`
- `date` (`YYYY-MM-DD`) and `time` (local 24-hour `HH:mm`)
- `description`
- `type`: `LOST` or `FOUND`
- `status`: `ACTIVE` or `REUNITED`

Server-managed `_id`, `createdAt`, and `updatedAt` are intentionally omitted. The shared contract does not define `MATCHED`, so this dataset uses only `ACTIVE` and `REUNITED`. All 150 demo reports start as `ACTIVE` so they remain eligible for matching.

## Dataset composition
- Total: **150**
- LOST: **75**
- FOUND: **75**
- ACTIVE: **150**
- REUNITED: **0**

## Allowed campus locations
Library, Main Canteen, Computer Science Block, Auditorium, Sports Ground, Parking Area, Seminar Hall, Hostel, Administrative Block, Laboratory.

## Generation approach
The sample records were generated from controlled fictional pools of item names, categories, colours, brands, descriptions, locations, dates, and times. A fixed random seed makes the generation reproducible. LOST category and location distributions are deliberately weighted to create useful demonstration insights. All analytics are calculated from the JSON records, not manually assigned.

## Required matching demonstrations
1. LOST Navy Bottle — Library ↔ FOUND Blue Water Bottle — Library
2. LOST Grey Hoodie — Library ↔ FOUND Gray Sweatshirt — Library
3. LOST Black Backpack — Main Canteen ↔ FOUND Black Bag — Main Canteen

Each pair has compatible category/colour/brand/location/description and nearby timestamps.
