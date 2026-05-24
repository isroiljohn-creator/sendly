import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] py-12 px-4 sm:px-6 lg:px-8 text-gray-800">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-4 mb-6">
          Privacy Policy / Политика конфиденциальности
        </h1>
        
        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Overview / Общие положения</h2>
            <p className="mb-2">
              <strong>Sendly</strong> values your privacy. This Privacy Policy describes how we collect, use, and share information when you use our Instagram Chatbot Automation platform.
            </p>
            <p>
              <strong>Sendly</strong> уважает вашу конфиденциальность. Настоящая Политика конфиденциальности описывает, как мы собираем, используем и передаем информацию при использовании нашей платформы автоматизации чат-ботов Instagram.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Data We Collect / Данные, которые мы собираем</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Information:</strong> When you connect your Instagram Account via Facebook Login, we retrieve your page tokens, account username, and page ID to run the automation.
                <br />
                <span className="text-gray-500 text-xs">
                  <strong>Информация об аккаунте:</strong> При подключении аккаунта Instagram через Facebook Login мы получаем токены страниц, имя пользователя и ID страницы для работы автоматизации.
                </span>
              </li>
              <li>
                <strong>Message Logs:</strong> We temporarily process and store direct messages, comments, and mentions received by your connected Instagram account in order to trigger the chatbot responses.
                <br />
                <span className="text-gray-500 text-xs">
                  <strong>Логи сообщений:</strong> Мы временно обрабатываем и храним личные сообщения, комментарии и упоминания, полученные вашим подключенным аккаунтом Instagram, для запуска ответов чат-ботов.
                </span>
              </li>
              <li>
                <strong>Lead Data:</strong> We store contact details of users interacting with your chatbot (e.g., username, full name, profile picture) to manage your contacts list.
                <br />
                <span className="text-gray-500 text-xs">
                  <strong>Данные лидов:</strong> Мы храним контактные данные пользователей, взаимодействующих с вашим чат-ботом (имя пользователя, полное имя, аватар) для управления вашим списком контактов.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. How We Use Data / Как мы используем данные</h2>
            <p className="mb-2">
              We use the collected data solely to execute the chatbot flow rules configured by you, track conversion statistics, and display chat logs in your Sendly dashboard. We do not sell or share your data with any third-party advertisers.
            </p>
            <p>
              Мы используем собранные данные исключительно для выполнения настроенных вами сценариев чат-бота, отслеживания статистики конверсий и отображения логов чата на панели управления Sendly. Мы не продаем и не передаем ваши данные третьим лицам.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Data Deletion / Удаление данных</h2>
            <p className="mb-2">
              You can disconnect your Instagram account and delete all associated data at any time from your Settings dashboard or by sending a request to our support email: <strong>6220v1@gmail.com</strong>.
            </p>
            <p>
              Вы можете отключить свой аккаунт Instagram и удалить все связанные данные в любое время через панель настроек или отправив запрос на нашу электронную почту поддержки: <strong>6220v1@gmail.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Contact Us / Контакты</h2>
            <p>
              If you have any questions regarding this privacy policy, please contact us at: <strong>6220v1@gmail.com</strong>.
              <br />
              <span className="text-gray-500 text-xs">
                Если у вас есть вопросы по поводу политики конфиденциальности, свяжитесь с нами по адресу: <strong>6220v1@gmail.com</strong>.
              </span>
            </p>
          </section>
        </div>
        
        <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Sendly. All rights reserved.
        </div>
      </div>
    </div>
  );
}
