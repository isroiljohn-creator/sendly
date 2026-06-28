import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] py-16 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans antialiased">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/60 shadow-xl rounded-3xl p-8 sm:p-16">
        
        {/* Header */}
        <div className="text-center border-b border-slate-100 pb-10 mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-[#7CA607] animate-pulse"></span>
            <span className="text-xs font-bold text-[#7CA607] tracking-widest uppercase">Rasmiy hujjat</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Ommaviy Oferta
          </h1>
          <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Oxirgi yangilanish: 30-May, 2026-yil
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-slate-600 space-y-8 text-[15px] leading-relaxed">
          
          <div className="bg-[#C7F33C]/10 border border-[#C7F33C]/30 rounded-2xl p-6 sm:p-8 mb-8 text-slate-700">
            <p className="font-semibold text-slate-900 mb-2">Tashrif buyuruvchilar va foydalanuvchilar diqqatiga!</p>
            <p>
              Ushbu hujjat <strong>Sendly</strong> (keyingi o'rinlarda — “Biz”, “Tizim” yoki “Ijrochi”) loyihasining rasmiy taklifi (Ommaviy Oferta) bo'lib, platforma xizmatlaridan foydalanish shartlarini belgilaydi. Saytda ro'yxatdan o'tish yoki to'lovni amalga oshirish orqali siz ushbu shartnoma shartlariga so'zsiz rozilik bildirasiz.
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              1. Umumiy qoidalar
            </h2>
            <p>
              1.1. Sendly.uz — Instagram professional akkauntlari va Telegram botlari uchun avtomatlashtirilgan chatbot va marketing platformasidir.
            </p>
            <p className="mt-2">
              1.2. Foydalanuvchi — platformada ro'yxatdan o'tgan, sayt imkoniyatlaridan biznes yoki shaxsiy maqsadlarda foydalanuvchi har qanday jismoniy yoki yuridik shaxs.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              2. Shartnoma predmeti
            </h2>
            <p>
              2.1. Ijrochi foydalanuvchiga Sendly.uz tizimining dasturiy ta'minotidan foydalanish, avtomatlashtirilgan botlar yaratish, integratsiya qilish va analitik hisobotlarni olish imkoniyatini (SaaS formatida) taqdim etadi.
            </p>
            <p className="mt-2">
              2.2. Xizmatlar pullik obuna (tariflar) asosida taqdim etiladi. Foydalanuvchi tizimning barcha funksiyalarini bepul sinab ko'rishi uchun 7 kunlik sinov muddati (Trial) taqdim etiladi.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              3. Tariflar va to'lov shartlari
            </h2>
            <p>
              3.1. Hozirda platformada quyidagi tariflar belgilangan:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>PRO tarifi:</strong> 150,000 so'm / oy. Bitta Instagram professional akkaunti va 1,000 ta bepul AI tokenlari.
              </li>
              <li>
                <strong>PREMIUM tarifi:</strong> 300,000 so'm / oy. Bitta Instagram professional akkaunti va 30,000 ta bepul AI tokenlari.
              </li>
              <li>
                <strong>VIP tarifi:</strong> 1,200,000 so'm / oy. 10 tagacha Instagram professional akkaunti va 150,000 ta bepul AI tokenlari.
              </li>
            </ul>
            <p className="mt-3">
              3.2. 7 kunlik bepul sinov muddatini boshlash uchun foydalanuvchi o'zining bank kartasini (UzCard, Humo, Visa yoki Mastercard) tizimga ulaydi. Sinov muddati tugagandan so'ng, obuna avtomatik tarzda uzaytiriladi va ulanib qolgan kartadan keyingi oy uchun obuna haqi avtomatik ravishda yechib olinadi (Auto-pay / Recurrent).
            </p>
            <p className="mt-2">
              3.3. Foydalanuvchi istalgan vaqtda shaxsiy kabinetida obunani bekor qilishi va bank kartasini tizimdan uzib qo'yishi mumkin. Bunda keyingi davr uchun avtomatik to'lov yechilishi to'xtatiladi.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              4. Tomonlarning huquq va majburiyatlari
            </h2>
            <p className="font-bold text-slate-800 mt-2">4.1. Foydalanuvchi majburiyatlari:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tizim orqali spam, taqiqlangan mahsulotlar reklamasi yoki haqoratli xabarlarni tarqatmaslik.</li>
              <li>Meta (Facebook/Instagram) platformasining rasmiy foydalanish siyosati va qoidalariga rioya qilish.</li>
              <li>O'z hisobining xavfsizligini (parollarini) uchinchi shaxslarga bermasdan mustaqil ta'minlash.</li>
            </ul>
            <p className="font-bold text-slate-800 mt-3">4.2. Ijrochi majburiyatlari:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tizimning uzluksiz va 99.9% barqaror ishlashini ta'minlash.</li>
              <li>Foydalanuvchilarning shaxsiy ma'lumotlari va Meta ulanish tokenlarini to'liq shifrlangan holatda (AES-256) xavfsiz saqlash.</li>
              <li>Meta platformasida texnik o'zgarishlar yoki uzilishlar yuz berganda chatbotlarni moslashtirish choralarini tezkor ko'rish.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              5. Pulni qaytarish shartlari (Refund Policy)
            </h2>
            <p>
              5.1. Avtomatik to'lov amalga oshirilgandan so'ng, foydalanuvchi obunadan umuman foydalanmagan bo'lsa va 24 soat ichida bizga murojaat qilsa, yechilgan mablag' to'liq hajmda qaytarib beriladi.
            </p>
            <p className="mt-2">
              5.2. Arizalar ko'rib chiqilib, pul qaytarish tasdiqlangan taqdirda, mablag' 3-5 bank ish kuni ichida foydalanuvchining to'lov kartasiga o'tkaziladi.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              6. Javobgarlikni cheklash
            </h2>
            <p>
              6.1. Ijrochi foydalanuvchining shaxsiy akkauntlari Meta (Facebook/Instagram) tomonidan uchinchi tomon norasmiy qoidalari buzilishi (spam yoki taqiqlangan kontent) sababli bloklanishi uchun javobgar emas. Sendly faqat rasmiy API orqali ishlaydi va xavfsizlikni kafolatlaydi.
            </p>
            <p className="mt-2">
              6.2. Internet uzilishlari, provayderlardagi texnik muammolar yoki uchinchi tomon dasturlarining xatoliklari tufayli xizmat ko'rsatish kechikkanda Ijrochi moddiy javobgarlikni o'z zimmasiga olmaydi.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              7. Fors-major holatlar
            </h2>
            <p>
              7.1. Tabiiy ofatlar, urushlar, hukumat qarorlari yoki server hosting markazlaridagi keng ko'lamli avariyalar yuz berganda, tomonlar ushbu shartnoma majburiyatlarini bajarishdan vaqtinchalik ozod etiladilar.
            </p>
          </section>

          {/* Section 8 */}
          <section className="border-t border-slate-100 pt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
              8. Aloqa va qo'llab-quvvatlash
            </h2>
            <p>
              Sizda ushbu Ommaviy Oferta yuzasidan biron-bir savol yoki e'tiroz bo'lsa, quyidagi rasmiy elektron pochta orqali biz bilan bog'lanishingiz mumkin:
              <br />
              <strong>E-mail:</strong> <a href="mailto:6220v1@gmail.com" className="text-[#7CA607] hover:underline font-semibold">6220v1@gmail.com</a>
              <br />
              <strong>Manzil:</strong> Toshkent shahri, O'zbekiston.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Sendly.uz. Barcha huquqlar himoyalangan. Toshkent, O'zbekiston.
        </div>
      </div>
    </div>
  );
}
