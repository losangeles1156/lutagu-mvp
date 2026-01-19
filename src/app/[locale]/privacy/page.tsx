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
    title: '隱私權政策',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: '我們蒐集的資料',
        items: [
          '裝置與使用資訊：例如語言偏好、介面設定、功能點擊事件（用於改善體驗與除錯）。',
          '位置資訊：僅在您同意啟用定位時，於裝置端取得近似位置以提供附近節點與導航功能。',
          '帳號資訊：若您選擇登入，我們可能處理您的 Email 與帳號識別資訊（由認證供應商提供）。'
        ]
      },
      {
        heading: '使用目的',
        items: [
          '提供核心功能（地圖、節點內容、路線/票價查詢、個人化偏好）。',
          '維護安全性、偵測濫用與改善服務品質。'
        ]
      },
      {
        heading: '第三方服務',
        items: [
          '本服務可能使用第三方基礎設施與 API 供應商（例如地圖底圖、資料庫/認證服務）。第三方可能依其條款處理必要的技術資料。',
          '當您點擊外部連結（例如交通業者網站、合作服務）時，將適用該第三方之隱私政策。'
        ]
      },
      {
        heading: '保存期間',
        items: [
          '我們僅在達成上述目的所必要的期間保存資料，或依法律要求保存。'
        ]
      },
      {
        heading: '您的權利',
        items: [
          '依適用法律（例如 GDPR/CCPA 等），您可能享有查詢、存取、更正、刪除與限制處理等權利。',
          '若要提出請求，請透過下方聯絡方式與我們聯繫。'
        ]
      },
      {
        heading: '聯絡方式',
        items: [
          '隱私相關問題與請求：privacy@lutagu.example'
        ]
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: 'Data We Collect',
        items: [
          'Device and usage data (e.g., language preference, UI settings, feature interactions) for product improvement and debugging.',
          'Location data only when you grant permission; used on-device to enable nearby discovery and navigation features.',
          'Account data if you sign in (e.g., email and identifiers provided by the authentication provider).'
        ]
      },
      {
        heading: 'Purposes',
        items: [
          'Provide core features (map, station content, routing/fare queries, preferences).',
          'Maintain security, detect abuse, and improve reliability.'
        ]
      },
      {
        heading: 'Third Parties',
        items: [
          'We may rely on third-party infrastructure and API providers (e.g., basemap tiles, database/auth services) that process technical data as needed to deliver the service.',
          'External links you click are governed by the third party’s privacy policy.'
        ]
      },
      {
        heading: 'Retention',
        items: [
          'We retain data only as long as needed for the purposes described above, or as required by law.'
        ]
      },
      {
        heading: 'Your Rights',
        items: [
          'Depending on applicable law (e.g., GDPR/CCPA), you may have rights to access, correct, delete, or restrict processing of your personal data.',
          'To exercise your rights, contact us using the information below.'
        ]
      },
      {
        heading: 'Contact',
        items: [
          'Privacy requests: privacy@lutagu.example'
        ]
      }
    ]
  },
  ja: {
    title: 'プライバシーポリシー',
    updatedAt: '2026-01-14',
    sections: [
      {
        heading: '取得する情報',
        items: [
          '端末・利用情報（言語設定、UI 設定、機能の操作ログ等）：体験改善と不具合対応のため。',
          '位置情報：利用者が許可した場合に限り、近隣検索・ナビ機能のため端末側で取得します。',
          'アカウント情報：ログイン時に、認証提供者から提供されるメールアドレス等を取り扱う場合があります。'
        ]
      },
      {
        heading: '利用目的',
        items: [
          '主要機能の提供（地図、駅情報、経路/運賃照会、設定の保存）。',
          'セキュリティ維持、不正利用の検知、品質改善。'
        ]
      },
      {
        heading: '第三者提供',
        items: [
          '本サービスは第三者の基盤・API（地図タイル、DB/認証等）を利用する場合があり、必要な範囲で技術情報が処理されることがあります。',
          '外部リンク先は当該第三者のプライバシーポリシーが適用されます。'
        ]
      },
      {
        heading: '保存期間',
        items: [
          '当該目的の達成に必要な期間、または法令で求められる期間に限り保存します。'
        ]
      },
      {
        heading: '利用者の権利',
        items: [
          '適用法令（GDPR/CCPA 等）により、開示・訂正・削除等の権利を有する場合があります。',
          '権利行使の申請は下記連絡先までお願いします。'
        ]
      },
      {
        heading: 'お問い合わせ',
        items: [
          'プライバシーに関する連絡先：privacy@lutagu.example'
        ]
      }
    ]
  }
};

export default function PrivacyPage({ params }: { params: { locale: string } }) {
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
          <Link href={`/${params.locale}/terms`} className="text-slate-600 hover:text-slate-900">
            Terms
          </Link>
          <Link href={`/${params.locale}/data-licenses`} className="text-slate-600 hover:text-slate-900">
            Data & Licenses
          </Link>
        </div>
      </div>
    </main>
  );
}
