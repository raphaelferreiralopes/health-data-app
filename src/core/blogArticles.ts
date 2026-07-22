/**
 * Placeholder content for the Longevity Hub blog, framework-agnostic like the
 * rest of src/core -- swap for real editorial content (or a CMS) later.
 */

export type BlogContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] };

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  readMinutes: number;
  publishedAt: string; // ISO date
  content: BlogContentBlock[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'vo2max-langlebigkeit',
    title: 'Warum VO2max einer der stärksten Langlebigkeits-Marker ist',
    excerpt:
      'Deine aerobe Fitness hängt enger mit deinem langfristigen Sterberisiko zusammen als die meisten Laborwerte. So verbesserst du sie gezielt.',
    tag: 'Fitness',
    readMinutes: 6,
    publishedAt: '2026-06-02',
    content: [
      {
        type: 'p',
        text: 'Wenn es um Langlebigkeit geht, wird viel über Blutwerte, Nahrungsergänzung und Schlaf gesprochen. Ein Wert bleibt dabei oft unterschätzt, obwohl er in großen Bevölkerungsstudien einer der stärksten Prädiktoren für Gesamtsterblichkeit ist: die kardiorespiratorische Fitness, gemessen als VO2max.',
      },
      {
        type: 'h2',
        text: 'Was VO2max eigentlich misst',
      },
      {
        type: 'p',
        text: 'VO2max beschreibt, wie viel Sauerstoff dein Körper pro Minute maximal aufnehmen und verwerten kann. Sie hängt von deinem Herzzeitvolumen, der Kapillardichte in der Muskulatur und der Fähigkeit deiner Zellen ab, Sauerstoff energetisch zu nutzen. Vereinfacht gesagt: Sie ist ein direktes Maß dafür, wie leistungsfähig dein Herz-Kreislauf-System und dein Stoffwechsel im Zusammenspiel sind.',
      },
      {
        type: 'h2',
        text: 'Warum sie mit Langlebigkeit zusammenhängt',
      },
      {
        type: 'p',
        text: 'Menschen mit niedriger kardiorespiratorischer Fitness haben in Kohortenstudien ein deutlich höheres Risiko, in einem gegebenen Zeitraum zu versterben, als Menschen mit hoher Fitness -- unabhängig von Faktoren wie Rauchen, Blutdruck oder Cholesterin. Der Effekt ist dabei nicht linear: Der größte Sprung im Risiko liegt zwischen "sehr niedriger" und "niedriger" Fitness. Das heißt: Du musst kein Leistungssportler werden, um den größten Teil des Nutzens mitzunehmen.',
      },
      {
        type: 'h2',
        text: 'So verbesserst du deine VO2max gezielt',
      },
      {
        type: 'list',
        items: [
          'Zone-2-Training: 2--3× pro Woche 30--45 Minuten lockeres Ausdauertraining, bei dem du dich noch unterhalten kannst -- baut die aerobe Basis und die mitochondriale Dichte auf.',
          'Hochintensive Intervalle: 1× pro Woche kurze, intensive Belastungsspitzen (z. B. 4× 4 Minuten nahe Maximalpuls) -- einer der wirksamsten Hebel, um VO2max in wenigen Wochen messbar zu steigern.',
          'Grundlagenausdauer im Alltag: Gehen, Rad fahren, Treppen statt Aufzug -- addiert sich über die Woche und hält die Basis stabil.',
          'Krafttraining ergänzend: Mehr Muskelmasse verbessert die periphere Sauerstoffverwertung und unterstützt so indirekt die VO2max.',
        ],
      },
      {
        type: 'p',
        text: 'Falls du eine Smartwatch oder ein Fitnessarmband nutzt, bekommst du meist eine geschätzte VO2max angezeigt. Der Trend über Monate ist dabei aussagekräftiger als der Einzelwert an einem Tag.',
      },
    ],
  },
  {
    slug: 'blutzucker-variabilitaet',
    title: 'Blutzucker-Variabilität: Was ein einzelner Wert nicht zeigt',
    excerpt:
      'Ein normaler Nüchternblutzucker sagt wenig darüber, wie dein Stoffwechsel auf Mahlzeiten reagiert. Warum die Schwankungsbreite oft aussagekräftiger ist.',
    tag: 'Stoffwechsel',
    readMinutes: 5,
    publishedAt: '2026-06-16',
    content: [
      {
        type: 'p',
        text: 'Ein Nüchternblutzucker im Referenzbereich wird oft als Entwarnung gelesen: alles in Ordnung, der Stoffwechsel arbeitet normal. Tatsächlich ist der Nüchternwert aber nur eine Momentaufnahme -- er sagt wenig darüber, wie dein Körper über den Tag verteilt auf Mahlzeiten, Stress und Schlafmangel reagiert.',
      },
      {
        type: 'h2',
        text: 'Was Blutzucker-Variabilität bedeutet',
      },
      {
        type: 'p',
        text: 'Damit ist gemeint, wie stark dein Blutzucker nach einer Mahlzeit ansteigt und wie schnell er wieder in den Ausgangsbereich zurückkehrt. Zwei Menschen mit identischem Nüchternwert können hier sehr unterschiedlich reagieren: Bei der einen Person bleibt der Wert nach dem Essen relativ stabil, bei der anderen schießt er stark nach oben und fällt danach ebenso stark wieder ab -- oft begleitet von Heißhunger und Müdigkeit ein bis zwei Stunden später.',
      },
      {
        type: 'h2',
        text: 'Warum das relevant ist',
      },
      {
        type: 'p',
        text: 'Wiederholte starke Blutzuckerspitzen belasten über Jahre die Insulin-produzierenden Zellen der Bauchspeicheldrüse und werden mit einem erhöhten Risiko für Typ-2-Diabetes und Gefäßveränderungen in Verbindung gebracht -- auch bei Menschen, deren Nüchternwert (noch) unauffällig ist. Die Variabilität ist damit ein Frühindikator, der oft sichtbar wird, bevor sich das im klassischen Laborwert niederschlägt.',
      },
      {
        type: 'h2',
        text: 'Was du ohne Dauermessgerät tun kannst',
      },
      {
        type: 'list',
        items: [
          'Reihenfolge beim Essen: Gemüse und Eiweiß vor Kohlenhydraten essen -- glättet nachweislich die Blutzuckerkurve nach der Mahlzeit.',
          'Bewegung nach dem Essen: Ein 10--15-minütiger Spaziergang senkt die Blutzuckerspitze spürbar, weil die Muskulatur Glukose direkt aufnimmt.',
          'Kohlenhydrate nicht isoliert essen: Kombination mit Ballaststoffen, Fett oder Eiweiß verlangsamt die Aufnahme.',
          'Schlafmangel einplanen: Schon eine schlecht geschlafene Nacht verschlechtert messbar die Insulinsensitivität am Folgetag.',
        ],
      },
      {
        type: 'p',
        text: 'Wer es genauer wissen will, bekommt mit einem kontinuierlichen Glukosemonitor (CGM) über 1--2 Wochen ein reales Bild der eigenen Reaktionsmuster -- oft aufschlussreicher als ein einzelner Laborwert.',
      },
    ],
  },
  {
    slug: 'krafttraining-nach-40',
    title: 'Krafttraining nach 40: Der unterschätzte Hebel für ein langes Leben',
    excerpt:
      'Ab Mitte 30 verlieren wir jedes Jahrzehnt spürbar Muskelmasse -- wenn wir nichts dagegen tun. Warum Kraft eine der besten Investitionen in die zweite Lebenshälfte ist.',
    tag: 'Bewegung',
    readMinutes: 7,
    publishedAt: '2026-07-01',
    content: [
      {
        type: 'p',
        text: 'Ab etwa Mitte 30 beginnt ein Prozess, der lange kaum spürbar ist: Sarkopenie, der schleichende Verlust von Muskelmasse und -kraft. Ohne gezieltes Gegensteuern verlieren wir pro Jahrzehnt einen relevanten Anteil unserer Muskelmasse -- und der Verlust beschleunigt sich ab dem 60. Lebensjahr noch einmal deutlich.',
      },
      {
        type: 'h2',
        text: 'Warum Muskelmasse mehr ist als Optik',
      },
      {
        type: 'p',
        text: 'Muskulatur ist das größte Stoffwechselorgan des Körpers. Sie reguliert einen erheblichen Teil der Blutzuckeraufnahme, beeinflusst den Grundumsatz und ist der entscheidende Faktor dafür, wie lange jemand im Alter noch selbstständig Treppen steigen, aufstehen oder stürze abfangen kann. Griffkraft -- leicht mit einem Handgriff-Dynamometer messbar -- gehört inzwischen zu den am besten untersuchten Einzelindikatoren für Sterblichkeit im höheren Alter.',
      },
      {
        type: 'h2',
        text: 'Was das für die Trainingsplanung bedeutet',
      },
      {
        type: 'p',
        text: 'Die gute Nachricht: Muskelaufbau und Krafterhalt funktionieren in jedem Alter, auch jenseits der 60. Entscheidend ist regelmäßiger, progressiver Reiz -- also Training, das über die Zeit in Gewicht oder Wiederholungen leicht gesteigert wird, statt immer gleich zu bleiben.',
      },
      {
        type: 'list',
        items: [
          'Grundübungen priorisieren: Kniebeuge, Kreuzheben (oder Varianten), Drücken und Ziehen trainieren die meiste Muskulatur pro investierter Zeit.',
          '2--3 Einheiten pro Woche: Reicht für die meisten Menschen aus, um Kraft aufzubauen und zu erhalten -- Konsistenz schlägt Umfang.',
          'Ausreichend Eiweiß: Als Richtwert werden in der Forschung häufig 1,2--1,6 g pro Kilogramm Körpergewicht pro Tag diskutiert, verteilt über mehrere Mahlzeiten.',
          'Progression dokumentieren: Gewicht, Wiederholungen oder Sätze über Wochen leicht steigern, statt immer im gleichen Bereich zu trainieren.',
        ],
      },
      {
        type: 'p',
        text: 'Kraft ist damit keine Frage der Ästhetik, sondern eine der am besten belegten Investitionen in Selbstständigkeit und Lebensqualität im Alter -- und sie lässt sich in jedem Lebensjahrzehnt noch aufbauen.',
      },
    ],
  },
];

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((article) => article.slug === slug);
}
