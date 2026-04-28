Prompt Veri Modeli

Prompt = versioned entity

Prompt
- id
- title
- description
- tags[]
- author_id
- visibility (public / boosted / paid)
- created_at

PromptVersion
- id
- prompt_id
- version_number
- content
- created_at

2️⃣ Vote & Ranking Algoritması

Amaç: Adil sıralama + ücretli boost dengesi

Öneri:

Reddit benzeri score:

score = upvotes - downvotes


Feed sıralama:

rank = (score / (age_in_hours + 2)^1.5) + boost_weight


Boost:

Geçici

Sabit üstte değil, “ağırlık ekler”

3️⃣ Tartışma & Comment Sistemi

Öneriler:

Threaded comments

Parent–child yapı

“Accepted improvement” flag

Comment vote’ları prompt score’dan ayrı

4️⃣ Ücretli Özellikler (Backend Mantığı)
Boost Sistemi
Boost
- prompt_id
- user_id
- start_time
- end_time
- weight


Feed query sırasında boost aktif mi kontrol edilir

Pro / Creator Yetkileri

Feature flag yaklaşımı:

can_view_analytics
can_boost
can_sell_prompts

5️⃣ Reputation Sistemi

Amaç: Spam’i engellemek, kaliteyi öne çıkarmak

Önerilen Puanlama:

Prompt upvote: +X

Accepted improvement: +Y

Downvote: −Z

Boost abuse tespiti → ceza

6️⃣ Ölçeklenebilirlik (Başlangıçtan Doğru Kur)

Öneriler:

Read-heavy yapı → caching (feed)

Vote işlemleri için:

optimistic UI

async write

Analytics:

Prompt bazlı view / test count

Pro için detaylı breakdown