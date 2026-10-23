# Data Mühəndisi Müsahibə Hazırlığı (Atəşgah Sığorta)

Bu layihə **Atəşgah Sığorta Şirkəti** "Data Mühəndisi" vakansiyası üzrə Elmar üçün hazırlanmış fərdi, mobil-yönümlü statik hazırlıq veb-tətbiqidir.

---

## 🚀 Yerli işə salma (Run Locally)

Layihəni öz kompüterinizdə işə salmaq üçün:

```bash
# Asılılıqları quraşdırın
npm install

# İnkişaf serverini başladın (Development)
npm run dev

# İstehsal üçün build edin və yoxlayın (Production Preview)
npm run build
npm run preview
```

Brauzerdə `http://localhost:3000/` və ya `http://localhost:4173/` ünvanını açın.

---

## ✍️ Məzmunu necə redaktə etməli? (Edit Content)

Kodla işləməyə ehtiyac yoxdur! Bütün mətnlər `content/` qovluğundadır:

1. **Mövzu əlavə etmək / redaktə etmək**:
   - `content/topics/` qovluğunda yeni `.md` faylı yaradın və ya mövcudu dəyişin (məsələn: `01-sql-server-memarligi.md`).
   - Faylın başlığındakı YAML frontmatter hissəsini doldurun (`title`, `slug`, `order`, `priority`, `readiness`, `vacancyLink`).
   - Faylı yadda saxlayan kimi saytda avtomatik görünəcək.

2. **Sual-Cavab əlavə etmək**:
   - `content/qa/sample.json` faylını açın və yeni sual obyektini əlavə edin (`id`, `category`, `difficulty`, `question`, `answer`, `code`, `followUps`).

3. **Terminlər Lüğəti**:
   - `content/glossary.json` faylında yeni terminləri daxil edin.

---

## 🌐 Deploy (GitHub Pages və ya Netlify)

Layihə tamamilə statikdir (heç bir server və ya DB tələb olunmur):

- **GitHub Pages**:
  - `npm run build` əmri ilə `dist/` qovluğu formalaşır.
  - GitHub Actions və ya `gh-pages` vasitəsilə `dist` qovluğunu deploy edin. `vite.config.ts`-də `base: './'` tənzimləndiyi üçün istənilən alt-qovluqda işləyir.

- **Netlify**:
  - Build command: `npm run build`
  - Publish directory: `dist`

---

## 📱 Telefonda Ana Ekrana Əlavə Etmək (PWA)

Bu tətbiq **Progressive Web App (PWA)** standartını dəstəkləyir və oflayn işləyir:

1. Saytı telefonunuzda (Chrome və ya Safari) açın.
2. Safari-də: **Paylaş (Share)** → **Ana ekrana əlavə et (Add to Home Screen)** seçin.
3. Chrome-da: **Üç nöqtə (Menyu)** → **Tətbiqi quraşdır (Install App)** seçin.
4. Tətbiq ayrıca tətbiq kimi açılacaq və metroda/avtobusda internet olmadan da bütün mövzuları oxumağa imkan verəcək.
