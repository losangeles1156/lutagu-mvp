import Link from 'next/link';

type SupportedLocale = 'zh-TW' | 'en' | 'ja';

function pickLocale(locale: string): SupportedLocale {
  if (locale === 'ja') return 'ja';
  if (locale === 'en') return 'en';
  return 'zh-TW';
}

const CONTENT: Record<SupportedLocale, {
  title: string;
  updatedAt: string;
  sections: Array<{ heading: string; items: string[] }>;
}> = {
  'zh-TW': {
    title: '服務條款',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: '服務性質',
        items: [
          '本服務（LUTAGU）提供東京交通與周邊資訊之導覽、建議與工具，供使用者參考。',
          '本服務非任何交通業者之官方網站或客服窗口。'
        ]
      },
      {
        heading: '資料來源與授權',
        items: [
          '本服務使用公共交通オープンデータセンター（ODPT）所提供之公共交通資料，並遵守 ODPT 使用條款與各資料提供者於 ODPT Catalog 公布之授權條款。',
          '地圖與部分地理資訊可能來源於 OpenStreetMap（OSM）與第三方底圖服務，並須依其授權要求標示歸屬。',
          '詳情請見「資料來源與授權」頁面。'
        ]
      },
      {
        heading: '使用者義務',
        items: [
          '不得以可能使 ODPT、資料提供者或第三方遭受不利益或名譽損害之方式使用本服務或其資料來源。',
          '不得嘗試繞過、破解或濫用本服務之存取控制、金鑰或速率限制。'
        ]
      },
      {
        heading: '免責聲明',
        items: [
          '本服務以「現狀」提供，不保證資訊即時性、完整性或適用性；交通狀況請以現場公告與官方資訊為準。',
          '使用者因依本服務資訊作出行程安排、購買、移動或其他決策所致之任何損失，應自行承擔。'
        ]
      },
      {
        heading: '聯絡方式',
        items: [
          '如需回報問題或提出下架/更正請求，請以電子郵件聯絡：support@lutagu.example',
          '請勿就本服務內容直接聯絡交通業者。'
        ]
      }
    ]
  },
  en: {
    title: 'Terms of Service',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: 'Service',
        items: [
          'LUTAGU provides travel guidance, suggestions, and tools for Tokyo transit and nearby points of interest.',
          'LUTAGU is not an official service or customer support channel of any public transportation operator.'
        ]
      },
      {
        heading: 'Data Sources & Licenses',
        items: [
          'We use public transportation data provided via ODPT and comply with ODPT terms and each data provider’s license published in the ODPT catalog.',
          'Maps and certain geospatial information may come from OpenStreetMap and third-party basemap providers, with required attribution.',
          'See the “Data Sources & Licenses” page for details.'
        ]
      },
      {
        heading: 'User Responsibilities',
        items: [
          'Do not use this service in a way that harms ODPT, data providers, or third parties.',
          'Do not attempt to bypass access controls, keys, or rate limits.'
        ]
      },
      {
        heading: 'Disclaimer',
        items: [
          'The service is provided “as is” without warranties. Always confirm with official sources and on-site announcements.',
          'You are responsible for decisions made based on the information provided.'
        ]
      },
      {
        heading: 'Contact',
        items: [
          'For issues, takedown, or corrections: support@lutagu.example',
          'Please do not contact transportation operators about this app.'
        ]
      }
    ]
  },
  ja: {
    title: '利用規約',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: 'サービス',
        items: [
          '本サービス（LUTAGU）は、東京の移動に関する案内・提案・ツールを提供します。',
          '本サービスは交通事業者の公式サービスまたは問い合わせ窓口ではありません。'
        ]
      },
      {
        heading: 'データ出典とライセンス',
        items: [
          '本サービスは ODPT を通じて提供される公共交通データを利用し、ODPT 利用規約および ODPT カタログに掲載される各データ提供者のライセンスに従います。',
          '地図および一部の地理情報は OpenStreetMap および第三者の地図タイル提供者に由来する場合があり、所定の帰属表示を行います。',
          '詳細は「データ出典・ライセンス」ページをご確認ください。'
        ]
      },
      {
        heading: '利用者の責任',
        items: [
          'ODPT、データ提供者、第三者に不利益または信用毀損を与える態様で利用しないでください。',
          'アクセス制御・キー・レート制限等を回避する行為は禁止します。'
        ]
      },
      {
        heading: '免責',
        items: [
          '本サービスは現状有姿で提供され、正確性・完全性・適時性等を保証しません。必ず現地案内および公式情報をご確認ください。',
          '本サービスの情報に基づく判断・行動は利用者の責任で行ってください。'
        ]
      },
      {
        heading: 'お問い合わせ',
        items: [
          '不具合報告、修正・削除依頼：support@lutagu.example',
          '本サービス内容について交通事業者へ直接お問い合わせしないでください。'
        ]
      }
    ]
  }
};

export default function TermsPage({ params }: { params: { locale: string } }) {
  const activeLocale = pickLocale(params.locale);
  const c = CONTENT[activeLocale];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-slate-900">{c.title}</h1>
          <Link href={`/${params.locale}/`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            Home
          </Link>
        </div>
        <div className="mt-2 text-xs font-bold text-slate-400">Last updated: {c.updatedAt}</div>

        <div className="mt-8 space-y-8">
          {c.sections.map((s) => (
            <section key={s.heading} className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{s.heading}</h2>
              <ul className="space-y-2 text-sm font-medium text-slate-700 leading-relaxed">
                {s.items.map((it, idx) => (
                  <li key={`${s.heading}-${idx}`}>- {it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-bold">
          <Link href={`/${params.locale}/privacy`} className="text-slate-600 hover:text-slate-900">
            Privacy
          </Link>
          <Link href={`/${params.locale}/data-licenses`} className="text-slate-600 hover:text-slate-900">
            Data & Licenses
          </Link>
          <a
            href="https://developer.odpt.org/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-900"
          >
            ODPT Terms
          </a>
        </div>
      </div>
    </main>
  );
}
