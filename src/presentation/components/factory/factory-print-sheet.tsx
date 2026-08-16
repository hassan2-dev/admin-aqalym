import { BRAND } from '@/shared/constants/brand';

export type PrintMaterialLine = {
  nameAr: string;
  quantity: number;
  unit: string;
};

export type FactoryPrintData = {
  orderNumber: string;
  productName: string;
  categoryName?: string;
  customerName?: string;
  width?: number;
  height?: number;
  quantity?: number;
  variant?: string;
  glass?: string;
  color?: string;
  accessories?: string;
  notes?: string;
  materials: PrintMaterialLine[];
};

export function FactoryPrintSheet({ data }: { data: FactoryPrintData }) {
  const size =
    data.width && data.height ? `${data.width} × ${data.height} سم` : '—';
  const when = new Date().toLocaleString('ar-IQ');

  return (
    <div className="print-sheet p-8 text-[#1E275E]">
      <div className="mb-6 flex items-start justify-between border-b-2 border-[#1E275E] pb-4">
        <div>
          <p className="text-2xl font-bold">{BRAND.nameAr}</p>
          <p className="text-sm text-[#6E7078]">أمر تصنيع — نسخة الإدارة والعمال</p>
        </div>
        <div className="text-left">
          <p className="text-xl font-bold">{data.orderNumber}</p>
          <p className="text-xs text-[#6E7078]">{when}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">تفاصيل الطلب — ما الذي يُصنَّع</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          <Row label="المنتج / الخدمة" value={data.productName} />
          <Row label="التصنيف" value={data.categoryName || '—'} />
          <Row label="الكمية" value={`${data.quantity ?? 1} قطعة`} />
          <Row label="القياس" value={size} />
          <Row label="الخيار" value={data.variant || '—'} />
          <Row label="الزجاج" value={data.glass || '—'} />
          <Row label="اللون" value={data.color || '—'} />
          <Row label="الإكسسوارات" value={data.accessories || '—'} />
          <Row label="العميل" value={data.customerName || '—'} />
          {data.notes ? <Row label="ملاحظة" value={data.notes} /> : null}
        </tbody>
      </table>

      <h2 className="mb-3 text-lg font-semibold">المواد المستخدمة بالتصنيع</h2>
      <table className="mb-8 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#F4F5F8]">
            <th className="border border-[#E4E7EC] p-2 text-right">#</th>
            <th className="border border-[#E4E7EC] p-2 text-right">المادة</th>
            <th className="border border-[#E4E7EC] p-2 text-right">الكمية</th>
            <th className="border border-[#E4E7EC] p-2 text-right">الوحدة</th>
          </tr>
        </thead>
        <tbody>
          {data.materials.length ? (
            data.materials.map((m, i) => (
              <tr key={`${m.nameAr}-${i}`}>
                <td className="border border-[#E4E7EC] p-2">{i + 1}</td>
                <td className="border border-[#E4E7EC] p-2">{m.nameAr}</td>
                <td className="border border-[#E4E7EC] p-2">{m.quantity}</td>
                <td className="border border-[#E4E7EC] p-2">{m.unit}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border border-[#E4E7EC] p-2" colSpan={4}>
                لم تُحدد مواد بعد
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-16 grid grid-cols-3 gap-8">
        <div className="border-t border-[#1E275E] pt-2 text-center text-sm">المهندس</div>
        <div className="border-t border-[#1E275E] pt-2 text-center text-sm">العمال</div>
        <div className="border-t border-[#1E275E] pt-2 text-center text-sm">الإدارة</div>
      </div>
      <p className="mt-8 text-center text-xs text-[#6E7078]">
        ورقة واحدة للإدارة والعمال: تفاصيل الطلب + المواد والكميات المستخدمة. بدون أسعار.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-40 border border-[#E4E7EC] bg-[#F4F5F8] p-2 font-medium">{label}</td>
      <td className="border border-[#E4E7EC] p-2">{value}</td>
    </tr>
  );
}

export function printFactoryWorkOrder() {
  window.print();
}
