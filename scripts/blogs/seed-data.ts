import { BlogLocale } from '../../src/modules/blogs/dto';

export type SeedCover = {
  key: string;
  background: string;
  accent: string;
  label: string;
};

export type SeedBlogPost = {
  locale: BlogLocale;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  tags: string[];
  coverKey: string;
  coverAlt: string;
  featured?: boolean;
};

export const seedCovers: SeedCover[] = [
  {
    key: 'calm-software',
    background: '#d9e7df',
    accent: '#284f45',
    label: 'CALM / 01',
  },
  {
    key: 'motion-meaning',
    background: '#dce5f2',
    accent: '#314d73',
    label: 'MOTION / 02',
  },
  {
    key: 'typography',
    background: '#eee4d5',
    accent: '#633d2d',
    label: 'TYPE / 03',
  },
  {
    key: 'shipping-fast',
    background: '#eadff0',
    accent: '#55345f',
    label: 'SHIP / 04',
  },
];

export const seedBlogPosts: SeedBlogPost[] = [
  {
    locale: BlogLocale.ES,
    slug: 'disenar-software-tranquilo',
    title: 'Diseñar software tranquilo',
    excerpt:
      'Por qué las mejores interfaces son las que apenas notas, y cómo la moderación se convierte en una ventaja.',
    contentMarkdown: `## La atención también es parte del producto

El software tranquilo respeta tu atención. No grita, no llena cada esquina de alertas y nunca te hace sentir que vas tarde. Hace su trabajo con claridad y deja que sigas avanzando.

El principio es simple, pero difícil de practicar: cada elemento en pantalla debe justificar la atención que pide. El movimiento debe orientar, no entretener. El color debe señalar, no decorar. El texto debe respetar el tiempo de quien lee.

## Diseñar con moderación

Cuando quitas el ruido, lo que queda es confianza. Y la confianza, más que una función aislada, es lo que hace que una persona vuelva a un producto todos los días.

Empieza auditando tu interfaz para detectar interrupciones. Luego pregunta por cada una: **¿esto se ganó su lugar?** Muchas veces la respuesta es no.`,
    category: 'Tecnología',
    tags: ['diseño', 'producto', 'experiencia de usuario'],
    coverKey: 'calm-software',
    coverAlt: 'Composición abstracta sobre software tranquilo',
    featured: true,
  },
  {
    locale: BlogLocale.ES,
    slug: 'movimiento-con-intencion',
    title: 'Movimiento con intención',
    excerpt:
      'Una guía práctica para usar animación como herramienta de claridad y no como decoración.',
    contentMarkdown: `## La animación es un lenguaje

Bien usada, explica de dónde vienen las cosas, hacia dónde van y cómo se relacionan las partes de una interfaz. Mal usada, solo es movimiento porque sí.

El mejor movimiento es funcional. Un modal que aparece desde el botón que lo abrió crea una historia espacial. Un elemento que sale de una lista confirma una eliminación. La persona no tiene que pensarlo: lo entiende.

## Menos, pero mejor

Mantén duraciones cortas, respeta las preferencias de movimiento reducido y usa el ritmo con intención. Cuando haya duda, anima menos.`,
    category: 'Tecnología',
    tags: ['animación', 'frontend', 'experiencia de usuario'],
    coverKey: 'motion-meaning',
    coverAlt: 'Formas en movimiento representando una interfaz',
  },
  {
    locale: BlogLocale.ES,
    slug: 'el-poder-silencioso-de-la-tipografia',
    title: 'El poder silencioso de la tipografía',
    excerpt:
      'Cómo un sistema tipográfico bien pensado puede sostener toda la personalidad de un producto.',
    contentMarkdown: `## La voz de un producto

Antes de leer una palabra, la tipografía ya marcó un tono: seguro o tímido, cálido o clínico, moderno o nostálgico.

Un buen sistema tipográfico trata sobre ritmo: una escala clara, altura de línea generosa para lectura y espaciado consistente. Si el ritmo está bien, todo se siente intencional.

Rara vez necesitas más de dos familias. Una para expresión, otra para claridad. La restricción es parte del punto.`,
    category: 'Tecnología',
    tags: ['tipografía', 'diseño', 'sistemas'],
    coverKey: 'typography',
    coverAlt: 'Composición editorial inspirada en tipografía',
  },
  {
    locale: BlogLocale.ES,
    slug: 'enviar-rapido-sin-romper',
    title: 'Enviar rápido sin romper cosas',
    excerpt:
      'Notas sobre construir una cultura donde velocidad y calidad se refuerzan entre sí.',
    contentMarkdown: `## Velocidad con confianza

La velocidad y la calidad suelen presentarse como una tensión. En equipos sanos son parte de lo mismo: enviar cambios pequeños y reversibles ayuda a mantener la calidad alta.

La clave es confianza: tipado fuerte, buenas pruebas, integración continua rápida y una cultura donde revertir no se castiga.

## Mantén pequeño el cambio

Cuando enviar es seguro, el equipo publica con mayor frecuencia y los ciclos de retroalimentación se acortan. Los lanzamientos gigantes son donde la calidad se deteriora. Prefiere el camino continuo y aburrido.`,
    category: 'Trabajo',
    tags: ['equipos', 'procesos', 'frontend'],
    coverKey: 'shipping-fast',
    coverAlt: 'Composición abstracta sobre entregas continuas',
  },
  {
    locale: BlogLocale.EN,
    slug: 'designing-calm-software',
    title: 'Designing calm software',
    excerpt:
      'Why the best interfaces are the ones you barely notice, and how restraint becomes a feature.',
    contentMarkdown: `## Attention is part of the product

Calm software respects your attention. It does not shout, badge every corner of the screen, or make you feel behind. It quietly does its job and lets you keep moving.

Every element on the screen should justify the attention it asks for. Motion should guide rather than entertain. Color should signal rather than decorate. Copy should respect the reader's time.

## Design with restraint

When you remove the noise, what remains is trust. Start by auditing your interface for interruptions. Then ask, for each one: **does this earn its place?** Most do not.`,
    category: 'Technology',
    tags: ['Design', 'Craft', 'UX'],
    coverKey: 'calm-software',
    coverAlt: 'Abstract composition about calm software',
    featured: true,
  },
  {
    locale: BlogLocale.EN,
    slug: 'motion-that-means-something',
    title: 'Motion that means something',
    excerpt:
      'A practical guide to using animation as a tool for clarity instead of decoration.',
    contentMarkdown: `## Animation is a language

Used well, it tells people where things came from, where they are going, and how parts of the interface relate. Used poorly, it is just movement for movement's sake.

The best motion is functional. A modal that scales from its trigger creates a spatial story. A list item that slides out confirms a deletion.

## Less, but better

Keep durations short, respect reduced-motion preferences, and ease with intent. When in doubt, animate less.`,
    category: 'Technology',
    tags: ['Motion', 'Front-end', 'UX'],
    coverKey: 'motion-meaning',
    coverAlt: 'Moving shapes representing an interface',
  },
  {
    locale: BlogLocale.EN,
    slug: 'the-quiet-power-of-typography',
    title: 'The quiet power of typography',
    excerpt:
      "How a considered type system can carry an entire product's personality.",
    contentMarkdown: `## The voice of a product

Before anyone reads a word, typography has already set a tone: confident or timid, warm or clinical, modern or nostalgic.

A good type system is mostly about rhythm: a clear scale, generous line height for body copy, and consistent spacing. Get the rhythm right and everything feels intentional.

You rarely need more than two families. One for expression, one for clarity. The restraint is the point.`,
    category: 'Technology',
    tags: ['Typography', 'Design', 'Systems'],
    coverKey: 'typography',
    coverAlt: 'Editorial composition inspired by typography',
  },
  {
    locale: BlogLocale.EN,
    slug: 'shipping-fast-without-breaking',
    title: 'Shipping fast without breaking things',
    excerpt:
      'Notes on building a culture where speed and quality reinforce each other.',
    contentMarkdown: `## Speed through confidence

Speed and quality are often framed as a trade-off. In healthy teams, they are the same thing: shipping small, reversible changes quickly is how you keep quality high.

The unlock is confidence: strong typing, good tests, fast continuous integration, and a culture where reverting is not punished.

## Keep the change small

When it is safe to ship, teams ship more often and feedback loops tighten. Big-bang releases are where quality deteriorates. Prefer the boring, continuous path.`,
    category: 'Work',
    tags: ['Teams', 'Process', 'Front-end'],
    coverKey: 'shipping-fast',
    coverAlt: 'Abstract composition about continuous delivery',
  },
];
