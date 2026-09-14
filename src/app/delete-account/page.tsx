import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'طلب حذف الحساب | أقاليم',
  description: 'خطوات طلب حذف حساب تطبيق أقاليم والبيانات المرتبطة به',
};

const deletionEmail =
  'mailto:info@aqalym.iq?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%20%D8%A3%D9%82%D8%A7%D9%84%D9%8A%D9%85&body=%D8%B1%D9%82%D9%85%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81%20%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D9%84%3A%20%0A%D8%A3%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D9%88%D8%A7%D9%84%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D8%B1%D8%AA%D8%A8%D8%B7%D8%A9%20%D8%A8%D9%87.';

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#F4F5F8] px-4 py-10 text-[#1E275E] sm:px-6">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#E4E6EC] bg-white shadow-sm">
        <header className="border-b border-[#E8EAEE] px-6 py-8 text-center sm:px-10">
          <Image
            src="/logo-full.png"
            alt="أقاليم"
            width={180}
            height={70}
            priority
            className="mx-auto h-auto w-40"
          />
          <h1 className="mt-6 text-3xl font-bold">طلب حذف الحساب والبيانات</h1>
          <p className="mt-2 text-sm text-[#6E7078]">تطبيق أقاليم — AQALYM</p>
        </header>

        <div className="space-y-8 px-6 py-8 leading-8 sm:px-10">
          <section className="rounded-xl border border-[#D9DCE5] bg-[#F7F8FA] p-5">
            <h2 className="text-xl font-semibold">خطوات طلب حذف حسابك</h2>
            <ol className="mt-3 list-decimal space-y-2 pr-6 text-[#4F5260]">
              <li>
                اضغط زر <strong>إرسال طلب الحذف</strong> أدناه.
              </li>
              <li>
                اكتب رقم الهاتف المسجل في تطبيق أقاليم وأرسل الرسالة من بريد يمكنك الوصول
                إليه.
              </li>
              <li>
                قد نتواصل معك للتحقق من ملكية الحساب. لا ترسل رمز التحقق OTP أو كلمة مرورك.
              </li>
              <li>
                بعد التحقق، سنؤكد استلام الطلب ونكمل الحذف خلال 30 يومًا كحد أقصى.
              </li>
            </ol>

            <a
              href={deletionEmail}
              className="mt-5 block rounded-xl bg-[#1E275E] px-5 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
            >
              إرسال طلب الحذف
            </a>
            <p className="mt-3 text-center text-sm text-[#6E7078]">
              أو أرسل طلبك إلى{' '}
              <a className="font-semibold underline" href="mailto:info@aqalym.iq">
                info@aqalym.iq
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">البيانات التي تُحذف</h2>
            <p className="text-[#4F5260]">بعد التحقق من الطلب، نحذف:</p>
            <ul className="mt-2 list-disc space-y-1 pr-6 text-[#4F5260]">
              <li>حساب تسجيل الدخول ورقم الهاتف والاسم ومعلومات الملف الشخصي.</li>
              <li>العناوين المحفوظة وبيانات الموقع الجغرافي المرتبطة بالحساب.</li>
              <li>رموز الإشعارات ومسودات الطلبات غير المرسلة.</li>
              <li>المراسلات والبيانات الأخرى غير المطلوب الاحتفاظ بها نظاميًا.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">البيانات التي قد نحتفظ بها</h2>
            <ul className="list-disc space-y-2 pr-6 text-[#4F5260]">
              <li>
                سجلات الطلبات المكتملة والفواتير والمعاملات اللازمة للالتزامات المحاسبية
                والقانونية أو حل النزاعات لمدة تصل إلى 5 سنوات، ثم تُحذف أو تُحوّل إلى
                بيانات غير مرتبطة بهويتك.
              </li>
              <li>
                سجل طلب الحذف وإثبات تنفيذه لمدة تصل إلى 90 يومًا لأغراض الأمان والتدقيق.
              </li>
              <li>
                قد تبقى نسخ مشفرة ضمن النسخ الاحتياطية لمدة تصل إلى 90 يومًا قبل حذفها
                تلقائيًا، ولا تُستخدم خلالها لأي غرض آخر.
              </li>
            </ul>
            <p className="mt-3 text-[#4F5260]">
              إذا كان لديك طلب نشط، فقد نحتاج إلى إكماله أو إلغائه وتسوية الالتزامات
              المرتبطة به قبل إتمام حذف الحساب.
            </p>
          </section>

          <section className="border-t border-[#E8EAEE] pt-6 text-sm text-[#6E7078]">
            <p>
              للاستفسارات: <a href="mailto:info@aqalym.iq">info@aqalym.iq</a>
              <br />
              أقاليم، بغداد، العراق
              <br />
              آخر تحديث: 14 سبتمبر 2026
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
