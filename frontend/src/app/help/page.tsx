"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { 
  Search, 
  Phone, 
  MessageCircle, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  BookOpen, 
  Instagram, 
  Facebook, 
  Link as LinkIcon, 
  Brain, 
  Copy, 
  Check,
  Sparkles
} from "lucide-react";

type FAQItem = {
  question: string;
  answer: string;
};

type GuideStep = {
  title: string;
  desc: string;
  bullets: string[];
  image: string;
  prompt: string;
};

const LOCAL_TRANSLATIONS = {
  uz: {
    faq_desc: "Platformadan foydalanish bo'yicha eng ko'p beriladigan savollarga javoblar.",
    no_results: "Savollar topilmadi. Qidiruv so'zini o'zgartirib ko'ring.",
    support_desc: "Muammo hal bo'lmadimi? Bizning yordam guruhimiz bilan bog'laning.",
    tg_bot_title: "Telegram Yordamchi Bot",
    tg_bot_desc: "Tezkor javob (24/7)",
    phone_desc: "Dush - Shan (9:00 - 18:00)",
    email_desc: "Barcha yozma arizalar uchun",
    guide_title: "Yo'riqnomalarni yuklab o'rganish",
    guide_desc: "Chatbotlar sozlash va Direct savdolarni oshirish uchun PDF qo'llanmani yuklab oling.",
    guide_btn: "Qo'llanmani ko'rish (.PDF)",
    tab_guide: "Botni ulash yo'riqnomasi",
    tab_faq: "Tez-tez so'raladigan savollar (FAQ)",
    prompt_copy: "Dizayn promtini nusxalash",
    prompt_copied: "Nusxalandi!",
    prompt_title: "Sun'iy Intellekt dizayn promti (Midjourney/DALL-E uchun):",
    guide_steps: [
      {
        title: "1. Professional Instagram Hisobiga O'tish",
        desc: "Sendly orqali avtomatlashtirishni yoqish uchun Instagram profilingiz bepul professional (Business yoki Creator) hisobda bo'lishi shart.",
        bullets: [
          "Instagram ilovasiga kiring va o'z profilingizga o'ting.",
          "Sozlamalar va Maxfiylik (Settings and Activity) bo'limini oching.",
          "Hisob turi va boshqarish (Account type and tools) tugmasini bosing.",
          "Professional hisobga o'tish (Switch to Professional Account) ni tanlang va 'Creator' yoki 'Business' rejimini faollashtiring."
        ],
        image: "/images/guide_instagram_setup.png",
        prompt: "A futuristic 3D claymation smartphone showing Instagram app with a neon lime green toggle switch highlighting \"Switch to Professional Account\". Sleek dark interface, neon green glow (#C7F33C), soft shadows, abstract floating tech shapes, premium UI visualization, dark background."
      },
      {
        title: "2. Facebook Sahifasini Bog'lash",
        desc: "Meta qoidalariga ko'ra, professional Instagram sahifasi Facebook sahifasiga (Facebook Page) bog'langan bo'lishi zarur.",
        bullets: [
          "O'z Facebook hisobingizga kiring va yangi 'Sahifa' (Facebook Page) yarating yoki mavjudini tanlang.",
          "Sahifa Sozlamalari (Settings) > Linked Accounts bo'limiga kiring.",
          "Instagram Direct muloqotlariga ruxsat berish (Allow Access to Instagram Messages) tugmasini yoqing.",
          "Ushbu qadam chetlab o'tilsa, Meta API botga xabarlarni o'qishga ruxsat bermaydi."
        ],
        image: "/images/guide_facebook_link.png",
        prompt: "Futuristic 3D tech illustration showing Facebook and Instagram logos connected by a glowing neon lime green electric light bridge. Translucent glassmorphism UI cards, dark minimalist background, glowing green accents (#C7F33C), soft studio lighting, premium design render."
      },
      {
        title: "3. Sendly Platformasiga Ulash",
        desc: "Endi bizning xavfsiz OAuth login orqali Meta sahifalaringizni Sendly tizimiga bog'lang.",
        bullets: [
          "Sendly platformasida 'Integratsiyalar' yoki 'Kanallar' sahifasiga kiring.",
          "\"Facebook orqali bog'lash\" (Login with Facebook) tugmasini bosing.",
          "Instagram Professional hisobingizni va unga bog'langan Facebook sahifasini tanlang.",
          "Barcha so'ralgan ruxsatnomalarga (Instagram xabarlarni boshqarish va sahifa metama'lumotlari) 'Ha' deb javob bering."
        ],
        image: "/images/guide_connect_sendly.png",
        prompt: "A futuristic web browser interface showing a prominent 'Login with Facebook' button that emits a soft electric lime green glow. Minimally designed dashboard background, overlapping glassmorphism elements, security checkmarks, neon green highlights (#C7F33C), dark theme, 3D render."
      },
      {
        title: "4. Sun'iy Intellekt Agentini Sozlash",
        desc: "Hisoblar muvaffaqiyatli ulanganidan so'ng, mijozlaringizga professional javob beradigan AI yordamchini sozlang.",
        bullets: [
          "Chap menudan 'AI Agent' bo'limiga kiring.",
          "O'zingizga mos yo'nalishni tanlang (Klinika, Rieltor, Kurator, Texnik Yordam va h.k.).",
          "Tizim ko'rsatmasini (System Prompt) kiriting - u botning harakat qoidalarini belgilaydi.",
          "\"Bilimlar bazasi\" (Knowledge Base) bo'limida biznesingiz, xizmat va mahsulotlaringiz haqida ma'lumot yuklang va chatbotni faollashtiring."
        ],
        image: "/images/guide_ai_setup.png",
        prompt: "A glowing neon green brain model (#C7F33C) floating above a cylinder database system. Cybernetic circuitry connecting them, glowing digital data streams, translucent UI nodes showing text 'Knowledge Base', dark tech abstract background, 3D premium rendering, futuristic style."
      }
    ],
    faqs: [
      {
        question: "Instagram professional profilingizni qanday ulash mumkin?",
        answer: "Sendly tizimiga Instagram hisobingizni ulash uchun birinchi navbatda profilingiz 'Professional' (Business yoki Creator) holatida bo'lishi va Facebook sahifangizga bog'langan bo'lishi kerak. So'ngra Sozlamalar > Integratsiyalar bo'limidan 'Hisobni ulash' tugmasini bosing.",
      },
      {
        question: "Kalit so'z triggerlari qanday ishlaydi?",
        answer: "Mijoz sizga Instagram Direct orqali yozganda, tizim kelgan xabarni siz sozlagan kalit so'zlar ro'yxati bilan solishtiradi. Agar mos kelsa, avtomatlashtirilgan javob zanjiri darhol ishga tushadi. Masalan, 'narx' so'zi yozilsa, narxlar jadvali avtomatik yuboriladi.",
      },
      {
        question: "Ommaviy xabarlar (Broadcast) yuborish qoidalari qanday?",
        answer: "Instagram Direct qoidalariga ko'ra, oxirgi 24 soat ichida siz bilan muloqot qilgan faol foydalanuvchilarga xabar yuborish vaqtinchalik cheklangan. Spam filtrlarga tushmaslik uchun xabar matnlarini ko'p takrorlanuvchi bo'lmagan tarzda tuzish lozim.",
      },
      {
        question: "To'lovlar va obuna muddatini qanday yangilash mumkin?",
        answer: "Obunangizni yangilash yoki tarifni o'zgartirish uchun Sozlamalar > Obuna bo'limiga o'ting. U yerda Click, Payme yoki bank kartalari orqali to'lovni amalga oshirishingiz hamda hisob-fakturalarni ko'rishingiz mumkin.",
      },
    ]
  },
  ru: {
    faq_desc: "Ответы на самые часто задаваемые вопросы по использованию платформы.",
    no_results: "Вопросы не найдены. Попробуйте изменить поисковый запрос.",
    support_desc: "Проблема не решена? Свяжитесь с нашей службой поддержки.",
    tg_bot_title: "Поддержка в Telegram",
    tg_bot_desc: "Быстрый ответ (24/7)",
    phone_desc: "Пн - Сб (9:00 - 18:00)",
    email_desc: "Для всех письменных запросов",
    guide_title: "Скачать инструкции",
    guide_desc: "Скачайте PDF-руководство по настройке чат-ботов и увеличению продаж в Direct.",
    guide_btn: "Просмотреть руководство (.PDF)",
    tab_guide: "Инструкция по подключению",
    tab_faq: "Часто задаваемые вопросы (FAQ)",
    prompt_copy: "Копировать промт дизайна",
    prompt_copied: "Скопировано!",
    prompt_title: "Промт для генератора ИИ изображений (Midjourney/DALL-E):",
    guide_steps: [
      {
        title: "1. Переход на профессиональный аккаунт Instagram",
        desc: "Чтобы включить автоматизацию через Sendly, ваш профиль Instagram обязательно должен быть бесплатным профессиональным аккаунтом (Business или Creator).",
        bullets: [
          "Откройте приложение Instagram и перейдите в свой профиль.",
          "Откройте меню \"Настройки и активность\" (Settings and Activity).",
          "Нажмите кнопку \"Тип аккаунта и инструменты\" (Account type and tools).",
          "Выберите \"Перейти на профессиональный аккаунт\" (Switch to Professional Account) и выберите режим Creator или Business."
        ],
        image: "/images/guide_instagram_setup.png",
        prompt: "A futuristic 3D claymation smartphone showing Instagram app with a neon lime green toggle switch highlighting \"Switch to Professional Account\". Sleek dark interface, neon green glow (#C7F33C), soft shadows, abstract floating tech shapes, premium UI visualization, dark background."
      },
      {
        title: "2. Привязка к странице Facebook",
        desc: "По правилам Meta ваш профессиональный профиль Instagram должен быть связан с публичной страницей Facebook (Facebook Page).",
        bullets: [
          "Войдите в свою учетную запись Facebook и создайте новую Страницу или выберите существующую.",
          "Перейдите в Настройки страницы > Связанные аккаунты (Linked Accounts).",
          "Включите переключатель разрешения доступа к сообщениям Instagram (Allow Access to Instagram Messages).",
          "Если этот шаг пропущен, Meta API не разрешит чат-боту читать ваши сообщения."
        ],
        image: "/images/guide_facebook_link.png",
        prompt: "Futuristic 3D tech illustration showing Facebook and Instagram logos connected by a glowing neon lime green electric light bridge. Translucent glassmorphism UI cards, dark minimalist background, glowing green accents (#C7F33C), soft studio lighting, premium design render."
      },
      {
        title: "3. Подключение к платформе Sendly",
        desc: "Теперь свяжите ваши страницы Meta с системой Sendly с помощью безопасного OAuth логина.",
        bullets: [
          "На платформе Sendly перейдите в раздел \"Интеграции\" или \"Каналы\".",
          "Нажмите кнопку \"Войти через Facebook\" (Login with Facebook).",
          "Выберите свой профессиональный аккаунт Instagram и связанную страницу Facebook.",
          "Предоставьте все запрошенные разрешения (управление сообщениями Instagram и метаданные страниц)."
        ],
        image: "/images/guide_connect_sendly.png",
        prompt: "A futuristic web browser interface showing a prominent 'Login with Facebook' button that emits a soft electric lime green glow. Minimally designed dashboard background, overlapping glassmorphism elements, security checkmarks, neon green highlights (#C7F33C), dark theme, 3D render."
      },
      {
        title: "4. Настройка ИИ Агента",
        desc: "После успешного подключения настройте ИИ Агента, который будет профессионально общаться с вашими клиентами.",
        bullets: [
          "В левом меню перейдите в раздел \"ИИ Агент\".",
          "Выберите подходящее направление (Клиника, Риелтор, Куратор, Техподдержка и др.).",
          "Введите системную инструкцию (System Prompt) - она задает правила поведения бота.",
          "В разделе \"База знаний\" (Knowledge Base) загрузите информацию о вашем бизнесе, услугах и товарах, затем активируйте чат-бота."
        ],
        image: "/images/guide_ai_setup.png",
        prompt: "A glowing neon green brain model (#C7F33C) floating above a cylinder database system. Cybernetic circuitry connecting them, glowing digital data streams, translucent UI nodes showing text 'Knowledge Base', dark tech abstract background, 3D premium rendering, futuristic style."
      }
    ],
    faqs: [
      {
        question: "Как подключить профессиональный профиль Instagram?",
        answer: "Чтобы подключить аккаунт Instagram к Sendly, ваш профиль должен быть в режиме 'Профессиональный' (Business или Creator) и связан с вашей страницей Facebook. Затем перейдите в Настройки > Интеграции и нажмите кнопку 'Подключить аккаунт'.",
      },
      {
        question: "Как работают триггеры ключевых слов?",
        answer: "Когда клиент пишет вам в Instagram Direct, система сравнивает входящее сообщение со списком ключевых слов, которые вы настроили. Если есть совпадение, запускается автоматическая цепочка ответов. Например, при написании слова 'цена' автоматически отправляется прайс-лист.",
      },
      {
        question: "Каковы правила отправки массовых рассылок (Broadcast)?",
        answer: "Согласно правилам Instagram Direct, рекомендуется отправлять сообщения только активным пользователям, которые общались с вами за последние 24 часа. Также во избежание спам-фильтров следует избегать частых повторяющихся шаблонов текста.",
      },
      {
        question: "Как продлить подписку или изменить тариф?",
        answer: "Для продления подписки или изменения тарифа перейдите в Настройки > Подписка. Там вы можете произвести оплату через Click, Payme или банковской картой, а также просмотреть счета-фактуры.",
      },
    ]
  },
  en: {
    faq_desc: "Answers to the most frequently asked questions about using the platform.",
    no_results: "No questions found. Try changing your search query.",
    support_desc: "Problem not resolved? Contact our support team.",
    tg_bot_title: "Telegram Support Bot",
    tg_bot_desc: "Quick reply (24/7)",
    phone_desc: "Mon - Sat (9:00 - 18:00)",
    email_desc: "For all written inquiries",
    guide_title: "Download User Guide",
    guide_desc: "Download the PDF manual for setting up chatbots and increasing Direct sales.",
    guide_btn: "View Guide (.PDF)",
    tab_guide: "Bot Connection Guide",
    tab_faq: "Frequently Asked Questions (FAQ)",
    prompt_copy: "Copy design prompt",
    prompt_copied: "Copied!",
    prompt_title: "AI Image Generator Prompt (for Midjourney/DALL-E):",
    guide_steps: [
      {
        title: "1. Switch to Instagram Professional Profile",
        desc: "To enable automation via Sendly, your Instagram profile must be a free Professional account (Business or Creator).",
        bullets: [
          "Open the Instagram app and navigate to your profile.",
          "Open \"Settings and Activity\".",
          "Tap on \"Account type and tools\".",
          "Select \"Switch to Professional Account\" and activate either Creator or Business mode."
        ],
        image: "/images/guide_instagram_setup.png",
        prompt: "A futuristic 3D claymation smartphone showing Instagram app with a neon lime green toggle switch highlighting \"Switch to Professional Account\". Sleek dark interface, neon green glow (#C7F33C), soft shadows, abstract floating tech shapes, premium UI visualization, dark background."
      },
      {
        title: "2. Link to Facebook Page",
        desc: "According to Meta rules, your professional Instagram profile must be linked to a public Facebook Page.",
        bullets: [
          "Log into Facebook, and create a new public Page or select an existing one.",
          "Go to Page Settings > Linked Accounts.",
          "Toggle \"Allow Access to Instagram Messages\" to Enabled.",
          "If this step is skipped, the Meta API will block the chatbot from reading messages."
        ],
        image: "/images/guide_facebook_link.png",
        prompt: "Futuristic 3D tech illustration showing Facebook and Instagram logos connected by a glowing neon lime green electric light bridge. Translucent glassmorphism UI cards, dark minimalist background, glowing green accents (#C7F33C), soft studio lighting, premium design render."
      },
      {
        title: "3. Connect to Sendly Platform",
        desc: "Now, securely connect your Meta pages to Sendly via our OAuth integration flow.",
        bullets: [
          "In your Sendly dashboard, go to \"Integrations\" or \"Channels\".",
          "Click the \"Login with Facebook\" button.",
          "Select your Professional Instagram profile and its linked Facebook page.",
          "Accept all requested permissions (Instagram messages management and page metadata access)."
        ],
        image: "/images/guide_connect_sendly.png",
        prompt: "A futuristic web browser interface showing a prominent 'Login with Facebook' button that emits a soft electric lime green glow. Minimally designed dashboard background, overlapping glassmorphism elements, security checkmarks, neon green highlights (#C7F33C), dark theme, 3D render."
      },
      {
        title: "4. Configure your AI Agent",
        desc: "Once connected, customize the AI Agent that will talk to your customers automatically.",
        bullets: [
          "Go to the \"AI Agent\" page in the sidebar.",
          "Select your template business type (Clinic, Realtor, Kurator, Helpdesk, etc.).",
          "Enter your custom system instructions (System Prompt) to dictate the bot's behavior guidelines.",
          "In the \"Knowledge Base\" tab, upload documents or write FAQs about your company and turn the bot switch ON."
        ],
        image: "/images/guide_ai_setup.png",
        prompt: "A glowing neon green brain model (#C7F33C) floating above a cylinder database system. Cybernetic circuitry connecting them, glowing digital data streams, translucent UI nodes showing text 'Knowledge Base', dark tech abstract background, 3D premium rendering, futuristic style."
      }
    ],
    faqs: [
      {
        question: "How to connect your Instagram professional profile?",
        answer: "To connect your Instagram account to Sendly, your profile must first be in 'Professional' (Business or Creator) mode and linked to your Facebook page. Then, click the 'Connect account' button in Settings > Integrations.",
      },
      {
        question: "How do keyword triggers work?",
        answer: "When a customer writes to you via Instagram Direct, the system checks the message against your configured keywords. If it matches, an automated response flow starts immediately. For example, if 'price' is typed, a price list is sent automatically.",
      },
      {
        question: "What are the rules for bulk messaging (Broadcast)?",
        answer: "According to Instagram Direct rules, it is recommended to send messages to active users who have messaged you in the last 24 hours. To avoid spam filters, create varied and non-repetitive text messages.",
      },
      {
        question: "How to renew subscription or change plan?",
        answer: "To renew your subscription or change your plan, go to Settings > Subscription. There you can pay via Click, Payme, or bank cards and view invoices.",
      },
    ]
  }
};

export default function HelpPage() {
  const { t, lang } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"guide" | "faq">("guide");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const currentLang = lang === "uz" || lang === "ru" || lang === "en" ? lang : "uz";
  const tr = LOCAL_TRANSLATIONS[currentLang];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = tr.faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px] pb-12">
        <PageHeader
          title={t("pages.help.title")}
          breadcrumbs={t("pages.help.breadcrumb")}
        />

        {/* Tab Switcher */}
        <div className="flex gap-2.5 border-b border-[#D8D8D8]/60 pb-3">
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-150 active:scale-95 ${
              activeTab === "guide"
                ? "bg-[#C7F33C] text-black shadow-sm"
                : "bg-white border border-[#D8D8D8] text-[#707070] hover:text-black"
            }`}
          >
            <BookOpen size={16} />
            <span>{tr.tab_guide}</span>
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-150 active:scale-95 ${
              activeTab === "faq"
                ? "bg-[#C7F33C] text-black shadow-sm"
                : "bg-white border border-[#D8D8D8] text-[#707070] hover:text-black"
            }`}
          >
            <HelpCircle size={16} />
            <span>{tr.tab_faq}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {activeTab === "guide" ? (
              <div className="flex flex-col gap-8">
                {tr.guide_steps.map((step, idx) => (
                  <Card key={idx} className="border border-[#D8D8D8] p-6 rounded-[28px] overflow-hidden flex flex-col gap-6 bg-white">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      {/* Left: Step Description */}
                      <div className="flex-1 flex flex-col gap-3">
                        <span className="text-[10px] font-black uppercase text-[#7CA607] tracking-wider font-mono">
                          STEP 0{idx + 1}
                        </span>
                        <h3 className="text-[17px] font-bold text-black leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-[13px] text-[#707070] leading-relaxed">
                          {step.desc}
                        </p>
                        <ul className="mt-2 flex flex-col gap-2">
                          {step.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="flex gap-2.5 items-start text-[12.5px] text-[#4d4d4d] leading-relaxed">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-[#C7F33C]/20 text-[#1a2906] flex items-center justify-center text-[10px] font-bold">
                                {bIdx + 1}
                              </span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Right: Premium Guide Image */}
                      <div className="w-full md:w-[240px] shrink-0 rounded-[20px] overflow-hidden border border-[#E8E8E8] shadow-sm bg-[#fafafa]">
                        <img 
                          src={step.image} 
                          alt={step.title} 
                          className="w-full h-[240px] object-cover transition-transform duration-300 hover:scale-105" 
                        />
                      </div>
                    </div>

                    {/* Expandable Design Prompt Box */}
                    <div className="border-t border-[#E8E8E8]/70 pt-4 flex flex-col gap-2.5 bg-[#FAF9F6]/40 p-4 rounded-[18px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-black flex items-center gap-1.5">
                          <Sparkles size={13} className="text-[#7CA607]" />
                          <span>{tr.prompt_title}</span>
                        </span>
                        <button
                          onClick={() => handleCopyPrompt(step.prompt, idx)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#D8D8D8] text-[10.5px] font-bold text-black hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check size={11} className="text-[#10B981]" />
                              <span className="text-[#10B981]">{tr.prompt_copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} className="text-[#707070]" />
                              <span>{tr.prompt_copy}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-[#5f5f5f] leading-relaxed select-all select-none p-3 bg-white/70 border border-[#E8E8E8] rounded-xl overflow-x-auto">
                        {step.prompt}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-[#D8D8D8]">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-[16px] font-medium text-black">
                      {t("pages.help.faq_title")}
                    </h3>
                    <p className="text-[12px] text-[#707070] mt-0.5">
                      {tr.faq_desc}
                    </p>
                  </div>

                  {/* FAQ Search */}
                  <div className="relative flex items-center mt-2">
                    <Search size={16} className="absolute left-4 text-[#707070]" />
                    <input
                      type="text"
                      placeholder={t("pages.help.search_placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2.5 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                    />
                  </div>

                  {/* Accordions */}
                  <div className="flex flex-col gap-2 mt-4">
                    {filteredFaqs.map((faq, index) => {
                      const isOpen = openIndex === index;
                      return (
                        <div
                          key={index}
                          className="rounded-[18px] border border-[#E8E8E8] bg-white overflow-hidden transition-all duration-200"
                        >
                          <button
                            onClick={() => toggleFaq(index)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#F9F9F7]/55 transition-colors"
                          >
                            <span className="text-[13px] font-medium text-black pr-4">
                              {faq.question}
                            </span>
                            {isOpen ? (
                              <ChevronUp size={16} className="text-black shrink-0" />
                            ) : (
                              <ChevronDown size={16} className="text-[#707070] shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 pt-1 text-[13px] text-[#595959] leading-relaxed border-t border-[#F9F9F7] bg-[#F9F9F7]/30 animate-in fade-in duration-150">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredFaqs.length === 0 && (
                      <div className="text-center py-8 text-[#707070] text-[13px]">
                        {tr.no_results}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Support Contacts & Links */}
          <div className="flex flex-col gap-4">
            <Card className="border border-[#D8D8D8] flex flex-col gap-4 bg-white">
              <div>
                <h3 className="text-[16px] font-medium text-black">
                  {t("pages.help.contact_support")}
                </h3>
                <p className="text-[12px] text-[#707070] mt-0.5">
                  {tr.support_desc}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 mt-2">
                {/* Telegram Bot Support */}
                <a
                  href="https://t.me/sendly_support_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C] shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">{tr.tg_bot_title}</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">{tr.tg_bot_desc}</p>
                  </div>
                </a>

                {/* Call center support */}
                <a
                  href="tel:+998712000000"
                  className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C] shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">+998 (71) 200-00-00</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">{tr.phone_desc}</p>
                  </div>
                </a>

                {/* Email Support */}
                <a
                  href="mailto:support@sendly.uz"
                  className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C] shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">support@sendly.uz</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">{tr.email_desc}</p>
                  </div>
                </a>
              </div>
            </Card>

            {/* Platform Manual Guide widget */}
            <Card className="bg-black text-white p-5 rounded-[28px] flex flex-col gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#C7F33C] text-black">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="text-[14px] font-medium text-white">{tr.guide_title}</h4>
                <p className="text-[11px] text-white/70 mt-1">
                  {tr.guide_desc}
                </p>
              </div>
              <Button variant="accent" className="w-full py-2.5 mt-2 text-[12px]">
                {tr.guide_btn}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
