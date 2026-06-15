# MemoryMate 🧠💖

MemoryMate is a real-time, browser-based face recognition assistant designed specifically for dementia patients. Built with a focus on warmth, accessibility, and comfort, MemoryMate helps users identify their loved ones, caregivers, and friends using just their device's webcam.

## Features ✨

- **Browser-Based Face Recognition**: Uses `face-api.js` (built on TensorFlow.js) to perform all face detection and recognition directly on the device, ensuring privacy and speed without requiring backend machine learning servers.
- **Warm & Accessible UI**: Designed specifically for dementia care. Features a soothing purple/pink color palette, large rounded readable fonts (Nunito and Quicksand), and gentle, reassuring language. 
- **Persistent Memory**: Connects to Supabase to save known faces (128-element face descriptors) and relationships securely in the cloud.
- **Real-time AR Feedback**: Softly highlights faces with glowing, friendly bounding boxes and displays the person's name alongside their relationship (e.g., "Sarah", "Your daughter").

## Tech Stack 🛠

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Vanilla CSS (Custom modern properties)
- **Face Recognition**: `face-api.js` (SSD MobileNetV1)
- **Database**: Supabase (PostgreSQL)

## Getting Started 🚀

### Prerequisites

- Node.js (v18+)
- A Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dhananjaiyadav1234/memoryMate.git
   cd memoryMate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project in Supabase.
   - Execute the schema SQL found in `supabase/schema.sql` (if available) or create a `persons` table with columns: `id` (uuid), `name` (text), `relationship` (text), `face_descriptor` (float8[]), `photo_url` (text), `created_at` (timestamp).
   - Create a `.env.local` file in the root directory:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

4. **Download the Models**
   - `face-api.js` requires specific neural network weights. These should be placed in `public/models/`. (The required models are `ssd_mobilenetv1`, `face_landmark_68_model`, and `face_recognition_model`).

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Design Philosophy 🎨

The UI was completely overhauled from a standard "tech-focused" AR overlay to a **warm dementia-care theme**:
- **Typography**: Removed harsh monospace fonts in favor of highly readable sans-serifs.
- **Colors**: Replaced intense neon greens/reds with soothing lilacs and pinks to reduce anxiety.
- **Microcopy**: Swapped technical terms like "Unidentified Target" to friendly prompts like "Who is this? Let's remember them."

## License

MIT License
