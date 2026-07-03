Buatkan saya sebuah website interaktif dan kolaboratif untuk memeriahkan acara pembukaan Festival IT. Website ini harus memiliki konsep: Seluruh peserta dan pemateri diminta untuk menekan (tap) sebuah tombol secara bersama-sama untuk "mewarnai" logo acara hingga penuh.

**Persyaratan Wajib & Teknis:**
1. **Real-Time Collaboration (WAJIB):** Gunakan **Firebase Realtime Database** atau **Supabase** (pilih yang paling mudah diimplementasi) agar semua orang yang membuka link di HP atau laptop melihat progress yang SAMA secara langsung. Setiap kali seseorang tap tombol, counter global bertambah 1 dan logo di semua perangkat langsung berubah warnanya.
2. **Visual Logo:** Karena saya tidak melampirkan file logo spesifik, **tolong desain dan buatkan sebuah logo vektor IT Festival yang sangat futuristik dan keren** (misalnya berbentuk lingkaran dengan ikon node jaringan, chip processor, atau abstrak digital). Logo ini awalnya **Grayscale / Hitam Putih (atau seperti sketsa wireframe)**.
3. **Mekanik Pewarnaan:**
   - Target global klik: **2026 klik** (atau angka yang terasa menantang tapi bisa dicapai bersama).
   - Saat counter bertambah, logo **terisi warna secara progresif**. Bisa menggunakan efek:
     - *Liquid Fill / Water Fill* (Seperti gelas terisi warna neon dari bawah ke atas).
     - *Path Coloring* (Setiap bagian logo berubah dari abu-abu menjadi warna-warna cerah secara bertahap).
     - *Glow Intensity* (Semakin banyak klik, semakin kuat efek neonnya).
   - Ketika target 100% tercapai, logo harus **Full Color, Fully Animated**, dan muncul **Confetti / Fireworks / Particle Explosion** yang spektakuler.
4. **User Interface & Animasi:**
   - **Tombol Besar:** Tombol di tengah bawah layar bertuliskan "**TAP UNTUK WARNAI**". Tombol harus memiliki efek animasi *ripple* saat ditekan, efek *pulse*, dan haptic feedback (vibrate) jika dibuka di HP.
   - **Statistik Live:** Tampilkan besar-besar:
     - Jumlah klik terkini (Contoh: 1.042 / 2026).
     - Persentase logo yang sudah berwarna.
     - *Opsional:* Jumlah orang yang sedang online (presence).
   - **Background:** Gelap (Dark Mode) dengan animasi grid atau partikel bergerak lambat untuk memberi kesan "Teknologi Festival".
   - **Typography:** Gunakan font modern (Inter, Poppins, atau Space Grotesk).
5. **Kemudahan Akses:**
   - Buat dalam **1 file HTML tunggal** jika memungkinkan (sehingga mudah di-deploy ke Vercel/Netlify atau bahkan dibuka via local file). Tulis kode sebersih dan semodular mungkin.
   - Harus **Mobile-First** dan responsif sempurna. Tombol harus mudah ditekan dengan jempol.
   - Tambahkan instruksi singkat di atas layar: "Makin banyak yang tap, makin cepat logo kita berwarna!"

**Arahan untuk AI Antigravity:**
Lakukan semaksimal mungkin. Jangan setengah-setengah.
- Gunakan CSS Modern (Flex/Grid), animasi GPU-accelerated (transform & opacity).
- Untuk Canvas/SVG Animation, pastikan performanya 60fps.
- Berikan saya kode **Firebase Config** yang jelas (saya akan membuat project Firebase sendiri, jadi tolong sertakan instruksi cara setting Firestore/Realtime Database di komentar kode).
- Berikan saya hasil yang **LUAR BIASA BAGUS**. Saya ingin peserta festival terkesima saat membuka link ini.

**Contoh Alur yang Diinginkan:**
1. Pengguna buka link -> Layar loading sebentar -> Muncul logo festival yang masih polos/abu-abu.
2. Di bawahnya ada angka "0 / 2026 Taps".
3. Pengguna tap tombol -> Counter naik menjadi "1 / 2026" -> Logo bagian bawah sedikit menyala biru/neon.
4. Pengguna lain di seberang ruangan tap -> Counter di HP saya langsung naik -> Logo makin berwarna.
5. Saat mencapai 2026 -> Logo menyala terang, confetti turun, teks berubah menjadi "LOGO TELAH HIDUP! SELAMAT DATANG DI IT FEST!".