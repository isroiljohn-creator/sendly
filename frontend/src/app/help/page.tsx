"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Search, Phone, MessageCircle, Mail, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

type FAQItem = {
  question: string;
  answer: string;
};

const FAQS_UZ: FAQItem[] = [
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
    answer: "Instagram Direct qoidalariga ko'ra, oxirgi 24 soat ichida siz bilan muloqot qilgan faol foydalanuvchilarga xabar yuborish tavsiya etiladi. Shuningdek, spam filtrlarga tushmaslik uchun xabar matnlarini ko'p takrorlanuvchi bo'lmagan tarzda tuzish lozim.",
  },
  {
    question: "To'lovlar va obuna muddatini qanday yangilash mumkin?",
    answer: "Obunangizni yangilash yoki tarifni o'zgartirish uchun Sozlamalar > Obuna bo'limiga o'ting. U yerda Click, Payme yoki bank kartalari orqali to'lovni amalga oshirishingiz hamda hisob-fakturalarni ko'rishingiz mumkin.",
  },
];

export default function HelpPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = FAQS_UZ.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px]">
        <PageHeader
          title={t("pages.help.title")}
          breadcrumbs={t("pages.help.breadcrumb")}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          {/* Left / Center: FAQ section */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="border border-[#D8D8D8]">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-[16px] font-medium text-black">
                    {t("pages.help.faq_title")}
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-0.5">
                    Platformadan foydalanish bo&apos;yicha eng ko&apos;p beriladigan savollarga javoblar.
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
                          <div className="px-5 pb-5 pt-1 text-[13px] text-[#595959] leading-relaxed border-t border-[#F9F9F7] bg-[#F9F9F7]/30">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredFaqs.length === 0 && (
                    <div className="text-center py-8 text-[#707070] text-[13px]">
                      Savollar topilmadi. Qidiruv so&apos;zini o&apos;zgartirib ko&apos;ring.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Support contacts */}
          <div className="flex flex-col gap-4">
            <Card className="border border-[#D8D8D8] flex flex-col gap-4">
              <div>
                <h3 className="text-[16px] font-medium text-black">
                  {t("pages.help.contact_support")}
                </h3>
                <p className="text-[12px] text-[#707070] mt-0.5">
                  Muammo hal bo&apos;lmadimi? Bizning yordam guruhimiz bilan bog&apos;laning.
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
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C]">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">Telegram Yordamchi Bot</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">Tezkor javob (24/7)</p>
                  </div>
                </a>

                {/* Call center support */}
                <a
                  href="tel:+998712000000"
                  className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C]">
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">+998 (71) 200-00-00</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">Dush - Shan (9:00 - 18:00)</p>
                  </div>
                </a>

                {/* Email Support */}
                <a
                  href="mailto:support@sendly.uz"
                  className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-black text-[#C7F33C]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-black">support@sendly.uz</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5">Barcha yozma arizalar uchun</p>
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
                <h4 className="text-[14px] font-medium text-white">Yo&apos;riqnomalarni yuklab o&apos;rganish</h4>
                <p className="text-[11px] text-white/70 mt-1">
                  Chotbotlar sozlash va Direct savdolarni oshirish uchun PDF qo&apos;llanmani yuklab oling.
                </p>
              </div>
              <Button variant="accent" className="w-full py-2.5 mt-2 text-[12px]">
                Qo&apos;llanmani ko&apos;rish (.PDF)
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
