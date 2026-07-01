"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Plus, 
  X,
  MessageCircle,
  MessageSquare,
  HelpCircle,
  User,
  Phone,
  Video,
  Smile,
  Bot,
  Megaphone
} from "lucide-react";
import { db, Channel, Automation } from "@/lib/db";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useI18n } from "@/i18n/I18nProvider";


const LOCAL_TRANSLATIONS = {
  uz: {
    exit: "Chiqish",
    step_of: "{step}-qadam 3-qadamdan",
    title: "Kalit so'zli chat-bot",
    select_account: "Akkauntni tanlash",
    no_channels: "Ulagan kanallaringiz mavjud emas. Iltimos, sozlamalar bo'limiga o'ting.",
    tg_check_sub: "Telegram kanaliga obunani tekshiring",
    check_sub: "Obunani tekshirish",
    sub_desc: "Chat-bot akkauntga obuna bo'lishni tekshiradi",
    select_channel: "Kanal tanlang",
    channel_not_in_list: "Agar kanal ro'yxatda bo'lmasa,",
    add_bot: "bot qo'shish",
    as_tg_admin: "ushbu Telegram kanalining administratori sifatida yoki",
    refresh_list: "ro'yxatni yangilash",
    refreshing: "yangilanmoqda...",
    tg_channels_loaded: "Yangi Telegram kanallari muvaffaqiyatli yuklandi! 🎉",
    tg_channels_not_found: "Yangi kanallar topilmadi. Bot ushbu kanalga administrator sifatida qo'shilganiga va unda yangi harakat bo'lganiga ishonch hosil qiling.",
    tg_api_invalid: "Telegram getUpdates so'rovidan noto'g'ri javob olindi.",
    tg_api_error: "Telegram API bilan bog'lanishda xatolik yuz berdi. Bot tokeni to'g'riligini tekshiring.",
    error_occurred: "Xatolik yuz berdi: ",
    trigger_conditions: "Ishga tushirish shartlari",
    trigger_action_desc: "Qaysi harakat chat-bot'ni ishga tushiradi?",
    start_bot_command: "Bot'ni ishga tushirish (buyruq/start)",
    msg_with_keyword: "Kalit so'z bilan xabar",
    keyword_placeholder: "Masalan: kirish, xohish, narx",
    keyword_comment_placeholder: "Masalan: test, bonus, dars",
    keyword_desc: "Kalit so'zlarni ajratish uchun 'Enter' yoki vergulni bosing",
    direct_msg: "Direkt'ga Xabar",
    comment_reels_post: "Reels yoki postga izoh",
    any_msg: "Har qanday xabar",
    exact_match: "Aniq moslik",
    exact_match_tooltip: "Aniq mos kelganda chatbot ishga tushadi",
    any_comment: "Har qanday izoh",
    comment_with_keyword: "Kalit so'z bilan izoh",
    exact_match_comment_tooltip: "Izoh kalit so'zga aniq mos tushgandagina bot javob yozadi",
    all_publications: "Barcha publikatsiyalar",
    selected: "Tanlangan",
    comment_all_desc: "Avtomatlashtirish barcha postlar ostidagi izohlarni kuzatib boradi",
    welcome_message: "Salomlashuv xabari",
    image: "Tasvir",
    max_chars: "Maksimal 500 ta belgi",
    button_text_placeholder: "Tugma matni (masalan: Olish)",
    if_not_subscribed: "Agar obuna bo'lmasa",
    after_subscribed: "Obuna bo'lgandan so'ng",
    btn_text: "Tugma matni",
    btn_url: "Tugma havolasi (URL)",
    comment_auto_replies: "Izohlarga avtomatik javoblar",
    comment_replies_desc: "Ularni tasodifiy tartibda ishlatamiz",
    add_auto_reply: "Avtomatik javob qo'shish",
    comment_bubble_desc: "Post yoki Reels ostida izoh qoldirgan mijozga ushbu javoblardan biri tasodifiy ravishda yuboriladi va unga shaxsiy xabar ham jo'natiladi.",
    remind_link_visit: "Havolaga o'tishni eslatib qo'ying",
    remind_desc: "10 daqiqadan so'ng eslatma yuboramiz",
    additional_msg: "Qo'shimcha xabar",
    additional_desc: "Xabar belgilangan soniyalarda tugagach, ulanish",
    additional_flow_desc: "Xabar belgilangan soniyalarda tugagach, tugmaga bosish va 2-shakldagi havolaga o'tishdan keyin yuboriladi",
    message_or_link: "Xabar yoki havola",
    minutes: "daqiqa",
    back: "Ortga",
    next: "Keyin",
    create: "Yaratish",
    live_preview: "Jonli Telefon Prevyusi",
    exit_title: "Chiqmoqchimisiz?",
    exit_desc: "Barcha ma'lumotlar avtomatik saqlandi va kelasi safar tahrirlash uchun mavjud bo'ladi.",
    stay: "Qolish",
    congrats_title: "Tabriklaymiz! 🎉",
    congrats_desc: "Chat-botingiz muvaffaqiyatli ishga tushdi va ulanish o'rnatildi!",
    awesome: "Ajoyib!",
    demo_preview_desc: "Bu yerda chat-bot mijoz bilan qanday muloqot qilishini ko'rsatamiz",
    type_message_placeholder: "Xabar yozing...",
    demo_message_tab: "Xabar",
    demo_comment_tab: "Izoh",
    posts: "Nashrlar",
    comments: "Izohlar",
    reply: "Javob berish",
    now: "Endi",
    comment_for: " uchun izoh...",
    alert_select_account: "Iltimos, avval akkauntni tanlang.",
    alert_ig_warning: "Iltimos, avval bot tokeni mavjud bo'lgan Telegram akkauntini tanlang."
  },
  ru: {
    exit: "Выйти",
    step_of: "Шаг {step} из 3",
    title: "Чат-бот по ключевым словам",
    select_account: "Выбрать аккаунт",
    no_channels: "У вас нет подключенных каналов. Пожалуйста, перейдите в настройки.",
    tg_check_sub: "Проверить подписку на Telegram канал",
    check_sub: "Проверить подписку",
    sub_desc: "Шаг проверки подписки чат-ботом",
    select_channel: "Выберите канал",
    channel_not_in_list: "Если канала нет в списке,",
    add_bot: "добавить бота",
    as_tg_admin: "в качестве администратора этого Telegram канала или",
    refresh_list: "обновить список",
    refreshing: "обновление...",
    tg_channels_loaded: "Новые Telegram каналы успешно загружены! 🎉",
    tg_channels_not_found: "Новые каналы не найдены. Убедитесь, что бот добавлен как администратор в этот канал и там была новая активность.",
    tg_api_invalid: "Неверный ответ от запроса Telegram getUpdates.",
    tg_api_error: "Ошибка связи с Telegram API. Проверьте токен бота.",
    error_occurred: "Произошла ошибка: ",
    trigger_conditions: "Условия запуска",
    trigger_action_desc: "Какое действие запустит чат-бота?",
    start_bot_command: "Запустить бота (команда/start)",
    msg_with_keyword: "Сообщение с ключевым словом",
    keyword_placeholder: "Например: инфо, цена, старт",
    keyword_comment_placeholder: "Например: тест, бонус, урок",
    keyword_desc: "Нажмите 'Enter' или запятую для разделения ключевых слов",
    direct_msg: "Сообщение в Директ",
    comment_reels_post: "Комментарий к Reels или посту",
    any_msg: "Любое сообщение",
    exact_match: "Точное соответствие",
    exact_match_tooltip: "Чат-бот запустится только при точном соответствии",
    any_comment: "Любой комментарий",
    comment_with_keyword: "Комментарий с ключевым словом",
    exact_match_comment_tooltip: "Бот ответит только при точном соответствии комментария ключевому слову",
    all_publications: "Все публикации",
    selected: "Выбранные",
    comment_all_desc: "Автоматизация будет отслеживать комментарии под всеми постами",
    welcome_message: "Приветственное сообщение",
    image: "Изображение",
    max_chars: "Максимум 500 символов",
    button_text_placeholder: "Текст кнопки (например: Получить)",
    if_not_subscribed: "Если не подписан",
    after_subscribed: "После подписки",
    btn_text: "Текст кнопки",
    btn_url: "Ссылка кнопки (URL)",
    comment_auto_replies: "Автоответы на комментарии",
    comment_replies_desc: "Мы используем их в случайном порядке",
    add_auto_reply: "Добавить автоответ",
    comment_bubble_desc: "Один из этих ответов будет случайно отправлен клиенту, оставившему комментарий под постом/Reels, а также будет отправлено личное сообщение.",
    remind_link_visit: "Напомнить перейти по ссылке",
    remind_desc: "Отправим напоминание через 10 минут",
    additional_msg: "Дополнительное сообщение",
    additional_desc: "Отправить сообщение после указанной задержки",
    additional_flow_desc: "Отправляется после указанной задержки по завершении приветственного потока",
    message_or_link: "Сообщение или ссылка",
    minutes: "минут",
    back: "Назад",
    next: "Далее",
    create: "Создать",
    live_preview: "Предпросмотр телефона",
    exit_title: "Хотите выйти?",
    exit_desc: "Все данные сохранены автоматически и будут доступны для редактирования.",
    stay: "Остаться",
    congrats_title: "Поздравляем! 🎉",
    congrats_desc: "Ваш чат-бот успешно запущен и соединение установлено!",
    awesome: "Отлично!",
    demo_preview_desc: "Здесь мы показываем, как чат-бот будет общаться с клиентом",
    type_message_placeholder: "Напишите сообщение...",
    demo_message_tab: "Сообщение",
    demo_comment_tab: "Коммент",
    posts: "Публикации",
    comments: "Комментарии",
    reply: "Ответить",
    now: "Сейчас",
    comment_for: "комментарий для...",
    alert_select_account: "Пожалуйста, сначала выберите аккаунт.",
    alert_ig_warning: "Пожалуйста, сначала выберите аккаунт Telegram с валидным токеном бота."
  },
  en: {
    exit: "Exit",
    step_of: "Step {step} of 3",
    title: "Keyword Chatbot",
    select_account: "Select Account",
    no_channels: "You have no connected channels. Please go to settings.",
    tg_check_sub: "Check Telegram Channel Subscription",
    check_sub: "Check Subscription",
    sub_desc: "Chatbot will check if the user is subscribed",
    select_channel: "Select Channel",
    channel_not_in_list: "If the channel is not in the list,",
    add_bot: "add bot",
    as_tg_admin: "as an admin of this Telegram channel or",
    refresh_list: "refresh list",
    refreshing: "updating...",
    tg_channels_loaded: "New Telegram channels successfully loaded! 🎉",
    tg_channels_not_found: "New channels not found. Make sure the bot is added as an administrator to this channel and there was a new activity.",
    tg_api_invalid: "Invalid response from Telegram getUpdates request.",
    tg_api_error: "Error connecting with Telegram API. Verify bot token.",
    error_occurred: "An error occurred: ",
    trigger_conditions: "Trigger Conditions",
    trigger_action_desc: "Which action triggers the chatbot?",
    start_bot_command: "Start the bot (command/start)",
    msg_with_keyword: "Message with keyword",
    keyword_placeholder: "e.g.: info, price, start",
    keyword_comment_placeholder: "e.g.: test, bonus, lesson",
    keyword_desc: "Press 'Enter' or comma to separate keywords",
    direct_msg: "Message to Direct",
    comment_reels_post: "Comment on Reels or post",
    any_msg: "Any message",
    exact_match: "Exact match",
    exact_match_tooltip: "Chatbot triggers only on exact match",
    any_comment: "Any comment",
    comment_with_keyword: "Comment with keyword",
    exact_match_comment_tooltip: "Bot replies only if comment exactly matches keyword",
    all_publications: "All publications",
    selected: "Selected",
    comment_all_desc: "Automation will track comments under all posts",
    welcome_message: "Welcome Message",
    image: "Image",
    max_chars: "Max 500 characters",
    button_text_placeholder: "Button text (e.g.: Get)",
    if_not_subscribed: "If not subscribed",
    after_subscribed: "After subscribed",
    btn_text: "Button text",
    btn_url: "Button link (URL)",
    comment_auto_replies: "Auto replies to comments",
    comment_replies_desc: "We use them in random order",
    add_auto_reply: "Add auto reply",
    comment_bubble_desc: "One of these replies will be randomly sent to a customer commenting under a post/Reels, and a private message will also be sent.",
    remind_link_visit: "Remind to visit link",
    remind_desc: "We will send a reminder after 10 minutes",
    additional_msg: "Additional message",
    additional_desc: "Send message after specified delay",
    additional_flow_desc: "Sent after specified delay when welcome message flow ends",
    message_or_link: "Message or link",
    minutes: "minutes",
    back: "Back",
    next: "Next",
    create: "Create",
    live_preview: "Phone Preview",
    exit_title: "Do you want to exit?",
    exit_desc: "All data is auto-saved and will be available for next editing.",
    stay: "Stay",
    congrats_title: "Congratulations! 🎉",
    congrats_desc: "Your chatbot is successfully running and the connection is established!",
    awesome: "Awesome!",
    demo_preview_desc: "Here we show how the chatbot will interact with the customer",
    type_message_placeholder: "Type a message...",
    demo_message_tab: "Message",
    demo_comment_tab: "Comment",
    posts: "Posts",
    comments: "Comments",
    reply: "Reply",
    now: "now",
    comment_for: "comment for...",
    alert_select_account: "Please select an account first.",
    alert_ig_warning: "Please select a Telegram account with a valid bot token first."
  }
};

const DEFAULT_TEMPLATES = {
  uz: {
    welcomeMessage: "Salom 👋 Chat-bot'larni sozlash darsini olishni xohlaysizmi? @isroil.ai akkauntiga obuna bo'ling va tugmani bosing",
    welcomeButton: "Olish",
    noSubMessage: "Obunani ko'rmayapman 😔 Darslarni olish uchun obuna bo'ling",
    noSubButton: "✅ Tugallandi",
    successMessage: "Zo'r! Quyidagi tugmani bosing va darslarni tomosha qilishni boshlang 👇",
    successButtonText: "🔻 Darslarni ko'rish",
    remindMessage: "10 daqiqa o'tdi va men hali ham tugmani bosishingizni kutmoqdaman 😊 👉",
    commentReplies: [
      "Barcha ma'lumotlar tepadagi xabarda 😊",
      "Yuborilgan ✅",
      "Endi xabarlarni ko'rib chiqing 👌",
      "Zo'r! PM-ingizni tekshiring - hammasi shu yerda! ✉️",
      "Javob yuborildi, PM-da qidiring! 🚀"
    ]
  },
  ru: {
    welcomeMessage: "Привет 👋 Хотите получить урок по настройке чат-ботов? Подпишитесь на аккаунт @isroil.ai и нажмите кнопку",
    welcomeButton: "Получить",
    noSubMessage: "Я не вижу подписку 😔 Подпишитесь, чтобы получить уроки",
    noSubButton: "✅ Готово",
    successMessage: "Отлично! Нажмите кнопку ниже и начните смотреть уроки 👇",
    successButtonText: "🔻 Смотреть уроки",
    remindMessage: "Прошло 10 минут, а я все еще жду, пока вы нажмете на кнопку 😊 👉",
    commentReplies: [
      "Вся информация в сообщении выше 😊",
      "Отправлено ✅",
      "Проверьте ваши сообщения 👌",
      "Отлично! Проверьте личку — все там! ✉️",
      "Ответ отправлен в ЛС! 🚀"
    ]
  },
  en: {
    welcomeMessage: "Hello 👋 Want to get the chatbot setup lesson? Subscribe to @isroil.ai and press the button",
    welcomeButton: "Get",
    noSubMessage: "I don't see the subscription 😔 Subscribe to get the lessons",
    noSubButton: "✅ Done",
    successMessage: "Great! Press the button below to start watching the lessons 👇",
    successButtonText: "🔻 Watch lessons",
    remindMessage: "10 minutes have passed and I'm still waiting for you to press the button 😊 👉",
    commentReplies: [
      "All info is in the message above 😊",
      "Sent ✅",
      "Check your messages now 👌",
      "Awesome! Check your PM — everything is there! ✉️",
      "Reply sent, check PM! 🚀"
    ]
  }
};

export default function QuickBotWizardPage() {
  const { lang } = useI18n();
  const tr = (key: keyof typeof LOCAL_TRANSLATIONS.uz, replacements?: Record<string, string>): string => {
    let val = LOCAL_TRANSLATIONS[lang]?.[key] || LOCAL_TRANSLATIONS.uz[key];
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, v);
      });
    }
    return val;
  };

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // STEP 1 FIELDS
  const [checkSubscription, setCheckSubscription] = useState(true);
  const [triggerDirect, setTriggerDirect] = useState(true);
  const [triggerComment, setTriggerComment] = useState(false);
  
  const [directTriggerType, setDirectTriggerType] = useState<"any" | "keyword">("keyword");
  const [commentTriggerType, setCommentTriggerType] = useState<"any" | "keyword">("keyword");
  
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [exactMatch, setExactMatch] = useState(false);
  
  const [commentPostsType, setCommentPostsType] = useState<"all" | "selected">("all");

  // Welcome Image state and ref
  const [welcomeImage, setWelcomeImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // States initialized dynamically below
  const [remindMessage, setRemindMessage] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [additionalDelay, setAdditionalDelay] = useState("10");

  // Telegram Obuna tekshirish kanal selection
  const [selectedTgSubChannel, setSelectedTgSubChannel] = useState("");
  const [tgSubChannels, setTgSubChannels] = useState<{ value: string; label: string; icon: React.ReactNode }[]>([]);
  const [refreshingTg, setRefreshingTg] = useState(false);

  // STEP 2 FIELDS (Message Settings)
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeButton, setWelcomeButton] = useState("");
  const [noSubMessage, setNoSubMessage] = useState("");
  const [noSubButton, setNoSubButton] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [successButtonText, setSuccessButtonText] = useState("");
  const [successButtonUrl, setSuccessButtonUrl] = useState("https://chatplace.io");

  // STEP 3 FIELDS (Additional Settings)
  const [autoCommentReplies, setAutoCommentReplies] = useState(true);
  const [commentReplies, setCommentReplies] = useState<string[]>([]);
  const [newCommentReply, setNewCommentReply] = useState("");
  const [remindLinkClick, setRemindLinkClick] = useState(false);
  const [remindButtonText, setRemindButtonText] = useState("");
  const [remindButtonUrl, setRemindButtonUrl] = useState("");
  const [additionalMessageToggle, setAdditionalMessageToggle] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Phone Preview Tabs
  const [previewTab, setPreviewTab] = useState<"xabar" | "izoh">("izoh");

  // Track user edits
  const isInitialOrLangDefault = useRef(true);

  // Effect to load translations when lang changes
  useEffect(() => {
    if (isInitialOrLangDefault.current) {
      const defaults = DEFAULT_TEMPLATES[lang] || DEFAULT_TEMPLATES.uz;
      setWelcomeMessage(defaults.welcomeMessage);
      setWelcomeButton(defaults.welcomeButton);
      setNoSubMessage(defaults.noSubMessage);
      setNoSubButton(defaults.noSubButton);
      setSuccessMessage(defaults.successMessage);
      setSuccessButtonText(defaults.successButtonText);
      setRemindMessage(defaults.remindMessage);
      setCommentReplies(defaults.commentReplies);
    }
  }, [lang]);

  // Disable language-driven sync when user starts editing values manually
  const markAsUserModified = () => {
    isInitialOrLangDefault.current = false;
  };

  // Sync / populate Telegram channels for selected bot
  useEffect(() => {
    if (selectedChannel && selectedChannel.type === "telegram") {
      const botChannels = selectedChannel.telegramChannels || [];
      
      const options = botChannels.map(ch => ({
        value: ch.username,
        label: ch.name,
        icon: <Megaphone size={13} className="text-black" />
      }));
      
      setTgSubChannels(options);
      if (options.length > 0) {
        setSelectedTgSubChannel(options[0].value);
      } else {
        setSelectedTgSubChannel("");
      }
    }
  }, [selectedChannel, channels]);

  const handleRefreshTgChannels = async () => {
    if (!selectedChannel || selectedChannel.type !== "telegram" || !selectedChannel.telegramToken) {
      toast.error("Iltimos, avval bot tokeni mavjud bo'lgan Telegram akkauntini tanlang.");
      return;
    }
    setRefreshingTg(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${selectedChannel.telegramToken}/getUpdates?timeout=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result) {
          const newChannels = [...(selectedChannel.telegramChannels || [])];
          let updated = false;
          
          for (const update of data.result) {
            // Check my_chat_member
            if (update.my_chat_member) {
              const chat = update.my_chat_member.chat;
              const newMember = update.my_chat_member.new_chat_member;
              if (chat && (chat.type === "channel" || chat.type === "group" || chat.type === "supergroup") && newMember && newMember.status === "administrator") {
                const username = chat.username || String(chat.id);
                const name = chat.title || chat.username || `Kanal ${chat.id}`;
                if (!newChannels.some(ch => ch.username === username)) {
                  newChannels.push({ username, name });
                  updated = true;
                }
              }
            }
            // Check channel_post
            if (update.channel_post && update.channel_post.chat) {
              const chat = update.channel_post.chat;
              if (chat.type === "channel") {
                const username = chat.username || String(chat.id);
                const name = chat.title || chat.username || `Kanal ${chat.id}`;
                if (!newChannels.some(ch => ch.username === username)) {
                  newChannels.push({ username, name });
                  updated = true;
                }
              }
            }
          }
          
          if (updated) {
            selectedChannel.telegramChannels = newChannels;
            const updatedChannels = channels.map(c => c.id === selectedChannel.id ? selectedChannel : c);
            db.saveChannels(updatedChannels);
            setChannels(updatedChannels);
            toast.success("Yangi Telegram kanallari muvaffaqiyatli yuklandi! 🎉");
          } else {
            toast.error("Yangi kanallar topilmadi. Bot ushbu kanalga administrator sifatida qo'shilganiga va unda yangi harakat bo'lganiga ishonch hosil qiling.");
          }
        } else {
          toast.error("Telegram getUpdates so'rovidan noto'g'ri javob olindi.");
        }
      } else {
        toast.error("Telegram API bilan bog'lanishda xatolik yuz berdi. Bot tokeni to'g'riligini tekshiring.");
      }
    } catch (err) {
      console.error("Failed to refresh tg channels:", err);
      toast.error("Xatolik yuz berdi: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRefreshingTg(false);
    }
  };



  useEffect(() => {
    const chs = db.getChannels();
    setChannels(chs);
    if (chs.length > 0) {
      const activeCh = db.getActiveChannel() || chs[0];
      setSelectedChannel(activeCh);
    }
  }, []);

  // Sync preview tab with channel type and triggers selected
  useEffect(() => {
    if (selectedChannel?.type === "telegram") {
      setPreviewTab("xabar");
      setTriggerDirect(true);
      setTriggerComment(false);
    } else {
      if (triggerDirect && !triggerComment) {
        setPreviewTab("xabar");
      } else if (triggerComment && !triggerDirect) {
        setPreviewTab("izoh");
      }
    }
  }, [selectedChannel, triggerDirect, triggerComment]);

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = keywordsInput.trim().toLowerCase().replace(/,/g, "");
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
        setKeywordsInput("");
      }
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWelcomeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCommentReply = (index: number) => {
    setCommentReplies(commentReplies.filter((_, i) => i !== index));
  };

  const handleCreateBot = () => {
    if (!selectedChannel) {
      toast.error("Iltimos, avval akkauntni tanlang.");
      return;
    }
    
    // Save to channel's automations
    const autos = db.getChannelAutomations(selectedChannel.id);
    
    const triggerDetails = selectedChannel.type === "telegram"
      ? (directTriggerType === "any" ? "/start" : keywords.join(", "))
      : (triggerDirect 
        ? (directTriggerType === "any" ? tr("any_msg") : keywords.join(", "))
        : (commentTriggerType === "any" ? tr("any_comment") : keywords.join(", ")));

    const name = selectedChannel.type === "telegram"
      ? `Tezkor Telegram Bot: ${directTriggerType === "any" ? "/start" : (keywords[0] || "direct")}`
      : (triggerDirect 
        ? `Tezkor DM Bot: ${keywords[0] || "direct"}`
        : `Tezkor Izoh Bot: ${keywords[0] || "izoh"}`);

    const newAuto: Automation = {
      id: `quick_${Date.now()}`,
      name: name,
      triggerType: "keyword",
      triggerDetails: triggerDetails,
      runs: "0",
      completion: "0%",
      active: true,
      replyText: welcomeMessage,
    };

    autos.push(newAuto);
    db.saveChannelAutomations(selectedChannel.id, autos);
    
    // Show congratulate popup instead of redirecting immediately
    setShowSuccessPopup(true);
  };

  const dropdownOptions = channels.map(c => ({
    value: c.id,
    label: `@${c.username.replace(/^@+/, "")}`,
    icon: c.avatar ? (
      <img src={c.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[10px] font-bold">
        {c.name.charAt(0).toUpperCase()}
      </div>
    )
  }));

  const activeChannelId = selectedChannel?.id || "";

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col font-sans text-black">
      {/* Header bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#E8E8E8] bg-white">
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-2 text-[13px] text-[#707070] hover:text-black font-semibold transition-colors bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{tr("exit")}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#707070]">
            {tr("step_of", { step: String(step) })}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-8 gap-8 items-stretch">
        
        {/* Left Side: Wizard Settings */}
        <div className="flex-1 bg-white border border-[#E8E8E8] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col items-center justify-between">
          <div className="max-w-xl w-full flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-[24px] font-extrabold text-black tracking-tight mb-6">
                {tr("title")}
              </h1>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* Akkaunt tanlash */}
                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                      {tr("select_account")}
                    </label>
                    {channels.length > 0 ? (
                      <CustomDropdown
                        value={activeChannelId}
                        onChange={(val) => {
                          const ch = channels.find(c => c.id === val);
                          if (ch) setSelectedChannel(ch);
                        }}
                        options={dropdownOptions}
                        className="w-full"
                      />
                    ) : (
                      <div className="text-[12px] text-red-500 font-semibold bg-red-50 p-3.5 rounded-xl border border-red-100 w-full">
                        {tr("no_channels")}
                      </div>
                    )}
                  </div>

                  {/* Obunani tekshirish (Instagram vs Telegram) */}
                  <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold text-black">
                          {selectedChannel?.type === "telegram" ? tr("tg_check_sub") : tr("check_sub")}
                        </h3>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          {tr("sub_desc")}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={checkSubscription}
                          onChange={(e) => setCheckSubscription(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>

                    {/* Telegram Channel Selector Dropdown */}
                    {selectedChannel?.type === "telegram" && checkSubscription && (
                      <div className="flex flex-col gap-2 border-t border-[#E8E8E8] pt-3 animate-in slide-in-from-top-1 duration-150 w-full">
                        <label className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">{tr("select_channel")}</label>
                        <CustomDropdown
                          value={selectedTgSubChannel}
                          onChange={(val) => setSelectedTgSubChannel(val)}
                          options={tgSubChannels}
                          className="w-full"
                        />
                        <p className="text-[10px] text-[#707070] mt-1 leading-relaxed font-medium">
                          {tr("channel_not_in_list")} <a href="/settings" className="text-black hover:underline font-bold">{tr("add_bot")}</a> {tr("as_tg_admin")} <span onClick={handleRefreshTgChannels} className={`text-black hover:underline font-bold cursor-pointer ${refreshingTg ? "opacity-50 pointer-events-none" : ""}`}>
                            {refreshingTg ? tr("refreshing") : tr("refresh_list")}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* {tr("trigger_conditions")} */}
                  <div className="flex flex-col gap-3 w-full">
                    <div>
                      <h3 className="text-[13px] font-extrabold text-black">{tr("trigger_conditions")}</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {tr("trigger_action_desc")}
                      </p>
                    </div>

                    {selectedChannel?.type === "telegram" ? (
                      /* Telegram Triggers Radio Options */
                      <div className="flex flex-col gap-3 w-full">
                        <label 
                          className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${directTriggerType === "any" ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                          onClick={() => {
                            setDirectTriggerType("any");
                            setTriggerDirect(true);
                            setTriggerComment(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <MessageCircle size={18} className="text-black" />
                            <span className="text-[13px]">{tr("start_bot_command")}</span>
                          </div>
                          {/* Custom Radio Button */}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${directTriggerType === "any" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {directTriggerType === "any" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                        </label>

                        <label 
                          className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${directTriggerType === "keyword" ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                          onClick={() => {
                            setDirectTriggerType("keyword");
                            setTriggerDirect(true);
                            setTriggerComment(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare size={18} className="text-black" />
                            <span className="text-[13px]">{tr("msg_with_keyword")}</span>
                          </div>
                          {/* Custom Radio Button */}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${directTriggerType === "keyword" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {directTriggerType === "keyword" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                        </label>

                        {/* Telegram Keywords Input */}
                        {directTriggerType === "keyword" && (
                          <div className="flex flex-col gap-2 w-full mt-1 animate-in slide-in-from-top-2 duration-150">
                            <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center">
                              {keywords.map((kw, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                                  <span>{kw}</span>
                                  <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                              <input 
                                type="text" 
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                onKeyDown={handleAddKeyword}
                                placeholder={tr("keyword_placeholder")}
                                className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                              />
                            </div>
                            <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                              {tr("keyword_desc")}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Instagram Triggers Checkbox Options */
                      <div className="flex flex-col gap-3 w-full">
                        {/* Trigger Direct */}
                        <div 
                          className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${triggerDirect ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                          onClick={() => {
                            setTriggerDirect(!triggerDirect);
                            if (!triggerDirect) setTriggerComment(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <MessageCircle size={18} className="text-black" />
                            <span className="text-[13px]">{tr("direct_msg")}</span>
                          </div>
                          {/* Custom Checkbox */}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${triggerDirect ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {triggerDirect && (
                              <svg className="w-2.5 h-2.5 text-[#C7F33C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Trigger Comment */}
                        <div 
                          className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${triggerComment ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                          onClick={() => {
                            setTriggerComment(!triggerComment);
                            if (!triggerComment) setTriggerDirect(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare size={18} className="text-black" />
                            <span className="text-[13px]">{tr("comment_reels_post")}</span>
                          </div>
                          {/* Custom Checkbox */}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${triggerComment ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {triggerComment && (
                              <svg className="w-2.5 h-2.5 text-[#C7F33C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instagram Direct sub-triggers */}
                  {selectedChannel?.type !== "telegram" && triggerDirect && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-150 w-full">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="direct_trigger" 
                            checked={directTriggerType === "any"} 
                            onChange={() => setDirectTriggerType("any")}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${directTriggerType === "any" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {directTriggerType === "any" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                          <span>{tr("any_msg")}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="direct_trigger" 
                            checked={directTriggerType === "keyword"} 
                            onChange={() => setDirectTriggerType("keyword")}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${directTriggerType === "keyword" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {directTriggerType === "keyword" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                          <span>{tr("msg_with_keyword")}</span>
                        </label>
                      </div>

                      {directTriggerType === "keyword" && (
                        <div className="flex flex-col gap-2 w-full animate-in slide-in-from-top-2 duration-150">
                          {/* Keyword tags */}
                          <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center w-full">
                            {keywords.map((kw, i) => (
                              <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                                <span>{kw}</span>
                                <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                            <input 
                              type="text" 
                              value={keywordsInput}
                              onChange={(e) => setKeywordsInput(e.target.value)}
                              onKeyDown={handleAddKeyword}
                              placeholder={tr("keyword_placeholder")}
                              className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                            />
                          </div>
                          <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                            {tr("keyword_desc")}
                          </p>

                          {/* Exact match checkbox */}
                          <label className="flex items-center gap-2 mt-1 text-[11px] text-[#505050] font-semibold cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={exactMatch} 
                              onChange={(e) => setExactMatch(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${exactMatch ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                              {exactMatch && (
                                <svg className="w-2.5 h-2.5 text-[#C7F33C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span>{tr("exact_match")}</span>
                            <span title={tr("exact_match_tooltip")}><HelpCircle size={12} className="text-[#A0A0A0]" /></span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instagram comment sub-triggers */}
                  {selectedChannel?.type !== "telegram" && triggerComment && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-150 w-full">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="comment_trigger" 
                            checked={commentTriggerType === "any"} 
                            onChange={() => setCommentTriggerType("any")}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${commentTriggerType === "any" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {commentTriggerType === "any" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                          <span>{tr("any_comment")}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="comment_trigger" 
                            checked={commentTriggerType === "keyword"} 
                            onChange={() => setCommentTriggerType("keyword")}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${commentTriggerType === "keyword" ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                            {commentTriggerType === "keyword" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                            )}
                          </div>
                          <span>{tr("comment_with_keyword")}</span>
                        </label>
                      </div>

                      {commentTriggerType === "keyword" && (
                        <div className="flex flex-col gap-2 w-full animate-in slide-in-from-top-2 duration-150">
                          {/* Keyword tags */}
                          <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center w-full">
                            {keywords.map((kw, i) => (
                              <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                                <span>{kw}</span>
                                <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                            <input 
                              type="text" 
                              value={keywordsInput}
                              onChange={(e) => setKeywordsInput(e.target.value)}
                              onKeyDown={handleAddKeyword}
                              placeholder={tr("keyword_comment_placeholder")}
                              className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                            />
                          </div>
                          <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                            {tr("keyword_desc")}
                          </p>

                          {/* Exact match checkbox */}
                          <label className="flex items-center gap-2 mt-1 text-[11px] text-[#505050] font-semibold cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={exactMatch} 
                              onChange={(e) => setExactMatch(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${exactMatch ? "border-black bg-black" : "border-[#D8D8D8]"}`}>
                              {exactMatch && (
                                <svg className="w-2.5 h-2.5 text-[#C7F33C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span>{tr("exact_match")}</span>
                            <span title={tr("exact_match_comment_tooltip")}><HelpCircle size={12} className="text-[#A0A0A0]" /></span>
                          </label>

                          {/* Publications options */}
                          <div className="flex border border-[#E8E8E8] rounded-xl p-1 bg-[#F9F9F7] mt-2 self-start">
                            <button
                              type="button"
                              onClick={() => setCommentPostsType("all")}
                              className={`px-4 py-1 rounded-lg text-[11px] font-bold transition-all ${commentPostsType === "all" ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                            >
                              {tr("all_publications")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentPostsType("selected")}
                              className={`px-4 py-1 rounded-lg text-[11px] font-bold transition-all ${commentPostsType === "selected" ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                            >
                              {tr("selected")}
                            </button>
                          </div>
                          <div className="p-3 bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl text-[10px] text-[#707070] leading-relaxed mt-2 text-center font-medium w-full">
                            {tr("comment_all_desc")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* {tr("welcome_message")} Card */}
                  <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                    <div className="flex justify-between items-center w-full">
                      <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                        {tr("welcome_message")}
                      </label>
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="text-[11px] font-extrabold text-black hover:opacity-85 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} className="text-black" /> <span>{tr("image")}</span>
                      </button>
                      <input 
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    
                    {welcomeImage && (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#E8E8E8] bg-white group mt-1">
                        <img src={welcomeImage} alt="Welcome" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setWelcomeImage(null)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => { markAsUserModified(); setWelcomeMessage(e.target.value.substring(0, 500)); }}
                      className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-white border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                      maxLength={500}
                    />
                    <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px] w-full">
                      <span>{tr("max_chars")}</span>
                      <span>{welcomeMessage.length} / 500</span>
                    </div>

                    <input
                      type="text"
                      value={welcomeButton}
                      onChange={(e) => { markAsUserModified(); setWelcomeButton(e.target.value); }}
                      placeholder={tr("button_text_placeholder")}
                      className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                    />
                  </div>

                  {/* Conditional fields if check subscription is active */}
                  {checkSubscription && (
                    <>
                      {/* Agar obuna bo'lmasa Card */}
                      <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                        <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                          {tr("if_not_subscribed")}
                        </label>
                        
                        <textarea
                          value={noSubMessage}
                          onChange={(e) => { markAsUserModified(); setNoSubMessage(e.target.value.substring(0, 500)); }}
                          className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-white border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                          maxLength={500}
                        />
                        <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px] w-full">
                          <span>{tr("max_chars")}</span>
                          <span>{noSubMessage.length} / 500</span>
                        </div>

                        <input
                          type="text"
                          value={noSubButton}
                          onChange={(e) => { markAsUserModified(); setNoSubButton(e.target.value); }}
                          placeholder="Tugma matni (masalan: ✅ Tugallandi)"
                          className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                        />
                      </div>

                      {/* Obuna bo'lgandan so'ng Card */}
                      <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                        <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                          {tr("after_subscribed")}
                        </label>
                        
                        <textarea
                          value={successMessage}
                          onChange={(e) => { markAsUserModified(); setSuccessMessage(e.target.value.substring(0, 500)); }}
                          className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-white border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                          maxLength={500}
                        />
                        <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px] w-full">
                          <span>{tr("max_chars")}</span>
                          <span>{successMessage.length} / 500</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                          <input
                            type="text"
                            value={successButtonText}
                            onChange={(e) => { markAsUserModified(); setSuccessButtonText(e.target.value); }}
                            placeholder={tr("btn_text")}
                            className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                          />
                          <input
                            type="text"
                            value={successButtonUrl}
                            onChange={(e) => setSuccessButtonUrl(e.target.value)}
                            placeholder={tr("btn_url")}
                            className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-mono font-medium text-black"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* {tr("comment_auto_replies")} (Only for Instagram!) */}
                  {selectedChannel?.type !== "telegram" && (
                    <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[13px] font-bold text-black">{tr("comment_auto_replies")}</h3>
                          <p className="text-[11px] text-[#707070] mt-0.5">
                            {tr("comment_replies_desc")}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={autoCommentReplies}
                            onChange={(e) => setAutoCommentReplies(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>

                      {autoCommentReplies && (
                        <div className="flex flex-col gap-2.5 w-full animate-in slide-in-from-top-2 duration-150">
                          {commentReplies.map((reply, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={reply}
                                onChange={(e) => {
                                  const newReplies = [...commentReplies];
                                  newReplies[idx] = e.target.value;
                                  setCommentReplies(newReplies);
                                }}
                                className="flex-1 px-3 py-1.5 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                              />
                              <button 
                                onClick={() => handleRemoveCommentReply(idx)}
                                className="h-8 w-8 rounded-full bg-white hover:bg-red-50 text-[#707070] hover:text-red-500 flex items-center justify-center transition-colors shrink-0 border border-[#D8D8D8]"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}

                          {commentReplies.length < 10 && (
                            <button
                              type="button"
                              onClick={() => setCommentReplies([...commentReplies, ""])}
                              className="w-full py-2 border border-dashed border-[#D8D8D8] hover:border-black rounded-xl text-[12px] font-bold text-black flex items-center justify-center gap-1.5 transition-all bg-white active:scale-95 mt-1"
                            >
                              <Plus size={14} />
                              <span>{tr("add_auto_reply")}</span>
                            </button>
                          )}
                          
                          <div className="p-3 bg-white border border-[#E8E8E8] rounded-xl text-[10px] text-[#707070] leading-normal flex items-start gap-1.5 mt-1">
                            <span className="text-black font-extrabold">✓</span>
                            <span>{tr("comment_bubble_desc")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Havolaga o'tishni eslatib qo'ying */}
                  <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold text-black">{tr("remind_link_visit")}</h3>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          {tr("remind_desc")}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={remindLinkClick}
                          onChange={(e) => setRemindLinkClick(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>

                    {remindLinkClick && (
                      <div className="flex flex-col gap-2 w-full animate-in slide-in-from-top-2 duration-150">
                        <textarea
                          value={remindMessage}
                          onChange={(e) => { markAsUserModified(); setRemindMessage(e.target.value.substring(0, 500)); }}
                          className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-white border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                          maxLength={500}
                        />
                        <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px] w-full">
                          <span />
                          <span>{remindMessage.length} / 500</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-1.5">
                          <input
                            type="text"
                            value={remindButtonText}
                            onChange={(e) => setRemindButtonText(e.target.value)}
                            placeholder={tr("btn_text")}
                            className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                          />
                          <input
                            type="text"
                            value={remindButtonUrl}
                            onChange={(e) => setRemindButtonUrl(e.target.value)}
                            placeholder={tr("btn_url")}
                            className="w-full px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-mono font-medium text-black"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Qo'shimcha xabar */}
                  <div className="flex flex-col gap-3.5 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold text-black">{tr("additional_msg")}</h3>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          {tr("additional_desc")}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={additionalMessageToggle}
                          onChange={(e) => setAdditionalMessageToggle(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>

                    {additionalMessageToggle && (
                      <div className="flex flex-col gap-3 w-full animate-in slide-in-from-top-2 duration-150">
                        <div className="text-[10px] text-[#707070] leading-relaxed font-medium">
                          {tr("additional_flow_desc")}
                        </div>
                        <textarea
                          value={additionalMessage}
                          onChange={(e) => setAdditionalMessage(e.target.value.substring(0, 500))}
                          placeholder={tr("message_or_link")}
                          className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-white border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                          maxLength={500}
                        />
                        <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-8px] w-full">
                          <span />
                          <span>{additionalMessage.length} / 500</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 border border-[#D8D8D8] bg-white rounded-xl px-3 py-2 w-full max-w-[150px]">
                          <input
                            type="text"
                            value={additionalDelay}
                            onChange={(e) => setAdditionalDelay(e.target.value)}
                            className="w-8 text-[12px] text-black font-bold bg-transparent border-0 p-0 focus:ring-0 focus:outline-none"
                          />
                          <span className="text-[12px] text-[#A0A0A0] font-medium">{tr("minutes")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] flex justify-end gap-4 select-none">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  className="w-36 h-11 flex items-center justify-center bg-white hover:bg-[#F5F5F5] text-black border border-[#D8D8D8] font-bold rounded-xl text-[13px] transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  Ortga
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  className="w-36 h-11 flex items-center justify-center bg-white hover:bg-[#F5F5F5] text-black border border-[#D8D8D8] font-bold rounded-xl text-[13px] transition-all active:scale-95 shadow-sm"
                >
                  Ortga
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="w-36 h-11 flex items-center justify-center bg-black hover:bg-black/90 text-white font-bold rounded-xl text-[13px] transition-all active:scale-95 shadow-sm"
                >
                  Keyin
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateBot}
                  className="w-36 h-11 flex items-center justify-center bg-[#C7F33C] hover:bg-[#b5e02c] text-black border border-[#b2db2a] font-bold rounded-xl text-[13px] transition-all active:scale-95 shadow-sm"
                >
                  Yaratish
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Phone Mockup Preview */}
        <div className="w-full lg:w-[400px] flex flex-col items-center justify-center bg-[#F9F9F7] rounded-[24px] p-4 shrink-0">
          
          {/* Phone Body Container */}
          <div className="w-[305px] h-[610px] border-[12px] border-black rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col bg-white select-none">
            {/* Phone Top Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130px] h-[24px] bg-black rounded-b-[20px] z-30 flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-white/10 rounded-full mr-2 shrink-0 animate-pulse" />
              <div className="w-14 h-1.5 bg-white/10 rounded-full shrink-0" />
            </div>

            {/* Phone Screen Headers depending on Preview Tab & Channel Type */}
            {selectedChannel?.type === "telegram" ? (
              /* Telegram Chat Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center justify-between bg-white z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] text-black font-semibold cursor-pointer mr-1">⟨</span>
                  <div className="min-w-0 flex flex-col items-center justify-center flex-1">
                    <p className="text-[10px] font-extrabold text-black truncate leading-tight">
                      {selectedChannel?.name || "Abror Ahmedov"}
                    </p>
                    <p className="text-[8px] text-[#707070] truncate leading-none mt-0.5 font-bold">
                      0 foydalanuvchilar
                    </p>
                  </div>
                </div>
                <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
                  {(selectedChannel?.name || "Abror Ahmedov").charAt(0).toUpperCase()}
                </div>
              </div>
            ) : previewTab === "xabar" ? (
              /* Instagram DM Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center justify-between bg-white z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] text-black font-semibold cursor-pointer mr-1">⟨</span>
                  {selectedChannel?.avatar ? (
                    <img src={selectedChannel.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={12} className="text-[#707070]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold text-black truncate leading-tight">
                      {selectedChannel?.name || "Isroil Samatov"}
                    </p>
                    <p className="text-[8px] text-[#707070] truncate leading-none mt-0.5">
                      @{selectedChannel?.username.replace(/^@+/, "") || "isroilsamatov_"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-[#707070] shrink-0">
                  <Phone size={12} className="cursor-pointer hover:text-black" />
                  <Video size={13} className="cursor-pointer hover:text-black" />
                </div>
              </div>
            ) : (
              /* Instagram Comments Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center bg-white z-10 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] text-black font-semibold cursor-pointer">⟨</span>
                    {selectedChannel?.avatar ? (
                      <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-black flex items-center justify-center shrink-0 text-white text-[7px] font-bold">
                        I
                      </div>
                    )}
                    <span className="text-[9px] font-extrabold text-black truncate">
                      {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                    </span>
                  </div>
                  <div className="text-center flex-1 pr-6">
                    <p className="text-[9px] font-extrabold text-black tracking-tight">{tr("posts")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Screen Content */}
            <div className={`flex-1 overflow-y-auto flex flex-col text-[11px] leading-relaxed relative ${selectedChannel?.type === "telegram" ? "bg-[#ECEFF1]" : "bg-[#FCFCFB]"}`}>
              
              {/* Telegram specific mockup screen */}
              {selectedChannel?.type === "telegram" ? (
                <div className="flex-1 p-3 flex flex-col justify-end gap-3 font-sans">
                  {/* Step 1 centered card */}
                  {step === 1 && (
                    <div className="my-auto bg-[#D0D7DE]/60 border border-[#B0BEC5]/30 text-[#37474F] rounded-[16px] p-4 text-center max-w-[85%] mx-auto font-semibold shadow-xs">
                      {tr("demo_preview_desc")}
                    </div>
                  )}

                  {/* Step 2 & 3 flow */}
                  {step >= 2 && (
                    <div className="flex flex-col gap-3 justify-end w-full">
                      {/* User message (right, green bubble) */}
                      <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                        {directTriggerType === "any" ? "/start" : (keywords[0] || "Kalit so'z")}
                      </div>

                      {/* Bot Welcome reply (left, white bubble) */}
                      {(welcomeMessage || welcomeImage) && (
                        <div className="self-start flex flex-col max-w-[80%]">
                          {welcomeImage && (
                            <div className="mb-1 rounded-2xl overflow-hidden border border-[#E1E8ED] bg-white">
                              <img src={welcomeImage} alt="" className="w-full max-h-[140px] object-cover" />
                            </div>
                          )}
                          {welcomeMessage && (
                            <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                              {welcomeMessage}
                            </div>
                          )}
                          {welcomeButton && (
                            <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-black rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                              {welcomeButton}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conditional subscription checker steps */}
                      {checkSubscription && (
                        <>
                          {/* User clicks welcome button */}
                          <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                            {welcomeButton}
                          </div>

                          {/* Not subscribed error */}
                          {noSubMessage && (
                            <div className="self-start flex flex-col max-w-[80%]">
                              <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                                {noSubMessage}
                              </div>
                              {noSubButton && (
                                <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-black rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                                  {noSubButton}
                                </div>
                              )}
                            </div>
                          )}

                          {/* User clicks completed button */}
                          <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                            {noSubButton}
                          </div>

                          {/* Success message */}
                          {successMessage && (
                            <div className="self-start flex flex-col max-w-[80%]">
                              <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                                {successMessage}
                              </div>
                              {successButtonText && (
                                <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-black rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                                  {successButtonText}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Reminder message preview */}
                          {step === 3 && remindLinkClick && remindMessage && (
                            <div className="self-start flex flex-col max-w-[80%] mt-2 animate-in fade-in duration-300">
                              <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                                {remindMessage}
                              </div>
                              {remindButtonText && (
                                <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-black rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                                  {remindButtonText}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div className="h-1" />
                </div>
              ) : (
                /* Instagram Specific Views (Xabar or Izoh) */
                <>
                  {previewTab === "xabar" && (
                    <div className="flex-1 p-4 flex flex-col justify-end gap-3.5 bg-[#FCFCFB]">
                      {/* Step 1 User Message */}
                      {step >= 1 && (
                        <div className="self-end bg-black text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium animate-in fade-in duration-200">
                          {keywords[0] ? keywords[0] : "Aniq xabar"}
                        </div>
                      )}

                      {/* Step 2 Bot Welcome message */}
                      {step >= 2 && (welcomeMessage || welcomeImage) && (
                        <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                          <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                            {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="flex flex-col gap-1">
                            {welcomeImage && (
                              <div className="rounded-2xl overflow-hidden border border-[#E8E8E8] bg-white max-w-full">
                                <img src={welcomeImage} alt="" className="w-full max-h-[120px] object-cover" />
                              </div>
                            )}
                            {welcomeMessage && (
                              <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                {welcomeMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 2 Bot Welcome Button */}
                      {step >= 2 && welcomeButton && (
                        <div className="self-center mt-1 py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold shadow-xs select-none max-w-[85%] text-center truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                          {welcomeButton}
                        </div>
                      )}

                      {/* Step 2 Verification Flow Demo */}
                      {step >= 2 && checkSubscription && (
                        <>
                          {/* User clicks welcome button */}
                          <div className="self-end bg-black text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium opacity-80 animate-in fade-in duration-300 delay-200">
                            {welcomeButton}
                          </div>

                          {/* Not subscribed warning */}
                          {noSubMessage && (
                            <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
                              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                              </div>
                              <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                {noSubMessage}
                              </div>
                            </div>
                          )}
                          
                          {noSubButton && (
                            <div className="self-center py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold shadow-xs select-none text-center max-w-[85%] truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                              {noSubButton}
                            </div>
                          )}

                          {/* User clicks Subscribed Button */}
                          <div className="self-end bg-black text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium opacity-80 animate-in fade-in duration-300">
                            {noSubButton}
                          </div>

                          {/* Subscribed Success msg */}
                          {successMessage && (
                            <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                              </div>
                              <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                {successMessage}
                              </div>
                            </div>
                          )}
                          
                          {successButtonText && (
                            <div className="self-center py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold text-black shadow-xs select-none text-center max-w-[85%] truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300 hover:underline">
                              {successButtonText}
                            </div>
                          )}

                          {/* Reminder message preview */}
                          {step === 3 && remindLinkClick && remindMessage && (
                            <>
                              <div className="self-start flex items-end gap-1.5 max-w-[80%] mt-2 animate-in fade-in duration-300">
                                <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                  {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                  {remindMessage}
                                </div>
                              </div>
                              {remindButtonText && (
                                <div className="self-center py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold text-black shadow-xs select-none text-center max-w-[85%] truncate cursor-pointer hover:bg-slate-50 transition-colors hover:underline">
                                  {remindButtonText}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      <div className="h-1" />
                    </div>
                  )}

                  {/* Comment Tab view */}
                  {previewTab === "izoh" && (
                    <div className="flex-1 flex flex-col justify-between bg-white">
                      {/* Fake post block */}
                      <div className="w-full bg-[#EFEFEF] h-[160px] flex items-center justify-center text-slate-400 font-bold shrink-0 relative">
                        <span>Instagram Post</span>
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-black bg-white/70 px-2 py-1 rounded">
                          <span className="font-semibold">Barcha ma&apos;lumotlar...</span>
                          <span className="text-black font-bold">Qarang 🔗</span>
                        </div>
                      </div>

                      {/* Comments Drawer Panel */}
                      <div className="flex-1 bg-white border-t border-[#E8E8E8] rounded-t-[20px] flex flex-col z-10 shadow-lg min-h-[220px]">
                        {/* Drawer swipe pill */}
                        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto my-2.5 shrink-0" />
                        
                        {/* Drawer Title */}
                        <div className="text-[10px] text-black text-center font-extrabold pb-2 border-b border-[#F5F5F5] uppercase tracking-wider shrink-0">
                          {tr("comments")}
                        </div>

                        {/* Scrollable comments list */}
                        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
                          
                          {/* Comment 1: User */}
                          <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
                            <div className="h-5 w-5 rounded-full bg-[#F0F0F0] shrink-0 flex items-center justify-center font-bold text-[8px] text-black">L</div>
                            <div className="flex-1">
                              <p className="font-extrabold text-[10px] text-black">
                                lsm <span className="font-normal text-[#909090] ml-1">{tr("now")}</span>
                              </p>
                              <p className="text-[10.5px] mt-0.5 text-black font-medium">{keywords[0] || "Kalit so'z"}</p>
                              <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">{tr("reply")}</button>
                            </div>
                          </div>

                          {/* Reply 1: Bot automatic comment reply (Step 3 only) */}
                          {step === 3 && autoCommentReplies && commentReplies[0] && (
                            <div className="flex items-start gap-2.5 pl-7 border-l border-[#F0F0F0] animate-in slide-in-from-left-2 duration-300">
                              {selectedChannel?.avatar ? (
                                <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-black shrink-0 flex items-center justify-center text-white text-[7px] font-bold">
                                  I
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                                  <span className="font-normal text-[#909090] ml-1">{tr("now")}</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-semibold bg-slate-50 p-1.5 rounded-lg border border-[#F0F0F0]">
                                  {commentReplies[0]}
                                </p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">{tr("reply")}</button>
                              </div>
                            </div>
                          )}

                          {/* Comment 2: User (Step 3 only) */}
                          {step === 3 && (
                            <div className="flex items-start gap-2.5 animate-in fade-in duration-200 delay-100">
                              <div className="h-5 w-5 rounded-full bg-[#F0F0F0] shrink-0 flex items-center justify-center font-bold text-[8px] text-black">A</div>
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  anvar_m <span className="font-normal text-[#909090] ml-1">{tr("now")}</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-medium">{keywords[0] || "Kalit so'z"}</p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">{tr("reply")}</button>
                              </div>
                            </div>
                          )}

                          {/* Reply 2: Bot (Step 3 only) */}
                          {step === 3 && autoCommentReplies && commentReplies[1] && (
                            <div className="flex items-start gap-2.5 pl-7 border-l border-[#F0F0F0] animate-in slide-in-from-left-2 duration-300 delay-200">
                              {selectedChannel?.avatar ? (
                                <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-black shrink-0 flex items-center justify-center text-white text-[7px] font-bold">
                                  I
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                                  <span className="font-normal text-[#909090] ml-1">{tr("now")}</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-semibold bg-slate-50 p-1.5 rounded-lg border border-[#F0F0F0]">
                                  {commentReplies[1]}
                                </p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">{tr("reply")}</button>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Emojis row inside drawer */}
                        <div className="flex justify-between items-center px-4 py-1.5 border-t border-b border-[#F0F0F0] bg-white text-[13px] shrink-0">
                          <span className="cursor-pointer hover:scale-125 transition-transform">❤️</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">🙌</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">👍</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😢</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😮</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">👏</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😍</span>
                        </div>

                        {/* Bottom comment input inside drawer */}
                        <div className="p-2 border-t border-[#F0F0F0] bg-white flex items-center gap-2 shrink-0">
                          <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                            {selectedChannel?.avatar ? (
                              <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-black flex items-center justify-center text-white text-[6px] font-bold">I</div>
                            )}
                          </div>
                          <div className="flex-1 bg-[#F5F5F5] rounded-full px-3 py-1 flex items-center justify-between text-[9px] text-[#707070] font-medium border border-[#E8E8E8]">
                            <span>{selectedChannel ? `${selectedChannel.username.replace(/^@+/, "")} ${tr("comment_for")}` : `isroil.ai ${tr("comment_for")}`}</span>
                            <Smile size={12} className="text-[#707070]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Bottom DM/Chat input inside the phone screen if DM/Chat mode */}
            {((selectedChannel?.type !== "telegram" && previewTab === "xabar") || selectedChannel?.type === "telegram") && (
              <div className="p-2.5 border-t border-[#F0F0F0] bg-white flex items-center gap-2 shrink-0">
                <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                  {selectedChannel?.avatar ? (
                    <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={10} className="text-[#707070]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-[#F5F5F5] rounded-full px-3 py-1.5 flex items-center justify-between text-[9px] text-[#A0A0A0] border border-[#E8E8E8]">
                  <span>{tr("type_message_placeholder")}</span>
                  <Smile size={12} className="text-[#707070] cursor-pointer hover:text-black" />
                </div>
              </div>
            )}

            {/* Phone bottom indicator bar */}
            <div className="w-[100px] h-1 bg-black rounded-full mx-auto my-2 shrink-0" />
          </div>

          {/* Toggle buttons below phone (Only if NOT Telegram) */}
          {selectedChannel?.type !== "telegram" && (
            <div className="mt-4 flex bg-[#F0F0F2] border border-[#E4E4E6] rounded-xl p-0.5 w-[160px] shadow-sm shrink-0 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setPreviewTab("xabar")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${previewTab === "xabar" ? "bg-white text-black shadow-xs border border-[#E0E0E0]/30" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                {tr("demo_message_tab")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("izoh")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${previewTab === "izoh" ? "bg-white text-black shadow-xs border border-[#E0E0E0]/30" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                {tr("demo_comment_tab")}
              </button>
            </div>
          )}

          <div className="mt-2 text-center">
            <span className="text-[9px] text-[#A0A0A0] uppercase font-bold tracking-wider">
              {tr("live_preview")}
            </span>
          </div>

        </div>

      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 max-w-[400px] w-full shadow-2xl relative border border-[#E8E8E8] animate-in zoom-in-95 duration-150">
            {/* Close Cross */}
            <button
              onClick={() => setShowExitConfirm(false)}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors cursor-pointer border-0"
            >
              <X size={16} />
            </button>

            <h3 className="text-[18px] font-black text-black tracking-tight text-left">
              {tr("exit_title")}
            </h3>
            <p className="text-[12px] text-[#707070] leading-relaxed mt-2 text-left font-medium">
              {tr("exit_desc")}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-11 flex items-center justify-center bg-white hover:bg-neutral-50 text-black border border-[#D8D8D8] font-bold rounded-xl text-[13px] transition-all cursor-pointer"
              >
                Qolish
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/automations";
                }}
                className="flex-1 h-11 flex items-center justify-center bg-[#FF3B30] hover:bg-[#E0352B] text-white font-bold rounded-xl text-[13px] transition-all cursor-pointer border-0"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative border border-neutral-100 flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Top decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#C7F33C]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Confetti element or cute robot icon */}
            <div className="w-20 h-20 bg-[#C7F33C]/10 rounded-2xl flex items-center justify-center text-[40px] shadow-sm mb-4 relative z-10 animate-bounce">
              🤖
            </div>

            <h3 className="text-[22px] font-black text-black tracking-tight mt-2 relative z-10">
              {tr("congrats_title")}
            </h3>
            <p className="text-[13px] text-[#505050] leading-relaxed mt-3 font-medium relative z-10">
              {tr("congrats_desc")}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/automations";
              }}
              className="w-full mt-8 py-3.5 bg-black hover:bg-neutral-900 text-white font-extrabold rounded-2xl text-[13px] tracking-wide transition-all active:scale-95 shadow-lg shadow-black/10 cursor-pointer border-0"
            >
              {tr("awesome")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
