"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<"uz" | "en">("uz");

  return (
    <div className="min-h-screen bg-[#FAFAFC] py-16 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans antialiased">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/60 shadow-xl rounded-3xl p-8 sm:p-16">
        
        {/* Top Navbar Brand & Language Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-8 mb-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#C7F33C] shadow-sm overflow-hidden">
              <img src="/logo.png" alt="Sendly" className="h-[18px] w-[18px] object-contain" />
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-black">
              {"Sendly"}
            </span>
          </Link>
          
          <div className="flex rounded-full bg-slate-100 p-1 border border-slate-200/40">
            <button
              onClick={() => setLang("uz")}
              className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all ${
                lang === "uz" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              O'zbekcha
            </button>
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all ${
                lang === "en" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {lang === "uz" ? (
          /* ================= O'ZBEKCHA VERSIYA ================= */
          <div>
            {/* Header */}
            <div className="text-center pb-8 mb-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-[#7CA607] animate-pulse"></span>
                <span className="text-xs font-bold text-[#7CA607] tracking-widest uppercase">Maxfiylik Siyosati</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Maxfiylik Siyosati
              </h1>
              <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
                Oxirgi yangilanish: 30-May, 2026-yil
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-slate max-w-none text-slate-600 space-y-8 text-[15px] leading-relaxed">
              
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 sm:p-8 text-slate-700">
                <p className="font-semibold text-slate-900 mb-2">Umumiy ma'lumot</p>
                <p>
                  Ushbu Maxfiylik siyosati <strong>Sendly</strong> (“Kompaniya”, “Biz”, “Bizning”) sayt tashrif buyuruvchilari va foydalanuvchilarining shaxsiy ma'lumotlarini qanday yig'ishi, qayta ishlashi va saqlashini tushuntiradi.
                  Biz taqdim etuvchi xizmatlar <a href="https://www.sendly.uz" className="text-[#7CA607] hover:underline font-semibold">https://www.sendly.uz</a> veb-sayti orqali amalga oshiriladi.
                </p>
                <p className="mt-3">
                  Xizmatlarimizdan foydalanish orqali siz ushbu Maxfiylik siyosati qoidalariga rozilik bildirasiz.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  1. Yig'iladigan ma'lumotlar
                </h2>
                <p className="font-bold text-slate-800">A. Siz taqdim etadigan ma'lumotlar:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Profil ma'lumotlari:</strong> Ro'yxatdan o'tishda kiritiladigan ism-sharif, elektron pochta manzili va parol.</li>
                  <li><strong>Ulanish kanallari:</strong> Tizimga ulanadigan Telegram bot tokenlari hamda Instagram akkauntining ma'lumotlari.</li>
                  <li><strong>Kontent va fayllar:</strong> Chatbot javoblari uchun yuklangan rasm, matn va boshqa media materiallar.</li>
                </ul>

                <p className="font-bold text-slate-800 mt-4">B. Avtomatik ravishda yig'iladigan ma'lumotlar:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Qurilma va foydalanish:</strong> IP manzil, brauzer turi, kirish vaqti, tashrif buyurilgan sahifalar va bosilgan havolalar.</li>
                </ul>

                <p className="font-bold text-slate-800 mt-4">C. Meta (Facebook/Instagram) API orqali olinadigan ma'lumotlar:</p>
                <p className="mt-1">
                  Chatbot avtomatik ishlashi va mijozlaringiz bilan muloqot qilishi uchun Meta API orqali quyidagi ma'lumotlarni olamiz:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Page Access Tokens (Sahifaga kirish kaliti):</strong> Avtomatik xabarlar yuborish uchun zarur. <strong>Barcha tokenlar ma'lumotlar bazasida AES-256 shifrlangan holatda saqlanadi.</strong></li>
                  <li><strong>Xabarlar va izohlar:</strong> Mijozlaringiz sizga yozgan DClar (Direct Message), postlar ostidagi izohlar, story-reaksiyalar. Ushbu ma'lumotlar faqatgina kalit so'zlarni qidirib, to'g'ri avtomatik javob qaytarish uchun saqlanadi.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  2. Ma'lumotlardan foydalanish maqsadlari
                </h2>
                <p>Biz shaxsiy ma'lumotlardan quyidagi maqsadlarda foydalanamiz:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Sizga chatbot va marketing avtomatlashtirish xizmatlarini taqdim etish;</li>
                  <li>Tizim barqarorligini tahlil qilish, yangi funksiyalar ishlab chiqish va xatoliklarni to'g'rilash;</li>
                  <li>To'lov jarayonlarini amalga oshirish va billing xizmatlarini taqdim etish;</li>
                  <li>Sizga muhim texnik bildirishnomalar va yangiliklarni yuborish.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  3. Ma'lumotlarni o'chirish va yo'q qilish (Meta talabi)
                </h2>
                <p className="mb-3">
                  Biz foydalanuvchilarimizga o'z shaxsiy va platforma ma'lumotlarini butunlay o'chirish huquqini kafolatlaymiz.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3">
                  <h4 className="font-bold text-slate-950">Ma'lumotlaringizni o'chirish tartibi:</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                    <li>Sendly shaxsiy kabinetingizga kiring: <a href="https://www.sendly.uz/login" className="font-semibold text-[#7CA607] hover:underline">https://www.sendly.uz/login</a>.</li>
                    <li><strong>Sozlamalar (Settings)</strong> bo'limiga o'ting.</li>
                    <li>Ulanib turgan Instagram sahifangizni uzib qo'ying (Disconnect).</li>
                    <li>Sahifaning eng pastidagi <strong>"Delete All Account Data"</strong> (Barcha ma'lumotlarni o'chirish) tugmasini bosing.</li>
                    <li>Tizim zudlik bilan barcha saqlangan Meta tokenlaringizni, suhbatlar tarixini va foydalanuvchi ma'lumotlarini bazadan qayta tiklanmaydigan qilib to'liq o'chirib tashlaydi.</li>
                    <li>Shuningdek, xohlagan vaqtingizda qo'llab-quvvatlash manzilimizga (<a href="mailto:6220v1@gmail.com" className="font-semibold text-[#7CA607] hover:underline">6220v1@gmail.com</a>) ma'lumotlarni o'chirish bo'yicha ariza yuborishingiz mumkin. Arizalar 24 soat ichida bajariladi va sizga tasdiqnoma yuboriladi.</li>
                  </ol>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  4. Ma'lumotlar xavfsizligi
                </h2>
                <p>
                  Biz sizning shaxsiy va Meta ma'lumotlaringizni yuqori darajada himoya qilamiz. Ulanish kalitlari AES-256 shifrlash orqali faqat shifrlangan ko'rinishda saqlanadi. Bazamiz Row Level Security (RLS) xavfsizlik cheklovlari va SSL shifrlangan transport qatlamidan foydalanadi.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  5. Savollar va bog'lanish
                </h2>
                <p>
                  Ushbu maxfiylik kelishuvi bo'yicha savollaringiz bo'lsa, quyidagi pochta orqali biz bilan bog'laning:
                  <br />
                  <strong>E-mail:</strong> <a href="mailto:6220v1@gmail.com" className="text-[#7CA607] hover:underline font-semibold">6220v1@gmail.com</a>
                </p>
              </section>

            </div>
          </div>
        ) : (
          /* ================= ENGLISH VERSION ================= */
          <div>
            {/* Header */}
            <div className="text-center pb-8 mb-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-[#7CA607] animate-pulse"></span>
                <span className="text-xs font-bold text-[#7CA607] tracking-widest uppercase">Official Privacy Policy</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Privacy Policy
              </h1>
              <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
                Last Updated: May 30, 2026
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-slate max-w-none text-slate-600 space-y-8 text-[15px] leading-relaxed">
              
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 sm:p-8 text-slate-700">
                <p className="font-semibold text-slate-900 mb-2">Overview</p>
                <p>
                  This Privacy Policy explains how <strong>Sendly</strong> (“Company,” “We,” “Us,” or “Our”) collects, uses, shares, and otherwise processes your personal data and your rights regarding your personal data. 
                  We provide you with our website <a href="https://www.sendly.uz" className="text-[#7CA607] hover:underline font-semibold">https://www.sendly.uz</a> as well as the chatbot automation tools and services.
                </p>
                <p className="mt-3">
                  By accessing or using our Services, you agree with and accept this Privacy Policy.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  1. Information We Collect
                </h2>
                <p className="font-bold text-slate-800">A. Information You Provide to Us:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Profile Information:</strong> Full name, email address, password.</li>
                  <li><strong>Channel Configurations:</strong> Telegram bot tokens and connected Instagram account metadata.</li>
                  <li><strong>Automation Media & Assets:</strong> Templates, reply texts, and images you upload to configure chatbot replies.</li>
                </ul>

                <p className="font-bold text-slate-800 mt-4">B. Information Collected Automatically:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Usage & Device logs:</strong> IP address, browser type, page views, access times, click logs.</li>
                </ul>

                <p className="font-bold text-slate-800 mt-4">C. Information Collected from Meta Graph APIs:</p>
                <p className="mt-1">
                  To execute automation routines on your behalf, we pull specific records via Meta APIs:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Page Access Tokens:</strong> Mandatory for dispatching automated answers. <strong>All access tokens are stored AES-256 encrypted</strong> in our databases.</li>
                  <li><strong>Direct Messages & Comments:</strong> Message contents, comment strings, story reactions. This data is checked and kept purely to trigger the corresponding automation flow.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  2. Purposes for Which We Use Personal Data
                </h2>
                <p>We process your data for the following reasons:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>To provide and maintain the Service and execute automation flows;</li>
                  <li>To debug, optimize, and improve our services by analyzing usage patterns;</li>
                  <li>To handle payments, billing, and trial accounts;</li>
                  <li>To communicate with you regarding updates, security warnings, or promotions.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  3. User Data Deletion Instructions (Meta Compliant)
                </h2>
                <p className="mb-3">
                  In compliance with Meta Platform Policy and data privacy laws, we provide a direct way to delete all your platform data.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3">
                  <h4 className="font-bold text-slate-950">Follow these steps to permanently wipe your data:</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                    <li>Log in to your Sendly Account at <a href="https://www.sendly.uz/login" className="font-semibold text-[#7CA607] hover:underline">https://www.sendly.uz/login</a>.</li>
                    <li>Go to the <strong>Settings</strong> page.</li>
                    <li>Locate your connected Instagram account and click <strong>"Disconnect"</strong>.</li>
                    <li>Click <strong>"Delete All Account Data"</strong> at the bottom of the page.</li>
                    <li>This will instantly delete all access tokens, automation rules, message records, and contact records from our databases.</li>
                    <li>Alternatively, send an email to <a href="mailto:6220v1@gmail.com" className="font-semibold text-[#7CA607] hover:underline">6220v1@gmail.com</a>. We will process and confirm your deletion request within 24 hours.</li>
                  </ol>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  4. Data Security
                </h2>
                <p>
                  We implement database-level Row Level Security (RLS), secure transport layers (SSL), and token encryption (AES-256) to ensure the safety of your connected profiles and access tokens.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#7CA607] pl-3">
                  5. Questions & Support
                </h2>
                <p>
                  If you have any questions regarding this Privacy Policy, feel free to contact us at:
                  <br />
                  <strong>Email:</strong> <a href="mailto:6220v1@gmail.com" className="text-[#7CA607] hover:underline font-semibold">6220v1@gmail.com</a>
                </p>
              </section>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Sendly.uz. All rights reserved. Tashkent, Uzbekistan.
        </div>
      </div>
    </div>
  );
}
