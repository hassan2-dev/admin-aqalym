import Image from 'next/image';

const SUPPORT_EMAIL = 'alaqalimiraq@gmail.com';
const SUPPORT_PHONE = '+964 783 826 3025';
const SUPPORT_PHONE_TEL = '+9647838263025';

const contacts = [
  {
    label: 'البريد الإلكتروني / Email',
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    label: 'الهاتف / Phone',
    value: SUPPORT_PHONE,
    href: `tel:${SUPPORT_PHONE_TEL}`,
  },
  {
    label: 'واتساب / WhatsApp',
    value: SUPPORT_PHONE,
    href: `https://wa.me/${SUPPORT_PHONE_TEL.replace('+', '')}`,
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#F4F5F8] px-4 py-10 text-[#1E275E] sm:px-6">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#E4E6EC] bg-white shadow-sm">
        <header className="border-b border-[#E8EAEE] px-6 py-8 text-center sm:px-10">
          <Image
            src="/logo.png"
            alt="أقاليم Aqalym"
            width={180}
            height={180}
            priority
            className="mx-auto h-auto w-40"
          />
          <h1 className="mt-6 text-3xl font-bold">دعم أقاليم</h1>
          <p className="mt-2 text-sm text-[#6E7078]">Aqalym Support — تطبيق أقاليم</p>
        </header>

        <div className="space-y-8 px-6 py-8 leading-8 sm:px-10">
          <section>
            <h2 className="mb-2 text-xl font-semibold">نحن هنا لمساعدتكم</h2>
            <p className="text-[#4F5260]">
              فريق أقاليم جاهز لمساعدتكم في الطلبات، المنتجات، الحساب، والاستفسارات
              الفنية. نرد عادة خلال يوم عمل واحد.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">معلومات التواصل / Contact</h2>
            <div className="grid gap-3">
              {contacts.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-xl border border-[#E4E6EC] bg-[#F4F5F8] px-5 py-4 transition-opacity hover:opacity-90"
                >
                  <span className="block text-sm text-[#6E7078]">{item.label}</span>
                  <strong className="mt-1 block text-lg" dir="ltr">
                    {item.value}
                  </strong>
                </a>
              ))}
              <div className="rounded-xl border border-[#E4E6EC] bg-[#F4F5F8] px-5 py-4">
                <span className="block text-sm text-[#6E7078]">العنوان / Address</span>
                <strong className="mt-1 block text-lg">Baghdad, Iraq — بغداد، العراق</strong>
              </div>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 block rounded-xl bg-[#1E275E] px-5 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
            >
              إرسال رسالة / Email us
            </a>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">كيف نساعدكم؟</h2>
            <ul className="list-disc space-y-1 pr-6 text-[#4F5260]">
              <li>متابعة الطلبات والتصنيع والنقل والتركيب.</li>
              <li>الاستفسار عن الأبواب والنوافذ والواجهات والزجاج والشاتر.</li>
              <li>مشاكل تسجيل الدخول أو الحساب.</li>
              <li>طلب حذف الحساب والبيانات المرتبطة به.</li>
            </ul>
          </section>

          <hr className="border-[#E8EAEE]" />

          <section dir="ltr" className="text-left">
            <h2 className="mb-2 text-xl font-semibold">We are here to help</h2>
            <p className="text-[#4F5260]">
              The Aqalym team can help with orders, products, your account, and
              technical questions. We typically reply within one business day.
            </p>
            <h2 className="mt-6 mb-2 text-xl font-semibold">How we can help</h2>
            <ul className="list-disc space-y-1 pl-6 text-[#4F5260]">
              <li>Order status, manufacturing, delivery, and installation.</li>
              <li>Questions about doors, windows, façades, glass, and shutters.</li>
              <li>Sign-in or account issues.</li>
              <li>Requests to delete your account and related data.</li>
            </ul>
            <p className="mt-4 text-[#4F5260]">
              Email:{' '}
              <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <footer className="border-t border-[#E8EAEE] pt-6 text-center text-sm text-[#6E7078]">
            أقاليم — جودة اليوم ثقة المستقبل
            <br />
            Aqalym, Baghdad, Iraq
          </footer>
        </div>
      </article>
    </main>
  );
}
