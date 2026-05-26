import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 text-slate-700 font-sans">
      <div className="max-w-4xl mx-auto bg-white border border-slate-100 shadow-xl rounded-3xl p-8 sm:p-14">
        
        {/* Header */}
        <div className="text-center border-b border-slate-100 pb-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">
            Last Updated: May 26, 2026
          </p>
        </div>

        {/* Navigation Tabs for Languages */}
        <div className="space-y-12">
          
          {/* ========================================================================= */}
          {/* ENGLISH VERSION (Primary for Meta Reviewers) */}
          {/* ========================================================================= */}
          <div className="prose prose-slate max-w-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md uppercase">English</span>
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">1. Introduction & Scope</h2>
            <p className="mb-4">
              Welcome to <strong>Sendly</strong> (accessible via <a href="https://www.sendly.uz" className="text-indigo-600 hover:underline">https://www.sendly.uz</a>). We are committed to protecting your personal data and complying with all applicable laws, including the General Data Protection Regulation (GDPR) and the Meta Platform Terms.
            </p>
            <p className="mb-6">
              This Privacy Policy explains how Sendly collects, processes, stores, and protects data obtained through the Meta Graph API (specifically the Instagram Graph API and Facebook Login) when you connect your Instagram Professional Accounts to our service for chatbot automation.
            </p>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">2. Data We Collect and How We Access It</h2>
            <p className="mb-4">
              We access and collect data solely through official Meta APIs when you authorize our application via Facebook Login. We request only the permissions strictly necessary to perform automated marketing operations:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-3">
              <li>
                <strong>Instagram Account Metadata:</strong> Includes your Instagram page name, username, ID, and profile picture url (accessed via the <code>instagram_basic</code> permission). We use this to display your connected channel in the Sendly dashboard.
              </li>
              <li>
                <strong>Access Tokens:</strong> Page Access Tokens and Long-lived User Access Tokens (accessed via Facebook Login). These tokens are <strong>encrypted using AES-256-CBC</strong> before storage to secure your connection.
              </li>
              <li>
                <strong>Direct Messages and Comment Logs:</strong> Includes content of incoming direct messages, stories mentions, mentions, and comments (accessed via the <code>instagram_manage_messages</code> and <code>instagram_manage_comments</code> permissions). This data is processed to trigger your customized chatbot automation rules.
              </li>
              <li>
                <strong>Contacts & Lead Profiles:</strong> Public user profiles of your customers who interact with your automated chatbot (username, full name, profile picture) to build and show your subscriber lists.
              </li>
            </ul>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">3. Data Retention & Security Measures</h2>
            <p className="mb-4">
              We take the security of your data extremely seriously. We use industry-standard server architectures and cloud databases (Supabase, protected by Row Level Security) to prevent unauthorized access.
            </p>
            <p className="mb-6">
              All Meta User Access Tokens are fully encrypted. Message contents processed during automated campaigns are stored securely in order to display analytics and chat logs on your private dashboard, and are automatically pruned or archived. We do not sell, rent, or distribute any user or platform data to advertising networks or third-party brokers.
            </p>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">4. GDPR Compliance & Your Rights</h2>
            <p className="mb-4">
              Under the GDPR, you have the right to access, rectify, export, restrict, or erase any personal data we hold. You can review your connected accounts, contact records, and analytics directly from your user dashboard at any time.
            </p>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">5. User Data Deletion Instructions</h2>
            <p className="mb-4">
              We provide a transparent, automated way for users to request data deletion, in full compliance with the Meta Platform Policy:
            </p>
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">How to delete all your data:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-indigo-950">
                <li>Log in to your Sendly Account at <a href="https://www.sendly.uz/login" className="font-semibold text-indigo-700 hover:underline">https://www.sendly.uz/login</a>.</li>
                <li>Navigate to the <strong>Settings</strong> page.</li>
                <li>Under the connected Instagram channel, click <strong>"Disconnect"</strong>.</li>
                <li>Go to the bottom of the Settings page and click <strong>"Delete All Account Data"</strong>. This will permanently erase your tokens, contacts, logs, and credentials from our databases.</li>
                <li>Alternatively, you can request manual data deletion at any time by contacting our support team at <a href="mailto:6220v1@gmail.com" className="font-semibold text-indigo-700 hover:underline">6220v1@gmail.com</a>. Your request will be fulfilled within 24 hours.</li>
              </ol>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">6. Contact Information</h2>
            <p className="mb-6">
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact our Data Protection Officer (DPO) at:
              <br />
              <strong>Email:</strong> <a href="mailto:6220v1@gmail.com" className="text-indigo-600 hover:underline">6220v1@gmail.com</a>
              <br />
              <strong>Address:</strong> Tashkent, Uzbekistan
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* UZBEK VERSION */}
          {/* ========================================================================= */}
          <div className="prose prose-slate max-w-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md uppercase">O'zbekcha</span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">1. Kirish va Qo'llanish Sohasi</h2>
            <p className="mb-4">
              <strong>Sendly</strong> (<a href="https://www.sendly.uz" className="text-indigo-600 hover:underline">https://www.sendly.uz</a>) platformasiga xush kelibsiz. Biz sizning shaxsiy ma'lumotlaringiz xavfsizligini ta'minlashga va barcha amaldagi qonun hujjatlariga, jumladan GDPR talablari va Meta platformasi qoidalariga rioya qilishga kafolat beramiz.
            </p>
            <p className="mb-6">
              Ushbu Maxfiylik Siyosati biz orqali Meta Graph API (xususan, Instagram Graph API va Facebook Login) yordamida olinadigan ma'lumotlarni qanday to'plashimiz, qayta ishlashimiz, saqlashimiz va himoya qilishimizni tushuntiradi.
            </p>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">2. Biz To'playdigan Ma'lumotlar</h2>
            <p className="mb-4">
              Faqatgina siz Facebook Login orqali ruxsat berganingizdan so'ng, rasmiy Meta API orqali quyidagi ma'lumotlarga ruxsat olamiz:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-3">
              <li>
                <strong>Instagram akkaunti metama'lumotlari:</strong> Sahifa nomi, foydalanuvchi nomi, identifikatori va profil rasmi havolasi (<code>instagram_basic</code> orqali).
              </li>
              <li>
                <strong>Kirish Tokenlari (Access Tokens):</strong> Facebook Login orqali taqdim etiladigan sahifa tokenlari. Barcha tokenlar ma'lumotlar bazasida saqlanishidan oldin **AES-256-CBC algoritmi yordamida shifrlanadi**.
              </li>
              <li>
                <strong>Xabarlar va Izohlar jurnali:</strong> Kiruvchi xabarlar, stories muloqotlari va izohlar matnlari (<code>instagram_manage_messages</code> va <code>instagram_manage_comments</code> orqali).
              </li>
              <li>
                <strong>Mijozlar profillari:</strong> Chat-bot bilan muloqot qilgan foydalanuvchilarning ommaviy profil ma'lumotlari (foydalanuvchi nomi, to'liq ism, profil rasmi).
              </li>
            </ul>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">3. Ma'lumotlarni O'chirish Bo'yicha Ko'rsatmalar</h2>
            <p className="mb-4">
              Meta platformasi talablariga mos ravishda foydalanuvchilarga o'z ma'lumotlarini to'liq o'chirish huquqini taqdim etamiz:
            </p>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-emerald-900 mb-2">Ma'lumotlaringizni to'liq o'chirish tartibi:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-emerald-950">
                <li>Sendly profiliga kiring: <a href="https://www.sendly.uz/login" className="font-semibold text-emerald-700 hover:underline">https://www.sendly.uz/login</a>.</li>
                <li><strong>Sozlamalar (Settings)</strong> bo'limiga o'ting.</li>
                <li>Ulangan Instagram sahifasi yonidagi <strong>"Disconnect" (Uzish)</strong> tugmasini bosing.</li>
                <li>Sozlamalar oynasining quyidagi qismida <strong>"Delete All Account Data" (Barcha ma'lumotlarni o'chirish)</strong> tugmasini bosing. Bu sizning tokenlaringiz, kontaktlaringiz va jurnallaringizni bazadan butunlay yo'q qiladi.</li>
                <li>Shuningdek, istalgan vaqtda <a href="mailto:6220v1@gmail.com" className="font-semibold text-emerald-700 hover:underline">6220v1@gmail.com</a> elektron manziliga yozma murojaat yuborib, ma'lumotlaringizni o'chirishni so'rashingiz mumkin. So'rovingiz 24 soat ichida bajariladi.</li>
              </ol>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* RUSSIAN VERSION */}
          {/* ========================================================================= */}
          <div className="prose prose-slate max-w-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md uppercase">Русский</span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">1. Введение и Область Применения</h2>
            <p className="mb-4">
              Добро пожаловать на платформу <strong>Sendly</strong> (<a href="https://www.sendly.uz" className="text-indigo-600 hover:underline">https://www.sendly.uz</a>). Мы стремимся защищать ваши личные данные и соблюдать все применимые законы, включая GDPR и Правила платформы Meta.
            </p>
            <p className="mb-6">
              Настоящая Политика конфиденциальности объясняет, как Sendly собирает, обрабатывает, хранит и защищает данные, полученные через официальный Meta Graph API при подключении ваших профессиональных аккаунтов Instagram.
            </p>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">2. Инструкции по удалению данных пользователей</h2>
            <p className="mb-4">
              Мы предоставляем простой и прозрачный способ удаления ваших данных в полном соответствии с требованиями Meta:
            </p>
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-amber-900 mb-2">Как полностью удалить ваши данные:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-amber-950">
                <li>Войдите в личный кабинет Sendly: <a href="https://www.sendly.uz/login" className="font-semibold text-amber-700 hover:underline">https://www.sendly.uz/login</a>.</li>
                <li>Перейдите в раздел <strong>Настройки (Settings)</strong>.</li>
                <li>Нажмите кнопку <strong>"Disconnect" (Отключить)</strong> напротив вашего Instagram-аккаунта.</li>
                <li>Внизу страницы нажмите <strong>"Delete All Account Data" (Удалить все данные аккаунта)</strong>. Все ваши токены, чат-логи и контакты будут безвозвратно удалены из базы данных.</li>
                <li>Вы также можете направить запрос на удаление данных по электронной почте: <a href="mailto:6220v1@gmail.com" className="font-semibold text-amber-700 hover:underline">6220v1@gmail.com</a>. Запросы обрабатываются в течение 24 часов.</li>
              </ol>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-14 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Sendly. All rights reserved. Registered in Tashkent, Uzbekistan.
        </div>
      </div>
    </div>
  );
}
