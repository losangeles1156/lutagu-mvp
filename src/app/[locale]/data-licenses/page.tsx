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
  intro: string[];
  sections: Array<{ heading: string; items: Array<string | { label: string; href: string }> }>;
}> = {
  'zh-TW': {
    title: '資料來源與授權',
    updatedAt: '2026-01-14',
    intro: [
      '本頁整理 LUTAGU 使用的主要資料來源與授權注意事項。',
      '不同資料集可能適用 CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0 等不同授權，請以各資料提供者公告為準。'
    ],
    sections: [
      {
        heading: 'ODPT（公共交通オープンデータセンター）',
        items: [
          '本服務透過 ODPT API 取得公共交通資料（例如車站、路線、時刻、運行資訊等）。',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT 條款要求資料使用者遵守各資料提供者在 ODPT Catalog 公布的授權條款；授權可能為 CC0、CC BY 4.0、ODC BY 1.0、ODbL 1.0 等。'
        ]
      },
      {
        heading: 'OpenStreetMap（OSM）',
        items: [
          '本服務的地圖顯示與部分 POI/設施資料可能使用 OSM 與其衍生資料。',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          '如對 OSM 資料做出改作並公開再散佈，通常需遵守 ODbL 1.0 的歸屬與分享相同方式（share-alike）要求。'
        ]
      },
      {
        heading: '授權快速指引（摘要）',
        items: [
          'CC0：通常不要求署名；仍建議保留來源說明以利溯源。',
          'CC BY 4.0：須保留署名、授權連結、變更說明。',
          'ODC BY 1.0：類似署名要求，需保留來源與授權資訊。',
          'ODbL 1.0：通常包含署名與 share-alike（公開衍生資料庫時需採相同授權）等義務。'
        ]
      }
    ]
  },
  en: {
    title: 'Data Sources & Licenses',
    updatedAt: '2026-01-14',
    intro: [
      'This page lists key data sources used by LUTAGU and license considerations.',
      'Different datasets may be licensed under CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0. Always follow the dataset-specific license published by the provider.'
    ],
    sections: [
      {
        heading: 'ODPT (Public Transportation Open Data Center)',
        items: [
          'We obtain public transportation data via ODPT APIs (e.g., stations, lines, timetables, service status).',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT requires data users to comply with each data provider’s license published in the ODPT catalog; licenses may include CC0, CC BY 4.0, ODC BY 1.0, and ODbL 1.0.'
        ]
      },
      {
        heading: 'OpenStreetMap (OSM)',
        items: [
          'Maps and certain POI/facility data may be derived from OpenStreetMap.',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          'If you publish a derived database, ODbL 1.0 attribution and share-alike obligations may apply.'
        ]
      },
      {
        heading: 'Quick License Notes (Summary)',
        items: [
          'CC0: typically no attribution required (attribution is still recommended for traceability).',
          'CC BY 4.0: attribution + license link + indicate changes.',
          'ODC BY 1.0: attribution and license notice.',
          'ODbL 1.0: attribution and share-alike may apply when distributing a derived database.'
        ]
      }
    ]
  },
  ja: {
    title: 'データ出典・ライセンス',
    updatedAt: '2026-01-14',
    intro: [
      '本ページでは LUTAGU が利用する主なデータ出典とライセンス上の留意点をまとめます。',
      'データセットごとに CC0 / CC BY 4.0 / ODC BY 1.0 / ODbL 1.0 等が適用され得るため、提供者が公開するライセンス表示に従ってください。'
    ],
    sections: [
      {
        heading: 'ODPT（公共交通オープンデータセンター）',
        items: [
          '本サービスは ODPT API を通じて公共交通データ（駅、路線、時刻表、運行情報等）を取得します。',
          { label: 'ODPT Terms', href: 'https://developer.odpt.org/terms' },
          'ODPT の規約により、ODPT カタログに掲載される各提供者のライセンス（CC0、CC BY 4.0、ODC BY 1.0、ODbL 1.0 等）に従って利用します。'
        ]
      },
      {
        heading: 'OpenStreetMap（OSM）',
        items: [
          '地図表示および一部の POI/施設情報は OpenStreetMap を利用する場合があります。',
          { label: 'OSM Copyright', href: 'https://www.openstreetmap.org/copyright' },
          '派生データベースを公開・配布する場合、ODbL 1.0 の帰属表示および share-alike が求められる可能性があります。'
        ]
      },
      {
        heading: 'ライセンス簡易メモ（概要）',
        items: [
          'CC0：通常は帰属不要（出典表記は推奨）。',
          'CC BY 4.0：帰属表示、ライセンスリンク、変更点の明示が必要。',
          'ODC BY 1.0：帰属表示とライセンス表示が必要。',
          'ODbL 1.0：帰属表示に加え、派生 DB 公開時に share-alike が必要となる場合があります。'
        ]
      }
    ]
  }
};

export default function DataLicensesPage({ params }: { params: { locale: string } }) {
  const activeLocale = pickLocale(params.locale);
  const c = CONTENT[activeLocale];
  const homeLabel = activeLocale === 'ja' ? 'ホーム' : activeLocale === 'en' ? 'Home' : '首頁';

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-slate-900">{c.title}</h1>
          <Link href={`/${params.locale}/`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            {homeLabel}
          </Link>
        </div>
        <div className="mt-2 text-xs font-bold text-slate-400">Last updated: {c.updatedAt}</div>

        <div className="mt-6 space-y-2 text-sm font-medium text-slate-700 leading-relaxed">
          {c.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-8 space-y-8">
          {c.sections.map((s) => (
            <section key={s.heading} className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{s.heading}</h2>
              <ul className="space-y-2 text-sm font-medium text-slate-700 leading-relaxed">
                {s.items.map((it, idx) => {
                  if (typeof it === 'string') return <li key={`${s.heading}-${idx}`}>- {it}</li>;
                  return (
                    <li key={`${s.heading}-${idx}`}>
                      -{' '}
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                      >
                        {it.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-bold">
          <Link href={`/${params.locale}/terms`} className="text-slate-600 hover:text-slate-900">
            Terms
          </Link>
          <Link href={`/${params.locale}/privacy`} className="text-slate-600 hover:text-slate-900">
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}

